"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  BullMQApiResponse,
  BullMQOverview,
  QueueJobsResponse,
  QueueStats,
} from "@/types/bullmq";

export interface RedisConnectionConfig {
  instances?: Array<{
    name?: string;
    host: string;
    port?: number;
    password?: string;
  }>;
  envVar?: string;
  useEnv?: boolean;
}

async function fetchBullMQOverview(config?: RedisConnectionConfig) {
  // If config with instances, use POST
  if (config?.instances && config.instances.length > 0) {
    const res = await fetch("/api/bullmq/overview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instances: config.instances }),
    });
    const data: BullMQApiResponse<{ instances: BullMQOverview[] }> = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data?.instances;
  }

  // If envVar specified, pass as query param
  if (config?.envVar) {
    const res = await fetch(`/api/bullmq/overview?envVar=${encodeURIComponent(config.envVar)}`);
    const data: BullMQApiResponse<{ instances: BullMQOverview[] }> = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data?.instances;
  }

  // Default: use env var
  const res = await fetch("/api/bullmq/overview");
  const data: BullMQApiResponse<{ instances: BullMQOverview[] }> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data?.instances;
}

async function fetchQueueStats(instanceName?: string) {
  const url = instanceName ? `/api/bullmq/queues?instance=${instanceName}` : "/api/bullmq/queues";
  const res = await fetch(url);
  const data: BullMQApiResponse<{
    instance: string;
    queues: QueueStats[];
  }> = await res.json();
  if (!(data.success && data.data)) throw new Error(data.error || "No data returned");
  return data.data;
}

async function fetchQueueJobs(
  queueName: string,
  status: string,
  instanceName?: string,
  limit = 20
) {
  const params = new URLSearchParams({
    queue: queueName,
    status,
    limit: limit.toString(),
  });
  if (instanceName) params.append("instance", instanceName);

  const res = await fetch(`/api/bullmq/jobs?${params.toString()}`);
  const data: BullMQApiResponse<QueueJobsResponse> = await res.json();
  if (!(data.success && data.data)) throw new Error(data.error || "No data returned");
  return data.data;
}

export function useBullMQOverview(config?: RedisConnectionConfig) {
  return useQuery({
    queryKey: ["bullmq-overview", config],
    queryFn: () => fetchBullMQOverview(config),
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: 1,
  });
}

export function useQueueStats(instanceName?: string) {
  return useQuery({
    queryKey: ["bullmq-queues", instanceName],
    queryFn: () => fetchQueueStats(instanceName),
    refetchInterval: 10000,
    retry: 1,
  });
}

export function useQueueJobs(
  queueName: string,
  status: "waiting" | "active" | "completed" | "failed" | "delayed",
  instanceName?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["bullmq-jobs", instanceName, queueName, status],
    queryFn: () => fetchQueueJobs(queueName, status, instanceName),
    enabled,
    refetchInterval: 5000, // Refresh jobs more frequently
    retry: 1,
  });
}

// Helper to format job timestamp
export function formatJobTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

// Get queue health status
export function getQueueHealth(queue: QueueStats): "healthy" | "warning" | "critical" {
  // Critical if failure rate > 10% or too many failed jobs
  if (queue.failureRate > 10 || queue.counts.failed > 100) {
    return "critical";
  }
  // Warning if waiting queue is large or some failures
  if (queue.counts.waiting > 1000 || queue.failureRate > 1) {
    return "warning";
  }
  return "healthy";
}
