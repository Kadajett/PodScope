import { z } from "zod";

/**
 * Query Library Schema
 * Nested structure: queries.namespace.queryName_version
 * Example: queries.clusterMetrics.cpu_usage_v1-0-0
 */
export const QueryLibrarySchema = z.record(
  z.string(), // namespace (e.g., "clusterMetrics", "podMetrics")
  z.record(
    z.string(), // query name with version (e.g., "cpu_usage_v1-0-0")
    z.string() // PromQL query string (supports {{variable}} placeholders)
  )
);

export type QueryLibrary = z.infer<typeof QueryLibrarySchema>;

/**
 * Kubernetes Query Schema
 * Defines filters and selectors for Kubernetes resources
 */
export const KubeQuerySchema = z.object({
  resourceType: z.enum([
    "pods",
    "services",
    "nodes",
    "namespaces",
    "deployments",
    "configmaps",
    "secrets",
  ]),
  namespace: z.string().optional(), // Filter by namespace (omit for all namespaces)
  labelSelector: z.string().optional(), // e.g., "app=nginx,env=prod"
  fieldSelector: z.string().optional(), // e.g., "status.phase=Running"
  limit: z.number().optional(), // Limit results
  columns: z.array(z.string()).optional(), // Which fields to display
});

export type KubeQuery = z.infer<typeof KubeQuerySchema>;

/**
 * Kube Query Library Schema
 * Nested structure: kubeQueries.namespace.queryName_version
 * Example: kubeQueries.podFilters.failed_pods_v1-0-0
 */
export const KubeQueryLibrarySchema = z.record(
  z.string(), // namespace (e.g., "podFilters", "serviceFilters")
  z.record(
    z.string(), // query name with version
    KubeQuerySchema // Kubernetes query definition
  )
);

export type KubeQueryLibrary = z.infer<typeof KubeQueryLibrarySchema>;

/**
 * Queue Provider Connection Schemas
 */

/**
 * Redis Instance Schema - direct connection configuration
 */
export const RedisInstanceSchema = z.object({
  name: z.string().default("default"), // Display name for this instance
  host: z.string(), // Redis host
  port: z.number().default(6379), // Redis port
  password: z.string().optional(), // Redis password (optional)
  db: z.number().optional(), // Redis database number (optional)
});

export type RedisInstanceConfig = z.infer<typeof RedisInstanceSchema>;

/**
 * BullMQ Connection Schema
 * Supports three modes:
 * 1. Direct instances array: [{ name, host, port, password }]
 * 2. Env var reference: { envVar: "REDIS_INSTANCES" }
 * 3. Legacy string format: "name:host:port:password,..."
 */
export const BullMQConnectionSchema = z.object({
  instances: z
    .union([
      z.array(RedisInstanceSchema), // Direct config array
      z.string(), // Legacy format or env var name
    ])
    .optional(),
  envVar: z.string().optional(), // Reference to env var (e.g., "REDIS_INSTANCES")
  useEnv: z.boolean().optional(), // If true, use REDIS_INSTANCES from env
});

export const RabbitMQConnectionSchema = z.object({
  host: z.string(),
  port: z.number(),
  username: z.string(),
  password: z.string(),
  vhost: z.string().optional(),
});

export const SQSConnectionSchema = z.object({
  region: z.string(),
  credentials: z.string().optional(),
});

export const KafkaConnectionSchema = z.object({
  brokers: z.array(z.string()),
  clientId: z.string().optional(),
  ssl: z.boolean().optional(),
});

export const GCPPubSubConnectionSchema = z.object({
  projectId: z.string(),
  credentials: z.string().optional(),
});

/**
 * Queue Provider Config Schema
 */
export const QueueProviderConfigSchema = z.object({
  type: z.enum(["bullmq", "bull", "rabbitmq", "sqs", "kafka", "gcp-pubsub", "azure-service-bus"]),
  displayName: z.string(),
  connection: z.union([
    BullMQConnectionSchema,
    RabbitMQConnectionSchema,
    SQSConnectionSchema,
    KafkaConnectionSchema,
    GCPPubSubConnectionSchema,
  ]),
});

