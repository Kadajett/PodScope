"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  KubectlExecResponse,
  KubernetesApiResponse,
  KubernetesEvent,
  KubernetesNamespace,
  KubernetesNode,
  KubernetesPod,
  KubernetesService,
} from "@/types/kubernetes";

// Fetch functions
async function fetchNamespaces() {
  const res = await fetch("/api/kubernetes/namespaces");
  const data: KubernetesApiResponse<{ namespaces: KubernetesNamespace[] }> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data?.namespaces;
}

async function fetchPods(namespace?: string) {
  const url = namespace ? `/api/kubernetes/pods?namespace=${namespace}` : "/api/kubernetes/pods";
  const res = await fetch(url);
  const data: KubernetesApiResponse<{
    pods: KubernetesPod[];
    count: number;
  }> = await res.json();
  if (!(data.success && data.data)) throw new Error(data.error || "No data returned");
  return data.data;
}

async function fetchNodes() {
  const res = await fetch("/api/kubernetes/nodes");
  const data: KubernetesApiResponse<{ nodes: KubernetesNode[] }> = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data?.nodes;
}

async function fetchServices(namespace?: string) {
  const url = namespace
    ? `/api/kubernetes/services?namespace=${namespace}`
    : "/api/kubernetes/services";
  const res = await fetch(url);
  const data: KubernetesApiResponse<{
    services: KubernetesService[];
    count: number;
  }> = await res.json();
  if (!(data.success && data.data)) throw new Error(data.error || "No data returned");
  return data.data;
}

async function execKubectl(request: { command: string; args?: string[]; namespace?: string }) {
  const res = await fetch("/api/kubernetes/exec", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const data: KubernetesApiResponse<KubectlExecResponse> = await res.json();
  if (!(data.success && data.data)) throw new Error(data.error || "No data returned");
  return data.data;
}

// Hooks
export function useNamespaces() {
  return useQuery({
    queryKey: ["namespaces"],
    queryFn: fetchNamespaces,
  });
}

export function usePods(namespace?: string) {
  return useQuery({
    queryKey: ["pods", namespace],
    queryFn: () => fetchPods(namespace),
  });
}

export function useNodes() {
  return useQuery({
    queryKey: ["nodes"],
    queryFn: fetchNodes,
  });
}

export function useServices(namespace?: string) {
  return useQuery({
    queryKey: ["services", namespace],
    queryFn: () => fetchServices(namespace),
  });
}

export function useKubectlExec() {
  return useMutation({
    mutationFn: execKubectl,
  });
}

// Pod logs hook
async function fetchPodLogs(podName: string, namespace: string, tailLines = 100) {
  const res = await fetch(
    `/api/kubernetes/logs?pod=${podName}&namespace=${namespace}&tail=${tailLines}`
  );
  const data: KubernetesApiResponse<{
    logs: string[];
    lineCount: number;
    pod: string;
    namespace: string;
  }> = await res.json();
  if (!(data.success && data.data)) throw new Error(data.error || "No data returned");
  return data.data;
}

export function usePodLogs(podName: string, namespace: string, enabled = true) {
  return useQuery({
    queryKey: ["pod-logs", namespace, podName],
    queryFn: () => fetchPodLogs(podName, namespace),
    enabled,
    refetchInterval: 5000, // Refresh logs every 5 seconds
    staleTime: 2000,
  });
}

// Kube Query hook (uses query refs from config OR inline queries)
async function fetchKubeQuery(queryRef: string) {
  const res = await fetch(`/api/kubernetes/query?ref=${encodeURIComponent(queryRef)}`);
  const data: KubernetesApiResponse<{
    resourceType: string;
    items: Array<KubernetesPod | KubernetesService | KubernetesNode | KubernetesNamespace>;
    count: number;
  }> = await res.json();
  if (!(data.success && data.data)) throw new Error(data.error || "No data returned");
  return data.data;
}

async function fetchInlineKubeQuery(query: unknown) {
  const res = await fetch("/api/kubernetes/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  const data: KubernetesApiResponse<{
    resourceType: string;
    items: Array<KubernetesPod | KubernetesService | KubernetesNode | KubernetesNamespace>;
    count: number;
  }> = await res.json();
  if (!(data.success && data.data)) throw new Error(data.error || "No data returned");
  return data.data;
}

export function useKubeQuery(queryRef?: string, inlineQuery?: unknown) {
  // Priority: inline query > queryRef
  const useInline = !!inlineQuery;
  const enabled = useInline || !!queryRef;

  return useQuery({
    queryKey: useInline
      ? ["kube-query-inline", JSON.stringify(inlineQuery)]
      : ["kube-query-ref", queryRef],
    queryFn: () => {
      if (useInline) {
        return fetchInlineKubeQuery(inlineQuery);
      }
      if (!queryRef) throw new Error("No query reference provided");
      return fetchKubeQuery(queryRef);
    },
    enabled,
  });
}

// Events hook
async function fetchEvents(namespace?: string, eventType?: string, limit?: number) {
  const params = new URLSearchParams();
  if (namespace) params.append("namespace", namespace);
  if (eventType) params.append("eventType", eventType);
  if (limit) params.append("limit", limit.toString());

  const url = `/api/kubernetes/events${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetch(url);
  const data: KubernetesApiResponse<{
    events: KubernetesEvent[];
    count: number;
  }> = await res.json();
  if (!(data.success && data.data)) throw new Error(data.error || "No data returned");
  return data.data;
}

export function useKubernetesEvents(
  namespace?: string,
  eventType?: string,
  limit?: number,
  enabled = true
) {
  return useQuery({
    queryKey: ["kubernetes-events", namespace, eventType, limit],
    queryFn: () => fetchEvents(namespace, eventType, limit),
    enabled,
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
    staleTime: 2000,
  });
}

// Aggregation helpers
export function groupPodsByNamespace(pods: KubernetesPod[]) {
  const grouped: Record<string, KubernetesPod[]> = {};
  pods.forEach((pod) => {
    if (!grouped[pod.namespace]) {
      grouped[pod.namespace] = [];
    }
    grouped[pod.namespace].push(pod);
  });
  return grouped;
}

export function getPodStatusCounts(pods: KubernetesPod[]) {
  const counts = {
    Running: 0,
    Pending: 0,
    Failed: 0,
    Succeeded: 0,
    Unknown: 0,
  };
  pods.forEach((pod) => {
    if (pod.status in counts) {
      counts[pod.status as keyof typeof counts]++;
    } else {
      counts.Unknown++;
    }
  });
  return counts;
}
