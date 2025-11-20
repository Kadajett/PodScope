/**
 * BullMQ Queue Provider Adapter
 *
 * Implements the generic QueueProvider interface for BullMQ
 */

import { getRedisInstances } from "@/lib/bullmq";
import log from "@/lib/logger";
import {
  type BullMQConnection,
  type Job,
  normalizeTimestamp,
  type ProviderCapabilities,
  type QueueInfo,
  QueueJobStatus,
  type QueueProvider,
  QueueProviderType,
  type QueueQuery,
} from "./base";

interface BullMQQueueResponse {
  name: string;
  waiting?: number;
  active?: number;
  completed?: number;
  failed?: number;
  delayed?: number;
  paused?: boolean;
}

interface BullMQJobResponse {
  id: string | number;
  name?: string;
  data?: unknown;
  opts?: {
    priority?: number;
  };
  timestamp?: number | string;
  processedOn?: number | string;
  finishedOn?: number | string;
  returnvalue?: unknown;
  failedReason?: string;
  stacktrace?: string[];
  attemptsMade?: number;
  delay?: number;
  status?: string;
  progress?: number;
  priority?: number;
}

/**
 * BullMQ Provider Implementation
 */
export class BullMQProvider implements QueueProvider {
  type = QueueProviderType.BULLMQ;

  capabilities: ProviderCapabilities = {
    supportsDelayedJobs: true,
    supportsJobRetry: true,
    supportsPriority: true,
    supportsDeadLetter: false, // BullMQ doesn't have built-in DLQ
    supportsJobProgress: true,
    supportsMultipleQueues: true,
  };

  private instances: Map<string, unknown> = new Map();
  private connected = false;