export type QueueProviderConfig = z.infer<typeof QueueProviderConfigSchema>;

/**
 * Queue Query Schema
 * Defines queries for queue systems (BullMQ, RabbitMQ, SQS, etc.)
 */
export const QueueQuerySchema = z.object({
  provider: z.string(), // Reference to queueProviders key
  queue: z.string().optional(), // Queue/topic name
  status: z.enum(["pending", "processing", "completed", "failed", "delayed"]).optional(),
  limit: z.number().optional(), // Max items to fetch
  providerOptions: z.record(z.string(), z.any()).optional(), // Provider-specific options
});

// Note: The actual QueueQuery type is defined in @/lib/queues/base.ts
// This schema is for runtime validation only

/**
 * Queue Query Library Schema
 * Nested structure: queueQueries.namespace.queryName_version
 * Example: queueQueries.jobFilters.failed_jobs_v1-0-0
 */
export const QueueQueryLibrarySchema = z.record(
  z.string(), // namespace (e.g., "jobFilters", "queueStats")
  z.record(
    z.string(), // query name with version
    QueueQuerySchema // Queue query definition
  )
);

export type QueueQueryLibrary = z.infer<typeof QueueQueryLibrarySchema>;

/**
 * Queue Providers Library Schema
 * Maps provider names to their configurations
 */
export const QueueProvidersLibrarySchema = z.record(
  z.string(), // provider name (e.g., "redis-bullmq", "aws-sqs")
  QueueProviderConfigSchema
);

export type QueueProvidersLibrary = z.infer<typeof QueueProvidersLibrarySchema>;

/**
 * Container Config Schema
 * Represents a single widget/component in the react-grid-layout
 */
export const ContainerConfigSchema = z.object({
  i: z.string(), // Unique container ID
  x: z.number().min(0), // Grid X position
  y: z.number().min(0), // Grid Y position
  w: z.number().min(1).max(12), // Width (1-12 grid units)
  h: z.number().min(1), // Height (grid units)
  component: z.string(), // Component type from registry
  config: z.record(z.string(), z.any()).optional(), // Component-specific configuration
  minW: z.number().optional(), // Minimum width
  minH: z.number().optional(), // Minimum height
  maxW: z.number().optional(), // Maximum width
  maxH: z.number().optional(), // Maximum height
  static: z.boolean().optional(), // Prevent dragging/resizing
});

export type ContainerConfig = z.infer<typeof ContainerConfigSchema>;

/**
 * Page Config Schema
 * Represents a single dashboard page (tab)
 */
export const PageConfigSchema = z.object({
  id: z.string(), // Unique page ID
  name: z.string(), // Display name for tab
  layout: z.array(ContainerConfigSchema), // Grid layout containers
  icon: z.string().optional(), // Optional lucide icon name
});

export type PageConfig = z.infer<typeof PageConfigSchema>;

/**
 * Dashboard Config Schema
 * Root configuration for the entire dashboard
 */
export const DashboardConfigSchema = z.object({
  version: z.string().default("1.0.0"), // Config schema version
  queries: QueryLibrarySchema, // Prometheus query library
  kubeQueries: KubeQueryLibrarySchema.optional(), // Kubernetes query library
  queueProviders: QueueProvidersLibrarySchema.optional(), // Queue provider configurations
  queueQueries: QueueQueryLibrarySchema.optional(), // Queue query library
  pages: z.array(PageConfigSchema).min(1), // Dashboard pages (tabs)
});

export type DashboardConfig = z.infer<typeof DashboardConfigSchema>;

/**
 * Component Props Schema
 * Base schema for component-specific configuration
 */
export const ComponentPropsSchema = z.object({
  queryRefs: z.array(z.string()).optional(), // Legacy: ordered query references (deprecated)
  queries: z.record(z.string(), z.string()).optional(), // New: named query references (preferred)
  title: z.string().optional(), // Custom title
  refreshInterval: z.number().optional(), // Refresh rate in seconds
  showHeader: z.boolean().optional(), // Show/hide header
});

