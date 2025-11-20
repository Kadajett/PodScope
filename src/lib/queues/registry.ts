/**
 * Queue Provider Registry
 *
 * Manages queue providers and executes queries
 */

import { loadConfig } from "@/lib/config-storage";
import log from "@/lib/logger";
import {
  type QueueProvider,
  type QueueProviderConfig,
  QueueProviderType,
  type QueueQuery,
  type QueueQueryResult,
} from "./base";
import { BullMQProvider } from "./bullmq";

/**
 * Provider factory - creates provider instances by type
 */
function createProvider(type: QueueProviderType): QueueProvider {
  switch (type) {
    case QueueProviderType.BULLMQ:
      return new BullMQProvider();

    // Add more providers here as they're implemented
    // case QueueProviderType.RABBITMQ:
    //   return new RabbitMQProvider();
    // case QueueProviderType.SQS:
    //   return new SQSProvider();

    default:
      throw new Error(`Unsupported queue provider type: ${type}`);
  }
}

/**
 * Queue Provider Registry
 * Singleton that manages all queue provider instances
 */
class QueueProviderRegistry {
  private providers: Map<string, QueueProvider> = new Map();
  private initialized = false;

  /**
   * Initialize providers from dashboard config
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const config = loadConfig();

      // Check if queue providers are configured
      const queueProviders = config?.queueProviders;
      if (!queueProviders) {
        log.warn("No queue providers configured in dashboard config");
        return;
      }

      // Initialize each provider
      for (const [name, providerConfig] of Object.entries(queueProviders)) {
        const config = providerConfig as QueueProviderConfig;

        try {
          const provider = createProvider(config.type);
          await provider.connect(config.connection);
          this.providers.set(name, provider);
          log.info({ name, type: config.type }, "Initialized queue provider");
        } catch (error) {
          log.error({ name, error }, "Failed to initialize provider");
        }
      }

      this.initialized = true;
    } catch (error) {
      log.error({ error }, "Failed to initialize queue providers");
    }
  }

  /**
   * Get a provider by name
   */
  getProvider(name: string): QueueProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all providers
   */
  getAllProviders(): Map<string, QueueProvider> {
    return this.providers;
  }

  /**
   * Execute a queue query
   */
  async executeQuery(query: QueueQuery): Promise<QueueQueryResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const provider = this.providers.get(query.provider);
    if (!provider) {
      throw new Error(`Queue provider not found: ${query.provider}`);
    }

    // Check if provider is healthy
    const healthy = await provider.isHealthy();
    if (!healthy) {
      throw new Error(`Queue provider ${query.provider} is not healthy`);
    }

    // Execute query based on what's requested
    if (query.queue) {
      // Fetch jobs for specific queue
      const jobs = await provider.getJobs(query);
      return {
        provider: query.provider,
        providerType: provider.type,
        queue: query.queue,
        jobs,
        count: jobs.length,
      };
    } else {
      // List all queues for this provider
      const queues = await provider.listQueues();
      return {
        provider: query.provider,
        providerType: provider.type,
        queues,
        count: queues.length,
      };
    }
  }

  /**
   * Disconnect all providers
   */
  async disconnectAll(): Promise<void> {
    for (const [name, provider] of this.providers) {
      try {
        await provider.disconnect();
        log.info({ name }, "Disconnected provider");
      } catch (error) {
        log.error({ name, error }, "Failed to disconnect provider");
      }
    }
    this.providers.clear();
    this.initialized = false;
  }
}

// Export singleton instance
export const queueRegistry = new QueueProviderRegistry();

/**
 * Execute a queue query by reference (from config)
 */
export function executeQueueQueryByRef(queryRef: string): Promise<QueueQueryResult> {
  const config = loadConfig();
  const queueQueries = config?.queueQueries;

  if (!queueQueries) {
    throw new Error("No queue queries configured in dashboard config");
  }

  // Parse query reference (e.g., "queueQueries.jobFilters.failed_jobs_v1-0-0")
  const parts = queryRef.replace("queueQueries.", "").split(".");
  if (parts.length !== 2) {
    throw new Error(`Invalid queue query reference format: ${queryRef}`);
  }

  const [namespace, queryName] = parts;
  const query = queueQueries[namespace]?.[queryName];

  if (!query) {
    throw new Error(`Queue query not found: ${queryRef}`);
  }

  return queueRegistry.executeQuery(query);
}

/**
 * Execute an inline queue query
 */
export function executeInlineQueueQuery(query: QueueQuery): Promise<QueueQueryResult> {
  return queueRegistry.executeQuery(query);
}

/**
 * Get all available queue providers
 */
export async function getAvailableProviders(): Promise<
  Array<{
    name: string;
    type: QueueProviderType;
    displayName: string;
    healthy: boolean;
  }>
> {
  await queueRegistry.initialize();

  const config = loadConfig();
  const queueProviders = config?.queueProviders || {};

  const providers: Array<{
    name: string;
    type: QueueProviderType;
    displayName: string;
    healthy: boolean;
  }> = [];

  for (const [name, providerConfig] of Object.entries(queueProviders)) {
    const config = providerConfig as QueueProviderConfig;
    const provider = queueRegistry.getProvider(name);

    providers.push({
      name,
      type: config.type,
      displayName: config.displayName,
      healthy: provider ? await provider.isHealthy() : false,
    });
  }

  return providers;
}
