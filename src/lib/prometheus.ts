import type {
  ClusterMetrics,
  NodeMetrics,
  PrometheusHealthStatus,
  PrometheusQueryRangeRequest,
  PrometheusQueryRequest,
  PrometheusQueryResult,
  PrometheusResponse,
  PrometheusTargetsResponse,
} from "@/types/prometheus";
import { getPrometheusUrl } from "./config";

interface FetchOptions {
  timeout?: number;
}

async function fetchPrometheus<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const baseUrl = getPrometheusUrl();
  const url = `${baseUrl}${endpoint}`;
  const timeout = options.timeout || 10000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function queryInstant(
  request: PrometheusQueryRequest
): Promise<PrometheusResponse<PrometheusQueryResult>> {
  const params = new URLSearchParams({
    query: request.query,
  });

  if (request.time) {
    params.append("time", request.time);
  }

  return await fetchPrometheus(`/api/v1/query?${params.toString()}`);
}

export async function queryRange(
  request: PrometheusQueryRangeRequest
): Promise<PrometheusResponse<PrometheusQueryResult>> {
  const params = new URLSearchParams({
    query: request.query,
    start: request.start,
    end: request.end,
    step: request.step,
  });

  return await fetchPrometheus(`/api/v1/query_range?${params.toString()}`);
}

export async function getTargets(): Promise<PrometheusResponse<PrometheusTargetsResponse>> {
  return await fetchPrometheus("/api/v1/targets");
}

export async function getHealth(): Promise<PrometheusHealthStatus> {
  try {
    const baseUrl = getPrometheusUrl();

    // Check if Prometheus is reachable
    const healthResponse = await fetch(`${baseUrl}/-/healthy`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!healthResponse.ok) {
      return {
        healthy: false,
        error: `Health check returned ${healthResponse.status}`,
      };
    }

    // Get build info for version
    try {
      const buildInfo = await fetchPrometheus<{
        status: string;
        data: { version: string };
      }>("/api/v1/status/buildinfo");

      return {
        healthy: true,
        version: buildInfo.data?.version,
      };
    } catch {
      // Health is good but couldn't get version
      return {
        healthy: true,
      };
    }
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

// Common metric queries
export async function getNodeMetrics(): Promise<NodeMetrics> {
  // CPU usage percentage (1 - idle)
  const cpuQuery = await queryInstant({
    query: '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
  });

  // Memory usage
  const memTotalQuery = await queryInstant({
    query: "node_memory_MemTotal_bytes",
  });

  const memAvailQuery = await queryInstant({
    query: "node_memory_MemAvailable_bytes",
  });

  let cpuUsagePercent = 0;
  let memoryTotalBytes = 0;
  let memoryUsedBytes = 0;

  if (cpuQuery.status === "success" && cpuQuery.data?.result[0]) {
    cpuUsagePercent = parseFloat(cpuQuery.data.result[0].value?.[1] || "0");
  }

  if (memTotalQuery.status === "success" && memTotalQuery.data?.result[0]) {
    memoryTotalBytes = parseFloat(memTotalQuery.data.result[0].value?.[1] || "0");
  }

  if (memAvailQuery.status === "success" && memAvailQuery.data?.result[0]) {
    const memAvailable = parseFloat(memAvailQuery.data.result[0].value?.[1] || "0");
    memoryUsedBytes = memoryTotalBytes - memAvailable;
  }

  const memoryUsagePercent = memoryTotalBytes > 0 ? (memoryUsedBytes / memoryTotalBytes) * 100 : 0;

  return {
    cpuUsagePercent: Math.round(cpuUsagePercent * 100) / 100,
    memoryUsagePercent: Math.round(memoryUsagePercent * 100) / 100,
    memoryUsedBytes: Math.round(memoryUsedBytes),
    memoryTotalBytes: Math.round(memoryTotalBytes),
  };
}

export async function getClusterMetrics(): Promise<ClusterMetrics> {
  // These queries work with kube-state-metrics
  const queries = await Promise.all([
    queryInstant({ query: "count(kube_node_info)" }),
    queryInstant({
      query: 'count(kube_pod_status_phase{phase="Running"})',
    }),
    queryInstant({ query: "count(kube_pod_info)" }),
    queryInstant({ query: 'sum(kube_node_status_capacity{resource="cpu"})' }),
    queryInstant({
      query: 'sum(kube_node_status_capacity{resource="memory"})',
    }),
  ]);

  const [nodeCountResult, runningPodsResult, totalPodsResult, totalCpuResult, totalMemoryResult] =
    queries;

  const nodeCount =
    nodeCountResult.status === "success" && nodeCountResult.data?.result[0]
      ? parseInt(nodeCountResult.data.result[0].value?.[1] || "0", 10)
      : 0;

  const runningPods =
    runningPodsResult.status === "success" && runningPodsResult.data?.result[0]
      ? parseInt(runningPodsResult.data.result[0].value?.[1] || "0", 10)
      : 0;

  const totalPods =
    totalPodsResult.status === "success" && totalPodsResult.data?.result[0]
      ? parseInt(totalPodsResult.data.result[0].value?.[1] || "0", 10)
      : 0;

  const totalCpuCores =
    totalCpuResult.status === "success" && totalCpuResult.data?.result[0]
      ? parseFloat(totalCpuResult.data.result[0].value?.[1] || "0")
      : 0;

  const totalMemoryBytes =
    totalMemoryResult.status === "success" && totalMemoryResult.data?.result[0]
      ? parseFloat(totalMemoryResult.data.result[0].value?.[1] || "0")
      : 0;

  // Get current usage (these are approximations)
  const nodeMetrics = await getNodeMetrics();
  const usedCpuCores = (nodeMetrics.cpuUsagePercent / 100) * totalCpuCores;

  return {
    totalCpuCores,
    usedCpuCores: Math.round(usedCpuCores * 100) / 100,
    totalMemoryBytes,
    usedMemoryBytes: nodeMetrics.memoryUsedBytes,
    totalPods,
    runningPods,
    nodeCount,
  };
}

// Format bytes to human readable
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let value = bytes;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}
