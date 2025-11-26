"use client";

import { Activity, AlertTriangle, Cpu, HardDrive, MemoryStick, Server } from "lucide-react";
import { useMemo } from "react";
import { ClusterMetrics } from "@/components/dashboard/cluster-metrics";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { PrometheusNodeMetricsQueries } from "@/config/schema";
import { formatBytes, usePrometheusQuery } from "@/hooks/use-prometheus";
import { useResolvedQueryMap } from "@/hooks/use-query-library";

/**
 * Prometheus Node Metrics Macro Component
 *
 * Displays cluster and node metrics from Prometheus with customizable queries.
 *
 * ## Configuration
 *
 * ### New Format (Recommended) - Named queries object:
 * ```json
 * {
 *   "component": "PrometheusNodeMetrics",
 *   "config": {
 *     "queries": {
 *       "cpuUsage": "promQueries.nodeMetrics.cpu_usage_v1-0-0",
 *       "memoryTotal": "promQueries.nodeMetrics.memory_total_v1-0-0",
 *       "memoryAvailable": "promQueries.nodeMetrics.memory_available_v1-0-0",
 *       "nodeCount": "promQueries.clusterMetrics.node_count_v1-0-0",
 *       "runningPods": "promQueries.clusterMetrics.running_pods_v1-0-0",
 *       "totalPods": "promQueries.clusterMetrics.total_pods_v1-0-0",
 *       "totalCpu": "promQueries.clusterMetrics.total_cpu_cores_v1-0-0",
 *       "totalMemory": "promQueries.clusterMetrics.total_memory_bytes_v1-0-0"
 *     }
 *   }
 * }
 * ```
 *
 * ### Available Query Keys:
 * - `cpuUsage` - Node CPU usage percentage (0-100)
 * - `memoryTotal` - Node memory total in bytes
 * - `memoryAvailable` - Node memory available in bytes
 * - `nodeCount` - Number of nodes in cluster
 * - `runningPods` - Number of running pods
 * - `totalPods` - Total number of pods
 * - `totalCpu` - Total CPU cores in cluster
 * - `totalMemory` - Total memory bytes in cluster
 *
 * All query keys are optional - the component will gracefully handle missing queries.
 *
 * ### Legacy Format (Deprecated) - Ordered array:
 * ```json
 * {
 *   "queryRefs": [
 *     "promQueries.nodeMetrics.cpu_usage_v1-0-0",      // index 0 = cpuUsage
 *     "promQueries.nodeMetrics.memory_total_v1-0-0",  // index 1 = memoryTotal
 *     ...
 *   ]
 * }
 * ```
 * Note: The array format is position-dependent and error-prone. Use the named object format instead.
 */

interface PrometheusNodeMetricsProps {
  queryRefs?: string[]; // Legacy: ordered array (deprecated)
  queries?: PrometheusNodeMetricsQueries; // New: named object (preferred)
  title?: string;
  showHeader?: boolean;
}

/**
 * Normalizes legacy queryRefs array to named queries object
 */
function normalizeQueries(
  queryRefs?: string[],
  queries?: PrometheusNodeMetricsQueries
): PrometheusNodeMetricsQueries | undefined {
  // Prefer new format
  if (queries && Object.keys(queries).length > 0) {
    return queries;
  }

  // Fall back to legacy array format
  if (queryRefs && queryRefs.length > 0) {
    return {
      cpuUsage: queryRefs[0],
      memoryTotal: queryRefs[1],
      memoryAvailable: queryRefs[2],
      nodeCount: queryRefs[3],
      runningPods: queryRefs[4],
      totalPods: queryRefs[5],
      totalCpu: queryRefs[6],
      totalMemory: queryRefs[7],
    };
  }

  return undefined;
}

