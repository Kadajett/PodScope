"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  ClusterMetrics,
  NodeMetrics,
  PrometheusApiResponse,
  PrometheusHealthStatus,
  PrometheusQueryResult,
  PrometheusTargetsResponse,
} from "@/types/prometheus";

// Fetch functions
async function fetchMetrics(type: "all" | "node" | "cluster" = "all") {
  const res = await fetch(`/api/prometheus/metrics?type=${type}`);
  const data: PrometheusApiResponse<{
    health: PrometheusHealthStatus;
    node?: NodeMetrics & {
      memoryUsedFormatted: string;
      memoryTotalFormatted: string;
    };
    cluster?: ClusterMetrics & {
      memoryUsedFormatted: string;
      memoryTotalFormatted: string;
    };
  }> = await res.json();
  if (!(data.success && data.data)) throw new Error(data.error || "No data returned");
  return data.data;
}

async function fetchTargets() {
  const res = await fetch("/api/prometheus/targets");
  const data: PrometheusApiResponse<
    PrometheusTargetsResponse & {
      summary: { total: number; up: number; down: number };
    }
  > = await res.json();
  if (!(data.success && data.data)) throw new Error(data.error || "No data returned");
  return data.data;
}

async function fetchPrometheusQuery(query: string) {
  const res = await fetch(`/api/prometheus/query?query=${encodeURIComponent(query)}`);
  const data: PrometheusApiResponse<PrometheusQueryResult> = await res.json();
  if (!(data.success && data.data)) throw new Error(data.error || "No data returned");
  return data.data;
}

async function fetchDataSources() {
  const res = await fetch("/api/config/datasources");
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// Hooks
export function useMetrics(type: "all" | "node" | "cluster" = "all") {
  return useQuery({
    queryKey: ["metrics", type],
    queryFn: () => fetchMetrics(type),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useTargets() {
  return useQuery({
    queryKey: ["targets"],
    queryFn: fetchTargets,
  });
}

export function usePrometheusQuery(query: string, enabled = true) {
  return useQuery({
    queryKey: ["prometheus-query", query],
    queryFn: () => fetchPrometheusQuery(query),
    enabled,
  });
}

// Pod-specific metrics
export function usePodMetrics(podName: string, namespace: string, enabled = true) {
  // Query for pod CPU and memory usage
  const cpuQuery = `sum(rate(container_cpu_usage_seconds_total{pod="${podName}",namespace="${namespace}",container!="POD",container!=""}[5m])) by (pod)`;
  const memoryQuery = `sum(container_memory_working_set_bytes{pod="${podName}",namespace="${namespace}",container!="POD",container!=""}) by (pod)`;

  const cpuResult = useQuery({
    queryKey: ["pod-cpu", namespace, podName],
    queryFn: () => fetchPrometheusQuery(cpuQuery),
    enabled,
    refetchInterval: 30000,
  });

  const memoryResult = useQuery({
    queryKey: ["pod-memory", namespace, podName],
    queryFn: () => fetchPrometheusQuery(memoryQuery),
    enabled,
    refetchInterval: 30000,
  });

  return {
    cpu: cpuResult,
    memory: memoryResult,
    isLoading: cpuResult.isLoading || memoryResult.isLoading,
  };
}

// Pod metrics time series for charts
async function fetchPodMetricsRange(
  podName: string,
  namespace: string,
  metric: "cpu" | "memory",
  duration = "1h"
) {
  const now = new Date();
  const start = new Date(now.getTime() - parseDuration(duration));

  const query =
    metric === "cpu"
      ? `sum(rate(container_cpu_usage_seconds_total{pod="${podName}",namespace="${namespace}",container!="POD",container!=""}[5m])) by (pod)`
      : `sum(container_memory_working_set_bytes{pod="${podName}",namespace="${namespace}",container!="POD",container!=""}) by (pod)`;

  const res = await fetch("/api/prometheus/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      start: start.toISOString(),
      end: now.toISOString(),
      step: "60s",
    }),
  });

  const data: PrometheusApiResponse<PrometheusQueryResult> = await res.json();
  if (!(data.success && data.data)) throw new Error(data.error || "No data returned");
  return data.data;
}

function parseDuration(duration: string): number {
  if (!duration || typeof duration !== "string") {
    return 3600000; // default 1h
  }

  const match = duration.match(/^(\d+)([hms])$/);
  if (!match) return 3600000; // default 1h

  const value = parseInt(match[1], 10);
  if (!Number.isFinite(value) || value <= 0) {
    return 3600000; // default 1h
  }

  const unit = match[2];
  switch (unit) {
    case "h":
      return value * 3600000;
    case "m":
      return value * 60000;
    case "s":
      return value * 1000;
    default:
      return 3600000;
  }
}

export function usePodMetricsRange(
  podName: string,
  namespace: string,
  metric: "cpu" | "memory",
  enabled = true
) {
  return useQuery({
    queryKey: ["pod-metrics-range", namespace, podName, metric],
    queryFn: () => fetchPodMetricsRange(podName, namespace, metric),
    enabled,
    staleTime: 60000,
  });
}

export function useDataSources() {
  return useQuery({
    queryKey: ["datasources"],
    queryFn: fetchDataSources,
    staleTime: 60000, // 1 minute
  });
}

// Helper to format bytes
export function formatBytes(bytes: number): string {
  // Handle edge cases
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let value = bytes;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

// Helper to format percentage
export function formatPercent(value: number): string {
  // Handle edge cases
  if (!Number.isFinite(value)) {
    return "0.0%";
  }

  return `${value.toFixed(1)}%`;
}
