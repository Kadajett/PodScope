"use client";

import { useMemo } from "react";
import type { AxisOptions } from "react-charts";
import { Chart } from "react-charts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes, usePodMetricsRange } from "@/hooks/use-prometheus";

interface SparklineProps {
  podName: string;
  namespace: string;
  metric: "cpu" | "memory";
  height?: number;
}

type MetricDatum = {
  timestamp: Date;
  value: number;
};

type MetricSeries = {
  label: string;
  data: MetricDatum[];
};

export function PodSparkline({ podName, namespace, metric, height = 40 }: SparklineProps) {
  const { data, isLoading } = usePodMetricsRange(podName, namespace, metric);

  // Memoize chart data
  const chartData = useMemo((): MetricSeries[] => {
    if (!data?.result?.[0]?.values) {
      return [
        {
          label: metric,
          data: [],
        },
      ];
    }

    const seriesData = data.result[0].values.map(([ts, val]) => ({
      timestamp: new Date(ts * 1000),
      value: parseFloat(val),
    }));

    return [
      {
        label: metric === "cpu" ? "CPU" : "Memory",
        data: seriesData,
      },
    ];
  }, [data, metric]);

  // Memoize primary axis (time)
  const primaryAxis = useMemo(
    (): AxisOptions<MetricDatum> => ({
      getValue: (datum) => datum.timestamp,
      scaleType: "time",
      show: false,
    }),
    []
  );

  // Memoize secondary axes (value)
  const secondaryAxes = useMemo(
    (): AxisOptions<MetricDatum>[] => [
      {
        getValue: (datum) => datum.value,
        elementType: "area",
        show: false,
        min: 0,
      },
    ],
    []
  );

  // Get current value for display
  const currentValue = useMemo(() => {
    if (!data?.result?.[0]?.values?.length) return "N/A";
    const values = data.result[0].values;
    const current = parseFloat(values[values.length - 1][1]);
    return metric === "cpu" ? `${(current * 1000).toFixed(1)}m` : formatBytes(current);
  }, [data, metric]);

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (!chartData[0].data.length) {
    return <div className="text-xs text-muted-foreground h-10 flex items-center">No data</div>;
  }

  return (
    <div className="flex items-center gap-3">
      <div
        style={{ width: "140px", height: `${height}px`, position: "relative", overflow: "hidden" }}
      >
        <Chart
          options={{
            data: chartData,
            primaryAxis,
            secondaryAxes,
            dark: true,
            tooltip: { show: false },
            primaryCursor: { show: false },
            secondaryCursor: { show: false },
          }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground min-w-[70px]">{currentValue}</span>
    </div>
  );
}

// Larger chart for expanded pod details
export function PodMetricsChart({ podName, namespace, metric, height = 150 }: SparklineProps) {
  const { data, isLoading } = usePodMetricsRange(podName, namespace, metric);

  const chartData = useMemo((): MetricSeries[] => {
    if (!data?.result?.[0]?.values) {
      return [{ label: metric, data: [] }];
    }

    const seriesData = data.result[0].values.map(([ts, val]) => ({
      timestamp: new Date(ts * 1000),
      value: parseFloat(val),
    }));

    return [
      {
        label: metric === "cpu" ? "CPU Usage" : "Memory Usage",
        data: seriesData,
      },
    ];
  }, [data, metric]);

  const primaryAxis = useMemo(
    (): AxisOptions<MetricDatum> => ({
      getValue: (datum) => datum.timestamp,
      scaleType: "time",
    }),
    []
  );

  const secondaryAxes = useMemo(
    (): AxisOptions<MetricDatum>[] => [
      {
        getValue: (datum) => datum.value,
        elementType: "area",
        min: 0,
        formatters: {
          scale: (value: number | null) => {
            if (value === null || value === undefined) return "";
            return metric === "cpu" ? `${(value * 1000).toFixed(0)}m` : formatBytes(value);
          },
        },
      },
    ],
    [metric]
  );

  if (isLoading) {
    return <Skeleton style={{ height: `${height}px` }} className="w-full" />;
  }

  if (!chartData[0].data.length) {
    return (
      <div
        className="text-sm text-muted-foreground flex items-center justify-center border rounded"
        style={{ height: `${height}px` }}
      >
        No metrics data available
      </div>
    );
  }

  return (
    <div style={{ height: `${height}px`, width: "100%", position: "relative", overflow: "hidden" }}>
      <Chart
        options={{
          data: chartData,
          primaryAxis,
          secondaryAxes,
          dark: true,
        }}
      />
    </div>
  );
}
