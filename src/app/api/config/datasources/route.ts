import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { getClusterInfo } from "@/lib/kubernetes";
import { getHealth } from "@/lib/prometheus";

interface DataSourcesResponse {
  kubernetes: {
    context?: string;
    server?: string;
    connected: boolean;
    error?: string;
  };
  prometheus: {
    url: string;
    healthy: boolean;
    version?: string;
    error?: string;
  };
  victoriaMetrics?: {
    url: string;
  };
  grafana?: {
    url: string;
    configured: boolean;
  };
}

export async function GET() {
  const timestamp = new Date().toISOString();
  const config = getConfig();

  const result: DataSourcesResponse = {
    kubernetes: {
      context: config.kubernetes.context,
      connected: false,
    },
    prometheus: {
      url: config.prometheus.url,
      healthy: false,
    },
  };

  // Check Kubernetes connection
  try {
    const clusterInfo = getClusterInfo();
    result.kubernetes.context = clusterInfo.context;
    result.kubernetes.server = clusterInfo.server;
    result.kubernetes.connected = true;
  } catch (error) {
    result.kubernetes.connected = false;
    result.kubernetes.error = error instanceof Error ? error.message : "Failed to connect";
  }

  // Check Prometheus health
  try {
    const health = await getHealth();
    result.prometheus.healthy = health.healthy;
    result.prometheus.version = health.version;
    if (!health.healthy) {
      result.prometheus.error = health.error;
    }
  } catch (error) {
    result.prometheus.healthy = false;
    result.prometheus.error = error instanceof Error ? error.message : "Failed to connect";
  }

  // Add optional data sources
  if (config.victoriaMetrics) {
    result.victoriaMetrics = {
      url: config.victoriaMetrics.url,
    };
  }

  if (config.grafana) {
    result.grafana = {
      url: config.grafana.url,
      configured: !!config.grafana.apiKey,
    };
  }

  const response = {
    success: true,
    data: result,
    timestamp,
  };

  return NextResponse.json(response);
}
