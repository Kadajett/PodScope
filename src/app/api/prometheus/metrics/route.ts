import { type NextRequest, NextResponse } from "next/server";
import { formatBytes, getClusterMetrics, getHealth, getNodeMetrics } from "@/lib/prometheus";
import type {
  ClusterMetrics,
  NodeMetrics,
  PrometheusApiResponse,
  PrometheusHealthStatus,
} from "@/types/prometheus";

interface MetricsResponse {
  health: PrometheusHealthStatus;
  node?: NodeMetrics & { memoryUsedFormatted: string; memoryTotalFormatted: string };
  cluster?: ClusterMetrics & {
    memoryUsedFormatted: string;
    memoryTotalFormatted: string;
  };
}

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "all";

  try {
    // Always check health first
    const health = await getHealth();

    if (!health.healthy) {
      const response: PrometheusApiResponse<{ health: PrometheusHealthStatus }> = {
        success: false,
        data: { health },
        error: `Prometheus is not healthy: ${health.error}`,
        timestamp,
      };
      return NextResponse.json(response, { status: 503 });
    }

    const result: MetricsResponse = { health };

    if (type === "all" || type === "node") {
      const nodeMetrics = await getNodeMetrics();
      result.node = {
        ...nodeMetrics,
        memoryUsedFormatted: formatBytes(nodeMetrics.memoryUsedBytes),
        memoryTotalFormatted: formatBytes(nodeMetrics.memoryTotalBytes),
      };
    }

    if (type === "all" || type === "cluster") {
      const clusterMetrics = await getClusterMetrics();
      result.cluster = {
        ...clusterMetrics,
        memoryUsedFormatted: formatBytes(clusterMetrics.usedMemoryBytes),
        memoryTotalFormatted: formatBytes(clusterMetrics.totalMemoryBytes),
      };
    }

    const response: PrometheusApiResponse<MetricsResponse> = {
      success: true,
      data: result,
      timestamp,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: PrometheusApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get metrics",
      timestamp,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
