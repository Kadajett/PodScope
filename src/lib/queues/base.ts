/**
 * Generic Queue Provider System
 *
 * Provides a unified interface for monitoring different queue systems:
 * - BullMQ, Bull, Bee-Queue (Redis-based)
 * - RabbitMQ, NATS (Message brokers)
 * - AWS SQS, GCP Pub/Sub, Azure Service Bus (Cloud services)
 * - Apache Kafka (Event streaming)
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * Normalized job status across all queue providers
 */
export enum QueueJobStatus {
  PENDING = "pending", // waiting, available, enqueued, idle
  PROCESSING = "processing", // active, in-flight, consumed, running
  COMPLETED = "completed", // succeeded, done, acked, finished
  FAILED = "failed", // failed, dead-letter, error
  DELAYED = "delayed", // scheduled, delayed, postponed
}

/**
 * Supported queue provider types
 */
export enum QueueProviderType {
  BULLMQ = "bullmq",
  BULL = "bull",
  RABBITMQ = "rabbitmq",
  SQS = "sqs",
  KAFKA = "kafka",
  GCP_PUBSUB = "gcp-pubsub",
  AZURE_SERVICE_BUS = "azure-service-bus",
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Provider connection configuration (varies by provider type)
 */
export type ProviderConnection =
  | BullMQConnection
  | RabbitMQConnection
  | SQSConnection
  | KafkaConnection
  | GCPPubSubConnection;

export interface BullMQConnection {
  instances: string; // References REDIS_INSTANCES env var or direct connection string
}

export interface RabbitMQConnection {
  host: string;
  port: number;
  username: string;
  password: string;
  vhost?: string;
}

export interface SQSConnection {
  region: string;
  credentials?: string; // AWS credentials profile or "default"
}

export interface KafkaConnection {
  brokers: string[];
  clientId?: string;
  ssl?: boolean;
}

export interface GCPPubSubConnection {
  projectId: string;
  credentials?: string; // Path to credentials file or "default"
}

/**
 * Queue provider definition
 */
export interface QueueProviderConfig {
  type: QueueProviderType;
  displayName: string;
  connection: ProviderConnection;
}

/**
 * Generic queue query (normalized across providers)
 */
export interface QueueQuery {
  provider: string; // Reference to queueProviders key
  queue?: string; // Queue/topic name
  status?: QueueJobStatus; // Normalized status filter
  limit?: number; // Max items to fetch (default: 20)

  // Provider-specific options (passthrough)
  providerOptions?: ProviderSpecificOptions;
}

/**
 * Provider-specific query options
 */
export interface ProviderSpecificOptions {
  // BullMQ/Bull specific
  instance?: string;

  // Kafka specific
  topic?: string;
  partition?: number;
  consumerGroup?: string;
  offset?: number;

  // RabbitMQ specific
  exchange?: string;
  routingKey?: string;

  // SQS specific
  visibilityTimeout?: number;
  waitTimeSeconds?: number;

  // Generic metadata
  [key: string]: unknown;
}

// ============================================================================
// NORMALIZED DATA TYPES
// ============================================================================

/**
 * Normalized queue information
 */
export interface QueueInfo {
  name: string;
  provider: string;
  providerType: QueueProviderType;

  stats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    delayed?: number;
  };

  metadata?: {
    paused?: boolean;
    consumers?: number;
    [key: string]: unknown;
  };
}

/**
 * Normalized job/message structure
 */
export interface Job {
  id: string;
  queue: string;
  provider: string;
  status: QueueJobStatus;
  data: unknown;

  // Timestamps
  createdAt?: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  scheduledFor?: Date; // For delayed jobs

  // Metadata
  attempts?: number;
  maxAttempts?: number;
  error?: string;
  stacktrace?: string;

  // Progress tracking
  progress?: number; // 0-100

  // Provider-specific data (passthrough)
  providerMetadata?: unknown;
}

/**
 * Query execution result
 */
export interface QueueQueryResult {
  provider: string;
  providerType: QueueProviderType;
  queue?: string;

  // Either queue info or jobs, depending on query
  queues?: QueueInfo[];
  jobs?: Job[];

  count: number;
}

// ============================================================================
// PROVIDER INTERFACE
// ============================================================================

/**
 * Provider capabilities (what features are supported)
 */
export interface ProviderCapabilities {
  supportsDelayedJobs: boolean;
  supportsJobRetry: boolean;
  supportsPriority: boolean;
  supportsDeadLetter: boolean;
  supportsJobProgress: boolean;
  supportsMultipleQueues: boolean;
}

/**
 * Queue provider interface
 * All queue providers must implement this interface
 */
export interface QueueProvider {
  type: QueueProviderType;
  capabilities: ProviderCapabilities;

  /**
   * Connect to the queue system
   */
  connect(config: ProviderConnection): void;

  /**
   * Disconnect from the queue system
   */
  disconnect(): void;

  /**
   * List all available queues
   */
  listQueues(): Promise<QueueInfo[]>;

  /**
   * Get statistics for a specific queue
   */
  getQueueStats(queueName: string): Promise<QueueInfo>;

  /**
   * Get jobs/messages from a queue
   */
  getJobs(query: QueueQuery): Promise<Job[]>;

  /**
   * Check if provider is connected and healthy
   */
  isHealthy(): Promise<boolean>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse provider-specific connection string
 */
export function parseConnectionString(_connectionString: string): any {
  // Will be implemented by specific providers
  throw new Error("Not implemented - use provider-specific parser");
}

/**
 * Normalize timestamp to Date object
 */
export function normalizeTimestamp(
  timestamp: string | number | Date | undefined
): Date | undefined {
  if (!timestamp) return undefined;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === "number") return new Date(timestamp);
  if (typeof timestamp === "string") return new Date(timestamp);
  return undefined;
}

/**
 * Format queue name for display
 */
export function formatQueueName(name: string, provider: string): string {
  return `${provider}:${name}`;
}