function MetricCard({
  title,
  icon: Icon,
  value,
  max,
  unit,
  percentage,
  formatted,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  max: number;
  unit: string;
  percentage: number;
  formatted?: string;
}) {
  const getStatusColor = (pct: number) => {
    if (pct >= 90) return "text-red-600";
    if (pct >= 70) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${getStatusColor(percentage)}`}>
          {percentage.toFixed(1)}%
        </div>
        <Progress value={percentage} className="mt-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {formatted || `${value.toFixed(2)} / ${max.toFixed(2)} ${unit}`}
        </p>
      </CardContent>
    </Card>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

export function PrometheusNodeMetrics(props: PrometheusNodeMetricsProps) {
  const { queryRefs, queries } = props;

  // Normalize to queries object (handles both legacy array and new object format)
  const normalizedQueries = useMemo(
    () => normalizeQueries(queryRefs, queries),
    [queryRefs, queries]
  );

  // Resolve all named queries to actual PromQL strings
  const resolvedQueries = useResolvedQueryMap(normalizedQueries);

  // Execute all queries in parallel - must be called unconditionally
  const cpuQuery = usePrometheusQuery(resolvedQueries.cpuUsage || "", !!resolvedQueries.cpuUsage);
  const memTotalQuery = usePrometheusQuery(
    resolvedQueries.memoryTotal || "",
    !!resolvedQueries.memoryTotal
  );
  const memAvailQuery = usePrometheusQuery(
    resolvedQueries.memoryAvailable || "",
    !!resolvedQueries.memoryAvailable
  );
  const nodeCountQuery = usePrometheusQuery(
    resolvedQueries.nodeCount || "",
    !!resolvedQueries.nodeCount
  );
  const runningPodsQuery = usePrometheusQuery(
    resolvedQueries.runningPods || "",
    !!resolvedQueries.runningPods
  );
  const totalPodsQuery = usePrometheusQuery(
    resolvedQueries.totalPods || "",
    !!resolvedQueries.totalPods
  );
  const totalCpuQuery = usePrometheusQuery(
    resolvedQueries.totalCpu || "",
    !!resolvedQueries.totalCpu
  );
  const totalMemQuery = usePrometheusQuery(
    resolvedQueries.totalMemory || "",
    !!resolvedQueries.totalMemory
  );

  const isLoading =
    cpuQuery.isLoading ||
    memTotalQuery.isLoading ||
    memAvailQuery.isLoading ||
    nodeCountQuery.isLoading ||
    runningPodsQuery.isLoading ||
    totalPodsQuery.isLoading ||
    totalCpuQuery.isLoading ||
    totalMemQuery.isLoading;

  const hasError =
    cpuQuery.error ||
    memTotalQuery.error ||
    memAvailQuery.error ||
    nodeCountQuery.error ||
    runningPodsQuery.error ||
    totalPodsQuery.error ||
    totalCpuQuery.error ||
    totalMemQuery.error;

  // Parse metric values
  const metrics = useMemo(() => {
    if (isLoading || hasError) return null;

    const getCpuUsage = () => {
      const result = cpuQuery.data?.result?.[0];
      return result ? parseFloat(result.value?.[1] || "0") : 0;
    };

    const getMemTotal = () => {
      const result = memTotalQuery.data?.result?.[0];
      return result ? parseFloat(result.value?.[1] || "0") : 0;
    };

    const getMemAvail = () => {
      const result = memAvailQuery.data?.result?.[0];
      return result ? parseFloat(result.value?.[1] || "0") : 0;
    };

    const getNodeCount = () => {
      const result = nodeCountQuery.data?.result?.[0];
      return result ? parseInt(result.value?.[1] || "0", 10) : 0;
    };

    const getRunningPods = () => {
      const result = runningPodsQuery.data?.result?.[0];
      return result ? parseInt(result.value?.[1] || "0", 10) : 0;
    };

    const getTotalPods = () => {
      const result = totalPodsQuery.data?.result?.[0];
      return result ? parseInt(result.value?.[1] || "0", 10) : 0;
    };

    const getTotalCpu = () => {
      const result = totalCpuQuery.data?.result?.[0];
      return result ? parseFloat(result.value?.[1] || "0") : 0;
    };

    const getTotalMem = () => {
      const result = totalMemQuery.data?.result?.[0];
      return result ? parseFloat(result.value?.[1] || "0") : 0;
    };

    const cpuUsagePercent = getCpuUsage();
    const memoryTotalBytes = getMemTotal();
    const memoryAvailableBytes = getMemAvail();
    const memoryUsedBytes = memoryTotalBytes - memoryAvailableBytes;
    const memoryUsagePercent =
      memoryTotalBytes > 0 ? (memoryUsedBytes / memoryTotalBytes) * 100 : 0;

    const totalCpuCores = getTotalCpu();
    const usedCpuCores = (cpuUsagePercent / 100) * totalCpuCores;

    return {
      node: {
        cpuUsagePercent,
        memoryUsagePercent,
        memoryUsedBytes,
        memoryTotalBytes,
        memoryUsedFormatted: formatBytes(memoryUsedBytes),
        memoryTotalFormatted: formatBytes(memoryTotalBytes),
      },
      cluster: {
        nodeCount: getNodeCount(),
        runningPods: getRunningPods(),
        totalPods: getTotalPods(),
        totalCpuCores,
        usedCpuCores,
        totalMemoryBytes: getTotalMem(),
        usedMemoryBytes: memoryUsedBytes,
        memoryUsedFormatted: formatBytes(memoryUsedBytes),
        memoryTotalFormatted: formatBytes(getTotalMem()),
      },
    };
  }, [
    cpuQuery.data,
    memTotalQuery.data,
    memAvailQuery.data,
    nodeCountQuery.data,
    runningPodsQuery.data,
    totalPodsQuery.data,
    totalCpuQuery.data,
    totalMemQuery.data,
    isLoading,
    hasError,
  ]);

  // If no custom queries provided, use the default ClusterMetrics component
  if (!normalizedQueries || Object.keys(normalizedQueries).length === 0) {
    return <ClusterMetrics />;
  }

  if (isLoading) {
    return (
      <div className="px-6 py-4">
        <h2 className="text-lg font-semibold mb-4">Cluster Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-[140px]" />
          <Skeleton className="h-[140px]" />
          <Skeleton className="h-[140px]" />
          <Skeleton className="h-[140px]" />
        </div>
      </div>
    );
  }

  if (hasError || !metrics) {
    return (
      <div className="px-6 py-4">
        <h2 className="text-lg font-semibold mb-4">Cluster Metrics</h2>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-red-600 font-medium">Failed to load custom metrics</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Check that your query references are correct and Prometheus is reachable
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Cluster Metrics</h2>
        <Badge variant="outline" className="border-green-600 text-green-600">
          <Activity className="mr-1 h-3 w-3" />
          Custom Queries
        </Badge>
      </div>

      {/* Node Metrics */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Node Resources</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard
            title="CPU Usage"
            icon={Cpu}
            value={metrics.node.cpuUsagePercent}
            max={100}
            unit="%"
            percentage={metrics.node.cpuUsagePercent}
          />
          <MetricCard
            title="Memory Usage"
            icon={MemoryStick}
            value={metrics.node.memoryUsedBytes}
            max={metrics.node.memoryTotalBytes}
            unit="bytes"
            percentage={metrics.node.memoryUsagePercent}
            formatted={`${metrics.node.memoryUsedFormatted} / ${metrics.node.memoryTotalFormatted}`}
          />
        </div>
      </div>

      {/* Cluster Metrics */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Cluster Overview</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Nodes" value={metrics.cluster.nodeCount} icon={Server} />
          <StatCard
            title="Total Pods"
            value={metrics.cluster.totalPods}
            icon={HardDrive}
            description={`${metrics.cluster.runningPods} running`}
          />
          <StatCard
            title="CPU Cores"
            value={`${metrics.cluster.usedCpuCores.toFixed(1)} / ${metrics.cluster.totalCpuCores}`}
            icon={Cpu}
            description="Used / Total"
          />
          <StatCard
            title="Cluster Memory"
            value={metrics.cluster.memoryUsedFormatted}
            icon={MemoryStick}
            description={`of ${metrics.cluster.memoryTotalFormatted}`}
          />
        </div>
      </div>
    </div>
  );
}
