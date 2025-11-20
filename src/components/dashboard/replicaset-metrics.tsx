"use client";

import { useQueries } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Cpu, MemoryStick, RotateCcw, XCircle } from "lucide-react";
import { useMemo } from "react";
import type { AxisOptions } from "react-charts";
import { Chart } from "react-charts";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes } from "@/hooks/use-prometheus";
import { getDeploymentName, type ReplicaSetGroup } from "@/lib/pod-grouping";

interface ReplicaSetMetricsProps {
  group: ReplicaSetGroup;
}

type MetricDatum = {
  timestamp: Date;
  value: number;
};

type MetricSeries = {
  label: string;
  data: MetricDatum[];
};

// Fetch range metrics for a pod
async function fetchPodMetricsRange(podName: string, namespace: string, metric: "cpu" | "memory") {
  const now = new Date();
  const start = new Date(now.getTime() - 3600000); // 1 hour ago

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
      step: "120s", // 2 minute steps for combined view
    }),
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return { podName, data: data.data };
}

export function ReplicaSetMetrics({ group }: ReplicaSetMetricsProps) {
  const _deploymentName = getDeploymentName(group.name);
  const healthPercent = (group.readyCount / group.totalCount) * 100;

  // Fetch metrics for all pods in parallel
  const cpuQueries = useQueries({
    queries: group.pods.map((pod) => ({
      queryKey: ["rs-pod-cpu", group.namespace, pod.name],
      queryFn: () => fetchPodMetricsRange(pod.name, group.namespace, "cpu"),
      staleTime: 60000,
    })),
  });

  const memQueries = useQueries({
    queries: group.pods.map((pod) => ({
      queryKey: ["rs-pod-memory", group.namespace, pod.name],
      queryFn: () => fetchPodMetricsRange(pod.name, group.namespace, "memory"),
      staleTime: 60000,
    })),
  });

  const isLoading = cpuQueries.some((q) => q.isLoading) || memQueries.some((q) => q.isLoading);

  // Build combined chart data - one series per pod
  const cpuChartData = useMemo((): MetricSeries[] => {
    return cpuQueries
      .filter((q) => q.data?.data?.result?.[0]?.values)
      .map((q) => ({
        label: q.data?.podName.split("-").pop() || q.data?.podName, // Short name
        data: q.data?.data.result[0].values.map(([ts, val]: [number, string]) => ({
          timestamp: new Date(ts * 1000),
          value: parseFloat(val),
        })),
      }));
  }, [cpuQueries]);

  const memChartData = useMemo((): MetricSeries[] => {
    return memQueries
      .filter((q) => q.data?.data?.result?.[0]?.values)
      .map((q) => ({
        label: q.data?.podName.split("-").pop() || q.data?.podName,
        data: q.data?.data.result[0].values.map(([ts, val]: [number, string]) => ({
          timestamp: new Date(ts * 1000),
          value: parseFloat(val),
        })),
      }));
  }, [memQueries]);

  // Calculate aggregate current values
  const aggregateStats = useMemo(() => {
    let totalCpu = 0;
    let totalMem = 0;
    let podCount = 0;

    cpuQueries.forEach((q) => {
      if (q.data?.data?.result?.[0]?.values?.length) {
        const values = q.data.data.result[0].values;
        totalCpu += parseFloat(values[values.length - 1][1]);
        podCount++;
      }
    });

    memQueries.forEach((q) => {
      if (q.data?.data?.result?.[0]?.values?.length) {
        const values = q.data.data.result[0].values;
        totalMem += parseFloat(values[values.length - 1][1]);
      }
    });

    return {
      avgCpu: podCount > 0 ? totalCpu / podCount : 0,
      totalCpu,
      avgMem: podCount > 0 ? totalMem / podCount : 0,
      totalMem,
    };
  }, [cpuQueries, memQueries]);

  const primaryAxis = useMemo(
    (): AxisOptions<MetricDatum> => ({
      getValue: (datum) => datum.timestamp,
      scaleType: "time",
    }),
    []
  );

  const cpuSecondaryAxes = useMemo(
    (): AxisOptions<MetricDatum>[] => [
      {
        getValue: (datum) => datum.value,
        elementType: "line",
        min: 0,
        formatters: {
          scale: (value: number | null) => (value !== null ? `${(value * 1000).toFixed(0)}m` : ""),
        },
      },
    ],
    []
  );

  const memSecondaryAxes = useMemo(
    (): AxisOptions<MetricDatum>[] => [
      {
        getValue: (datum) => datum.value,
        elementType: "line",
        min: 0,
        formatters: {
          scale: (value: number | null) => (value !== null ? formatBytes(value) : ""),
        },
      },
    ],
    []
  );

  return (
    <div className="px-4 py-4 pl-16 bg-muted/10 border-b space-y-4">
      {/* Header Stats - At a Glance */}
      <div className="grid grid-cols-4 gap-4">
        {/* Replica Health */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Replica Health</div>
          <div className="flex items-center gap-2">
            {healthPercent === 100 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : healthPercent >= 50 ? (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="text-lg font-bold">
              {group.readyCount}/{group.totalCount}
            </span>
          </div>
          <Progress value={healthPercent} className="h-2" />
        </div>

        {/* Total Restarts */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Total Restarts</div>
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-muted-foreground" />
            <span
              className={`text-lg font-bold ${group.totalRestarts > 10 ? "text-yellow-500" : ""}`}
            >
              {group.totalRestarts}
            </span>
          </div>
        </div>

        {/* Avg CPU */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Avg CPU / Pod</div>
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-500" />
            <span className="text-lg font-bold font-mono">
              {isLoading ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                `${(aggregateStats.avgCpu * 1000).toFixed(1)}m`
              )}
            </span>
          </div>
        </div>

        {/* Avg Memory */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Avg Memory / Pod</div>
          <div className="flex items-center gap-2">
            <MemoryStick className="h-5 w-5 text-green-500" />
            <span className="text-lg font-bold font-mono">
              {isLoading ? <Skeleton className="h-6 w-20" /> : formatBytes(aggregateStats.avgMem)}
            </span>
          </div>
        </div>
      </div>

      {/* Combined Charts - All Pods Overlaid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">CPU Usage (All Replicas)</div>
            <Badge variant="outline" className="text-xs">
              Total: {(aggregateStats.totalCpu * 1000).toFixed(0)}m
            </Badge>
          </div>
          {isLoading ? (
            <Skeleton className="h-[140px] w-full" />
          ) : cpuChartData.length > 0 ? (
            <div style={{ height: "140px" }}>
              <Chart
                options={{
                  data: cpuChartData,
                  primaryAxis,
                  secondaryAxes: cpuSecondaryAxes,
                  dark: true,
                }}
              />
            </div>
          ) : (
            <div className="h-[140px] flex items-center justify-center text-sm text-muted-foreground border rounded">
              No CPU metrics available
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Memory Usage (All Replicas)</div>
            <Badge variant="outline" className="text-xs">
              Total: {formatBytes(aggregateStats.totalMem)}
            </Badge>
          </div>
          {isLoading ? (
            <Skeleton className="h-[140px] w-full" />
          ) : memChartData.length > 0 ? (
            <div style={{ height: "140px" }}>
              <Chart
                options={{
                  data: memChartData,
                  primaryAxis,
                  secondaryAxes: memSecondaryAxes,
                  dark: true,
                }}
              />
            </div>
          ) : (
            <div className="h-[140px] flex items-center justify-center text-sm text-muted-foreground border rounded">
              No memory metrics available
            </div>
          )}
        </div>
      </div>

      {/* Status breakdown */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Status:</span>
        {Object.entries(group.statuses).map(([status, count]) => (
          <Badge
            key={status}
            variant={status === "Running" ? "default" : "secondary"}
            className={`text-xs ${status === "Running" ? "bg-green-600" : status === "Failed" ? "bg-red-600" : ""}`}
          >
            {count} {status}
          </Badge>
        ))}
      </div>
    </div>
  );
}
