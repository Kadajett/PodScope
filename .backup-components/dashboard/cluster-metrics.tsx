"use client";

import { Activity, AlertTriangle, Cpu, HardDrive, MemoryStick, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent, useMetrics } from "@/hooks/use-prometheus";

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
          {formatPercent(percentage)}
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

export function ClusterMetrics() {
  const { data: metrics, isLoading, error } = useMetrics("all");

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

  if (error || !metrics) {
    return (
      <div className="px-6 py-4">
        <h2 className="text-lg font-semibold mb-4">Cluster Metrics</h2>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-red-600 font-medium">Failed to load metrics</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : "Unable to connect to Prometheus"}
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
        <Badge
          variant="outline"
          className={
            metrics.health.healthy
              ? "border-green-600 text-green-600"
              : "border-red-600 text-red-600"
          }
        >
          <Activity className="mr-1 h-3 w-3" />
          {metrics.health.healthy ? "Healthy" : "Unhealthy"}
        </Badge>
      </div>

      {/* Node Metrics */}
      {metrics.node && (
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
      )}

      {/* Cluster Metrics */}
      {metrics.cluster && (
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
      )}
    </div>
  );
}
