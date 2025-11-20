import type { ComponentType } from "react";
import { BullMQMonitor } from "@/components/dashboard/bullmq-monitor";
import { KubeEventStream } from "@/components/macro/kube-event-stream";
import { KubeKubectlTerminal } from "@/components/macro/kube-kubectl-terminal";
import { KubeNamespacePodList } from "@/components/macro/kube-namespace-pod-list";
import { KubeNodeStatus } from "@/components/macro/kube-node-status";
import { PrometheusCustomQuery } from "@/components/macro/prometheus-custom-query";
import { PrometheusNodeMetrics } from "@/components/macro/prometheus-node-metrics";

/**
 * Component Registry
 * Maps component type names to their React components
 *
 * Add new components here to make them available in the dashboard builder
 */
export const COMPONENT_REGISTRY: Record<string, ComponentType<any>> = {
  // Macro components
  PrometheusNodeMetrics: PrometheusNodeMetrics,
  PrometheusCustomQuery: PrometheusCustomQuery,
  KubeNamespacePodList: KubeNamespacePodList,
  KubeEventStream: KubeEventStream,
  KubeNodeStatus: KubeNodeStatus,
  KubeKubectlTerminal: KubeKubectlTerminal,
  BullMQMonitor: BullMQMonitor,
};

/**
 * Component metadata for the component picker
 */
export interface ComponentMetadata {
  name: string;
  displayName: string;
  description: string;
  icon: string; // Lucide icon name
  category: "prometheus" | "kubernetes" | "bullmq" | "custom";
  defaultConfig?: Record<string, any>;
  defaultSize?: { w: number; h: number };
}

export const COMPONENT_METADATA: Record<string, ComponentMetadata> = {
  PrometheusNodeMetrics: {
    name: "PrometheusNodeMetrics",
    displayName: "Node Metrics",
    description: "Display Prometheus node and cluster metrics (CPU, Memory, Pods)",
    icon: "Activity",
    category: "prometheus",
    defaultSize: { w: 6, h: 4 },
    defaultConfig: {
      title: "Cluster Metrics",
      showHeader: true,
    },
  },
  PrometheusCustomQuery: {
    name: "PrometheusCustomQuery",
    displayName: "Custom PromQL Chart",
    description: "Visualize any PromQL query with customizable chart types",
    icon: "Activity",
    category: "prometheus",
    defaultSize: { w: 6, h: 4 },
    defaultConfig: {
      title: "Custom Query",
      query: "up",
      chartType: "line",
      timeRange: "1h",
      showHeader: true,
      variables: {},
    },
  },
  KubeNamespacePodList: {
    name: "KubeNamespacePodList",
    displayName: "Pod Explorer",
    description: "Browse pods by namespace with metrics and logs",
    icon: "Container",
    category: "kubernetes",
    defaultSize: { w: 6, h: 8 },
    defaultConfig: {
      title: "Pods",
      showHeader: true,
      showMetrics: true,
      showLogs: true,
    },
  },
  KubeEventStream: {
    name: "KubeEventStream",
    displayName: "Event Stream",
    description: "Real-time Kubernetes events with filtering and search",
    icon: "Activity",
    category: "kubernetes",
    defaultSize: { w: 6, h: 6 },
    defaultConfig: {
      title: "Events",
      namespace: "all",
      eventTypes: [],
      limit: 100,
      autoScroll: true,
      showFilters: true,
      showHeader: true,
    },
  },
  KubeNodeStatus: {
    name: "KubeNodeStatus",
    displayName: "Node Status Grid",
    description: "Table view of all nodes with health, conditions, and resources",
    icon: "Activity",
    category: "kubernetes",
    defaultSize: { w: 12, h: 4 },
    defaultConfig: {
      title: "Nodes",
      showHeader: true,
      showTaints: true,
      showLabels: false,
    },
  },
  KubeKubectlTerminal: {
    name: "KubeKubectlTerminal",
    displayName: "kubectl Terminal",
    description: "Interactive terminal for running kubectl commands with history",
    icon: "Activity",
    category: "kubernetes",
    defaultSize: { w: 6, h: 6 },
    defaultConfig: {
      title: "kubectl Terminal",
      showHeader: true,
      maxHistory: 50,
    },
  },
  BullMQMonitor: {
    name: "BullMQMonitor",
    displayName: "BullMQ Monitor",
    description: "Monitor BullMQ queues and jobs",
    icon: "ListOrdered",
    category: "bullmq",
    defaultSize: { w: 6, h: 4 },
    defaultConfig: {
      title: "BullMQ Queues",
      showHeader: true,
    },
  },
  // PrometheusCustomQuery will be added in Phase 3.3
};

/**
 * Get all available components grouped by category
 */
export function getComponentsByCategory(): Record<string, ComponentMetadata[]> {
  const categories: Record<string, ComponentMetadata[]> = {
    prometheus: [],
    kubernetes: [],
    bullmq: [],
    custom: [],
  };

  for (const [_name, metadata] of Object.entries(COMPONENT_METADATA)) {
    categories[metadata.category].push(metadata);
  }

  return categories;
}

/**
 * Get component metadata by name
 */
export function getComponentMetadata(name: string): ComponentMetadata | undefined {
  return COMPONENT_METADATA[name];
}