  /**
   * Connect to Redis instances
   */
  connect(_config: BullMQConnection): void {
    try {
      // Parse Redis instances from env var or connection string
      const redisInstances = getRedisInstances();

      if (redisInstances.length === 0) {
        throw new Error("No Redis instances configured in REDIS_INSTANCES");
      }

      // Store instances for later use
      redisInstances.forEach((instance) => {
        this.instances.set(instance.name, instance);
      });

      this.connected = true;
    } catch (error) {
      log.error({ error }, "Failed to connect to BullMQ");
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  disconnect(): void {
    this.instances.clear();
    this.connected = false;
  }

  /**
   * List all queues across all Redis instances
   */
  async listQueues(): Promise<QueueInfo[]> {
    if (!this.connected) {
      throw new Error("BullMQ provider not connected");
    }

    const allQueues: QueueInfo[] = [];

    // Iterate through all Redis instances
    for (const [instanceName, _instance] of this.instances) {
      try {
        // Get queues from this instance (via BullMQ API)
        const response = await fetch(`/api/bullmq/queues?instance=${instanceName}`);
        if (!response.ok) continue;

        const data = await response.json();

        // Convert to normalized QueueInfo format
        if (data.queues) {
          data.queues.forEach((queue: BullMQQueueResponse) => {
            allQueues.push({
              name: queue.name,
              provider: instanceName,
              providerType: QueueProviderType.BULLMQ,
              stats: {
                pending: queue.waiting || 0,
                processing: queue.active || 0,
                completed: queue.completed || 0,
                failed: queue.failed || 0,
                delayed: queue.delayed || 0,
              },
              metadata: {
                paused: queue.paused,
              },
            });
          });
        }
      } catch (error) {
        log.error({ instanceName, error }, "Failed to fetch queues for instance");
      }
    }

    return allQueues;
  }

  /**
   * Get stats for a specific queue
   */
  async getQueueStats(queueName: string, instanceName?: string): Promise<QueueInfo> {
    const instance = instanceName || this.instances.keys().next().value;

    if (!instance) {
      throw new Error("No BullMQ instances available");
    }

    const response = await fetch(`/api/bullmq/queues?instance=${instance}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch queue stats for ${queueName}`);
    }

    const data = await response.json();
    const queue = data.queues?.find((q: BullMQQueueResponse) => q.name === queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not found in instance ${instance}`);
    }

    return {
      name: queue.name,
      provider: instance,
      providerType: QueueProviderType.BULLMQ,
      stats: {
        pending: queue.waiting || 0,
        processing: queue.active || 0,
        completed: queue.completed || 0,
        failed: queue.failed || 0,
        delayed: queue.delayed || 0,
      },
      metadata: {
        paused: queue.paused,
      },
    };
  }

  /**
   * Get jobs from a queue
   */
  async getJobs(query: QueueQuery): Promise<Job[]> {
    if (!query.queue) {
      throw new Error("Queue name is required for BullMQ job query");
    }

    const instance = query.providerOptions?.instance || this.instances.keys().next().value;

    if (!instance) {
      throw new Error("No BullMQ instances available");
    }

    const status = this.mapStatusToBullMQ(query.status);
    const limit = query.limit || 20;

    // Fetch jobs from BullMQ API
    const response = await fetch(
      `/api/bullmq/jobs?queue=${query.queue}&status=${status}&instance=${instance}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch jobs for queue ${query.queue}`);
    }

    const data = await response.json();

    // Convert BullMQ jobs to normalized Job format
    return (data.jobs || []).map((job: BullMQJobResponse) =>
      this.normalizeJob(job, query.queue || "unknown", instance)
    );
  }

  /**
   * Check if provider is healthy
   */
  async isHealthy(): Promise<boolean> {
    if (!this.connected) return false;

    try {
      // Try to fetch overview as health check
      const response = await fetch("/api/bullmq/overview");
      return response.ok;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Map normalized status to BullMQ-specific status
   */
  private mapStatusToBullMQ(status?: QueueJobStatus): string {
    if (!status) return "waiting";

    const mapping: Record<QueueJobStatus, string> = {
      [QueueJobStatus.PENDING]: "waiting",
      [QueueJobStatus.PROCESSING]: "active",
      [QueueJobStatus.COMPLETED]: "completed",
      [QueueJobStatus.FAILED]: "failed",
      [QueueJobStatus.DELAYED]: "delayed",
    };

    return mapping[status] || "waiting";
  }

  /**
   * Map BullMQ status to normalized status
   */
  private normalizeStatus(bullmqStatus: string): QueueJobStatus {
    const mapping: Record<string, QueueJobStatus> = {
      waiting: QueueJobStatus.PENDING,
      active: QueueJobStatus.PROCESSING,
      completed: QueueJobStatus.COMPLETED,
      failed: QueueJobStatus.FAILED,
      delayed: QueueJobStatus.DELAYED,
    };

    return mapping[bullmqStatus] || QueueJobStatus.PENDING;
  }

  /**
   * Convert BullMQ job to normalized Job format
   */
  private normalizeJob(bullmqJob: BullMQJobResponse, queueName: string, instance: string): Job {
    return {
      id: (typeof bullmqJob.id === "string" ? bullmqJob.id : bullmqJob.id.toString()) || "",
      queue: queueName,
      provider: instance,
      status: this.normalizeStatus(bullmqJob.status || "waiting"),
      data: bullmqJob.data,

      // Timestamps
      createdAt: normalizeTimestamp(bullmqJob.timestamp),
      processedAt: normalizeTimestamp(bullmqJob.processedOn),
      completedAt: normalizeTimestamp(bullmqJob.finishedOn),
      failedAt: normalizeTimestamp(bullmqJob.failedReason ? bullmqJob.finishedOn : undefined),

      // Metadata
      attempts: bullmqJob.attemptsMade || 0,
      error: bullmqJob.failedReason,
      stacktrace: bullmqJob.stacktrace?.[0],
      progress: bullmqJob.progress,

      // Provider-specific metadata
      providerMetadata: {
        delay: bullmqJob.delay,
        priority: bullmqJob.opts?.priority,
        returnValue: bullmqJob.returnvalue,
        name: bullmqJob.name,
      },
    };
  }
}