export type ComponentProps = z.infer<typeof ComponentPropsSchema>;

/**
 * Prometheus Node Metrics Query Keys
 * Defines the expected query keys for PrometheusNodeMetrics component
 */
export const PrometheusNodeMetricsQueriesSchema = z
  .object({
    cpuUsage: z.string().optional(), // Node CPU usage percentage
    memoryTotal: z.string().optional(), // Node memory total bytes
    memoryAvailable: z.string().optional(), // Node memory available bytes
    nodeCount: z.string().optional(), // Cluster node count
    runningPods: z.string().optional(), // Running pods count
    totalPods: z.string().optional(), // Total pods count
    totalCpu: z.string().optional(), // Total CPU cores
    totalMemory: z.string().optional(), // Total memory bytes
  })
  .passthrough(); // Allow additional custom queries

export type PrometheusNodeMetricsQueries = z.infer<typeof PrometheusNodeMetricsQueriesSchema>;

/**
 * Prometheus Query Component Config
 */
export const PrometheusQueryComponentConfigSchema = ComponentPropsSchema.extend({
  queryRef: z.string().optional(), // Reference to a query in the library
  query: z.string().optional(), // Direct PromQL query string
  chartType: z.enum(["line", "area", "bar"]).optional(),
  timeRange: z.string().optional(), // e.g., "5m", "1h", "24h"
  variables: z.record(z.string(), z.string()).optional(), // Variable substitutions
})
  .refine((data) => data.queryRef || data.query, {
    message: "Either queryRef or query must be provided",
  })
  .omit({ title: true })
  .extend({
    title: z.string().optional(), // Custom title for the component
  });

export type PrometheusQueryComponentConfig = z.infer<typeof PrometheusQueryComponentConfigSchema>;

/**
 * Kube Pod List Component Config
 */
export const KubePodListComponentConfigSchema = ComponentPropsSchema.extend({
  query: KubeQuerySchema.optional(), // Inline query definition (takes priority over queryRef)
  queryRef: z.string().optional(), // Reference to kubeQueries (e.g., "kubeQueries.podFilters.all_pods_v1-0-0")
  defaultNamespace: z.string().optional(), // Filter to specific namespace (legacy)
  showMetrics: z.boolean().optional(), // Show/hide pod metrics
  showLogs: z.boolean().optional(), // Show/hide log viewer
})
  .omit({ title: true })
  .extend({
    title: z.string().optional(), // Custom title for the component
  });

export type KubePodListComponentConfig = z.infer<typeof KubePodListComponentConfigSchema>;

/**
 * Queue Monitor Component Config
 */
export const QueueMonitorComponentConfigSchema = ComponentPropsSchema.extend({
  query: QueueQuerySchema.optional(), // Inline query definition (takes priority over queryRef)
  queryRef: z.string().optional(), // Reference to queueQueries (e.g., "queueQueries.jobFilters.failed_jobs_v1-0-0")
  showJobs: z.boolean().optional(), // Show/hide individual jobs
  showStats: z.boolean().optional(), // Show/hide queue statistics
  groupBy: z.enum(["status", "queue", "none"]).optional(), // How to group displayed data
})
  .omit({ title: true })
  .extend({
    title: z.string().optional(), // Custom title for the component
  });

export type QueueMonitorComponentConfig = z.infer<typeof QueueMonitorComponentConfigSchema>;

/**
 * Event Stream Component Config
 */
export const EventStreamComponentConfigSchema = ComponentPropsSchema.extend({
  namespace: z.string().optional(), // Filter to specific namespace (default: "all")
  eventTypes: z.array(z.string()).optional(), // Filter to specific event types (e.g., ["Warning", "Error"])
  limit: z.number().optional(), // Max events to fetch (default: 100)
  autoScroll: z.boolean().optional(), // Auto-scroll to new events (default: true)
  showFilters: z.boolean().optional(), // Show/hide filter controls (default: true)
})
  .omit({ title: true })
  .extend({
    title: z.string().optional(), // Custom title for the component
  });

export type EventStreamComponentConfig = z.infer<typeof EventStreamComponentConfigSchema>;

