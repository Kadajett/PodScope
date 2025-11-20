"use client";

import type { z } from "zod";
import { NamespacePodExplorer } from "@/components/dashboard/namespace-pod-explorer";
import type { KubePodListComponentConfigSchema } from "@/config/schema";

/**
 * Kubernetes Namespace Pod List Macro Component
 * Wraps the NamespacePodExplorer component with config-driven behavior
 *
 * This component displays pods grouped by namespace with real-time metrics and logs.
 * It can be configured to:
 * - Define custom queries inline
 * - Reference global queries from kubeQueries config
 * - Filter by namespace (legacy)
 * - Show/hide header, metrics, and logs
 * - Customize the title
 *
 * Config options (priority order):
 * - query: Inline query definition (highest priority)
 *   Example: { "resourceType": "pods", "namespace": "prod", "fieldSelector": "status.phase=Running" }
 * - queryRef: Reference to a kubeQuery (e.g., "kubeQueries.podFilters.failed_pods_v1-0-0")
 * - defaultNamespace: Namespace filter (legacy, lowest priority)
 * - title: Component title (default: "Pods")
 * - showHeader: Show/hide the header bar (default: true)
 * - showMetrics: Show/hide pod metrics (CPU, Memory) - default: true
 * - showLogs: Show/hide log viewer - default: true
 */

type KubeNamespacePodListProps = z.infer<typeof KubePodListComponentConfigSchema>;

export function KubeNamespacePodList(props: KubeNamespacePodListProps) {
  const {
    title = "Pods",
    query,
    queryRef,
    defaultNamespace,
    showHeader = true,
    showMetrics = true,
    showLogs = true,
  } = props;

  return (
    <NamespacePodExplorer
      title={title}
      query={query}
      queryRef={queryRef}
      namespace={defaultNamespace}
      showHeader={showHeader}
      showMetrics={showMetrics}
      showLogs={showLogs}
    />
  );
}
