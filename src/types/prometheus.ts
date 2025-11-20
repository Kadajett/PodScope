// Prometheus API Types

export interface PrometheusQueryRequest {
  query: string;
  time?: string; // RFC3339 or Unix timestamp
}

export interface PrometheusQueryRangeRequest {
  query: string;
  start: string;
  end: string;
  step: string; // Duration like "15s", "1m", "1h"
}

export interface PrometheusResponse<T = PrometheusQueryResult> {
  status: "success" | "error";
  data?: T;
  errorType?: string;
  error?: string;
  warnings?: string[];
}

export interface PrometheusQueryResult {
  resultType: "matrix" | "vector" | "scalar" | "string";
  result: PrometheusMetric[];
}

export interface PrometheusMetric {
  metric: Record<string, string>;
  value?: [number, string]; // [timestamp, value] for vector
  values?: [number, string][]; // [[timestamp, value], ...] for matrix
}

export interface PrometheusTarget {
  discoveredLabels: Record<string, string>;
  labels: Record<string, string>;
  scrapePool: string;
  scrapeUrl: string;
  globalUrl: string;
  lastError: string;
  lastScrape: string;
  lastScrapeDuration: number;
  health: "up" | "down" | "unknown";
  scrapeInterval: string;
  scrapeTimeout: string;
}

export interface PrometheusTargetsResponse {
  activeTargets: PrometheusTarget[];
  droppedTargets: {
    discoveredLabels: Record<string, string>;
  }[];
}

export interface PrometheusApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Common metric queries
export interface NodeMetrics {
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  memoryUsedBytes: number;
  memoryTotalBytes: number;
  diskUsagePercent?: number;
  networkBytesReceived?: number;
  networkBytesTransmitted?: number;
}

export interface PodMetrics {
  name: string;
  namespace: string;
  cpuUsage: number;
  memoryUsage: number;
}

export interface ClusterMetrics {
  totalCpuCores: number;
  usedCpuCores: number;
  totalMemoryBytes: number;
  usedMemoryBytes: number;
  totalPods: number;
  runningPods: number;
  nodeCount: number;
}

// Configuration types
export interface DataSourceConfig {
  prometheusUrl: string;
  victoriaMetricsUrl?: string;
  grafanaUrl?: string;
  grafanaApiKey?: string;
}

export interface PrometheusHealthStatus {
  healthy: boolean;
  version?: string;
  uptime?: number;
  error?: string;
}