/**
 * Node Status Grid Component Config
 */
export const NodeStatusGridComponentConfigSchema = ComponentPropsSchema.extend({
  showTaints: z.boolean().optional(), // Show/hide taints column (default: true)
  showLabels: z.boolean().optional(), // Show/hide labels column (default: false)
})
  .omit({ title: true })
  .extend({
    title: z.string().optional(), // Custom title for the component
  });

export type NodeStatusGridComponentConfig = z.infer<typeof NodeStatusGridComponentConfigSchema>;

/**
 * Kubectl Terminal Component Config
 */
export const KubectlTerminalComponentConfigSchema = ComponentPropsSchema.extend({
  defaultNamespace: z.string().optional(), // Default namespace for commands (default: none)
  maxHistory: z.number().optional(), // Max command history entries (default: 50)
})
  .omit({ title: true })
  .extend({
    title: z.string().optional(), // Custom title for the component
  });

export type KubectlTerminalComponentConfig = z.infer<typeof KubectlTerminalComponentConfigSchema>;

/**
 * Utility function to parse query references
 * Format: "namespace.queryName_version" or "promQueries.namespace.queryName_version"
 */
export function parseQueryRef(ref: string): { namespace: string; queryName: string } {
  // Validate input is a non-empty string
  if (!ref || typeof ref !== "string" || ref.trim() === "") {
    throw new Error(
      `Invalid query reference: received ${JSON.stringify(ref)}. Expected a non-empty string in format "namespace.queryName_version"`
    );
  }

  // Check for common invalid patterns
  if (ref === "{}" || ref === "[]" || ref === "null" || ref === "undefined") {
    throw new Error(
      `Invalid query reference: received ${ref}. This appears to be a serialized empty value. Expected format "namespace.queryName_version"`
    );
  }

  // Remove "promQueries." prefix if present
  const cleanRef = ref.startsWith("promQueries.") ? ref.slice(12) : ref;

  const parts = cleanRef.split(".");
  if (parts.length !== 2) {
    throw new Error(
      `Invalid query reference format: ${ref}. Expected "namespace.queryName_version" but got ${parts.length} parts after splitting by "."`
    );
  }

  return {
    namespace: parts[0],
    queryName: parts[1],
  };
}

/**
 * Utility function to create a query reference
 */
export function createQueryRef(namespace: string, queryName: string): string {
  return `promQueries.${namespace}.${queryName}`;
}

/**
 * Utility function to parse kube query references
 * Format: "namespace.queryName_version" or "kubeQueries.namespace.queryName_version"
 */
export function parseKubeQueryRef(ref: string): { namespace: string; queryName: string } {
  // Remove "kubeQueries." prefix if present
  const cleanRef = ref.startsWith("kubeQueries.") ? ref.slice(12) : ref;

  const parts = cleanRef.split(".");
  if (parts.length !== 2) {
    throw new Error(
      `Invalid kube query reference format: ${ref}. Expected "namespace.queryName_version"`
    );
  }

  return {
    namespace: parts[0],
    queryName: parts[1],
  };
}

/**
 * Utility function to create a kube query reference
 */
export function createKubeQueryRef(namespace: string, queryName: string): string {
  return `kubeQueries.${namespace}.${queryName}`;
}

/**
 * Utility function to parse queue query references
 * Format: "namespace.queryName_version" or "queueQueries.namespace.queryName_version"
 */
export function parseQueueQueryRef(ref: string): { namespace: string; queryName: string } {
  // Remove "queueQueries." prefix if present
  const cleanRef = ref.startsWith("queueQueries.") ? ref.slice(13) : ref;

  const parts = cleanRef.split(".");
  if (parts.length !== 2) {
    throw new Error(
      `Invalid queue query reference format: ${ref}. Expected "namespace.queryName_version"`
    );
  }

  return {
    namespace: parts[0],
    queryName: parts[1],
  };
}

/**
 * Utility function to create a queue query reference
 */
export function createQueueQueryRef(namespace: string, queryName: string): string {
  return `queueQueries.${namespace}.${queryName}`;
}
