"use client";

import { Activity, AlertTriangle, Cpu, HardDrive, MemoryStick, Server } from "lucide-react";
import { useMemo } from "react";
import type { z } from "zod";
import { ClusterMetrics } from "@/components/dashboard/cluster-metrics";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { ComponentPropsSchema } from "@/config/schema";
import { formatBytes, usePrometheusQuery } from "@/hooks/use-prometheus";
import { useResolvedQueries } from "@/hooks/use-query-library";

/**
 * Prometheus Node Metrics Macro Component
 *
 * Query refs expected (in order):
 * 0: cpu_usage - Node CPU usage percentage
 * 1: memory_total - Node memory total bytes
 * 2: memory_available - Node memory available bytes
 * 3: node_count - Cluster node count
 * 4: running_pods - Running pods count
 * 5: total_pods - Total pods count
 * 6: total_cpu - Total CPU cores
 * 7: total_memory - Total memory bytes
 */

type PrometheusNodeMetricsProps = z.infer<typeof ComponentPropsSchema>;

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
  const { queryRefs } = props;

  // Resolve all query refs to actual PromQL strings - must be called unconditionally
  const resolvedQueries = useResolvedQueries(queryRefs);

  // Execute all queries in parallel - must be called unconditionally
  const cpuQuery = usePrometheusQuery(resolvedQueries?.[0] || "", !!resolvedQueries?.[0]);
  const memTotalQuery = usePrometheusQuery(resolvedQueries?.[1] || "", !!resolvedQueries?.[1]);
  const memAvailQuery = usePrometheusQuery(resolvedQueries?.[2] || "", !!resolvedQueries?.[2]);
  const nodeCountQuery = usePrometheusQuery(resolvedQueries?.[3] || "", !!resolvedQueries?.[3]);
  const runningPodsQuery = usePrometheusQuery(resolvedQueries?.[4] || "", !!resolvedQueries?.[4]);
  const totalPodsQuery = usePrometheusQuery(resolvedQueries?.[5] || "", !!resolvedQueries?.[5]);
  const totalCpuQuery = usePrometheusQuery(resolvedQueries?.[6] || "", !!resolvedQueries?.[6]);
  const totalMemQuery = usePrometheusQuery(resolvedQueries?.[7] || "", !!resolvedQueries?.[7]);

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
  if (!queryRefs || queryRefs.length === 0) {
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
