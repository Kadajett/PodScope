"use client";

import type { z } from "zod";
import { NodeStatusGrid } from "@/components/dashboard/node-status-grid";
import type { NodeStatusGridComponentConfigSchema } from "@/config/schema";

/**
 * Kubernetes Node Status Macro Component
 * Wraps the NodeStatusGrid component with config-driven behavior
 *
 * This component displays all Kubernetes nodes with their health status,
 * resource capacity, conditions, taints, and labels in a table format.
 *
 * Config options:
 * - title: Component title (default: "Nodes")
 * - showHeader: Show/hide the header bar (default: true)
 * - showTaints: Show/hide the taints column (default: true)
 * - showLabels: Show/hide the labels column (default: false)
 *
 * Example configuration:
 * {
 *   "title": "Cluster Nodes",
 *   "showHeader": true,
 *   "showTaints": true,
 *   "showLabels": false
 * }
 */

type KubeNodeStatusProps = z.infer<typeof NodeStatusGridComponentConfigSchema>;

export function KubeNodeStatus(props: KubeNodeStatusProps) {
  const { title = "Nodes", showHeader = true, showTaints = true, showLabels = false } = props;

  return (
    <NodeStatusGrid
      title={title}
      showHeader={showHeader}
      showTaints={showTaints}
      showLabels={showLabels}
    />
  );
}
