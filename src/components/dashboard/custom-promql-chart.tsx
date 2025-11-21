"use client";

import { AlertTriangle, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import type { AxisOptions } from "react-charts";
import { Chart } from "react-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { QueryLibrary } from "@/config/schema";
import { usePrometheusQuery } from "@/hooks/use-prometheus";
import { useQueryLibrary } from "@/hooks/use-query-library";

interface CustomPromQLChartProps {
  title?: string;
  queryRef?: string;
  query?: string;
  chartType?: "line" | "area" | "bar";
  timeRange?: string;
  variables?: Record<string, string>;
  showHeader?: boolean;
}

type ChartDatum = {
  timestamp: Date;
  value: number;
};

type ChartSeries = {
  label: string;
  data: ChartDatum[];
};

interface PrometheusSeries {
  metric: Record<string, string>;
  value?: [number, string];
  values?: Array<[number, string]>;
}

// Resolve query from reference or use direct query
function resolveQuery(
  queryRef?: string,
  directQuery?: string,
  queryLibrary?: QueryLibrary
): string | null {
  if (directQuery) {
    return directQuery;
  }

  if (queryRef && queryLibrary) {
    // Parse queryRef: "namespace.queryName_version"
    const cleanRef = queryRef.startsWith("promQueries.") ? queryRef.slice(12) : queryRef;

    const parts = cleanRef.split(".");
    if (parts.length === 2) {
      const [namespace, queryName] = parts;
      return queryLibrary[namespace]?.[queryName];
    }
  }

  return null;
}

// Substitute variables in query
function substituteVariables(query: string, variables: Record<string, string>): string {
  let result = query;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(regex, value);
  });
  return result;
}

// Transform instant vector to chart series
function transformVectorToSeries(series: PrometheusSeries, idx: number): ChartSeries {
  const labels = Object.entries(series.metric)
    .filter(([key]) => key !== "__name__")
    .map(([key, val]) => `${key}=${val}`)
    .join(", ");

  return {
    label: labels || `Series ${idx + 1}`,
    data: [
      {
        timestamp: new Date(),
        value: series.value ? parseFloat(series.value[1]) : 0,
      },
    ],
  };
}

// Transform matrix to chart series
function transformMatrixToSeries(series: PrometheusSeries, idx: number): ChartSeries {
  const labels = Object.entries(series.metric)
    .filter(([key]) => key !== "__name__")
    .map(([key, val]) => `${key}=${val}`)
    .join(", ");

  return {
    label: labels || `Series ${idx + 1}`,
    data: (series.values || []).map(([ts, val]: [number, string]) => ({
      timestamp: new Date(ts * 1000),
      value: parseFloat(val),
    })),
  };
}

export function CustomPromQLChart({
  title = "Custom Query",
  queryRef,
  query: directQuery,
  chartType = "line",
  timeRange: _timeRange = "1h",
  variables = {},
  showHeader = true,
}: CustomPromQLChartProps) {
  const { queryLibrary } = useQueryLibrary();

  // Resolve the query
  const resolvedQuery = useMemo(() => {
    const baseQuery = resolveQuery(queryRef, directQuery, queryLibrary);
    if (!baseQuery) return null;

    return substituteVariables(baseQuery, variables);
  }, [queryRef, directQuery, queryLibrary, variables]);

  const { data, isLoading, error } = usePrometheusQuery(resolvedQuery || "", !!resolvedQuery);

  // Transform Prometheus data for react-charts
  const chartData = useMemo((): ChartSeries[] => {
    if (!data?.result || data.result.length === 0) {
      return [{ label: title, data: [] }];
    }

    // Handle instant queries (single value)
    if (data.resultType === "vector") {
      return data.result.map(transformVectorToSeries);
    }

    // Handle range queries (time series)
    if (data.resultType === "matrix") {
      return data.result.map(transformMatrixToSeries);
    }

    return [{ label: title, data: [] }];
  }, [data, title]);

  const primaryAxis = useMemo(
    (): AxisOptions<ChartDatum> => ({
      getValue: (datum) => datum.timestamp,
      scaleType: "time",
    }),
    []
  );

  const secondaryAxes = useMemo(
    (): AxisOptions<ChartDatum>[] => [
      {
        getValue: (datum) => datum.value,
        elementType: chartType,
        min: 0,
      },
    ],
    [chartType]
  );

  if (isLoading) {
    return (
      <div className="px-6 py-4">
        {showHeader && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (error || !resolvedQuery) {
    return (
      <div className="px-6 py-4">
        {showHeader && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-red-600 font-medium">
                {error ? "Query Failed" : "No Query Configured"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {error?.message || "Please provide a query or queryRef in the component config"}
            </p>
            {resolvedQuery && (
              <div className="mt-3 p-2 bg-muted/50 rounded font-mono text-xs">{resolvedQuery}</div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasData = chartData.some((series) => series.data.length > 0);
  const currentValue =
    chartData[0]?.data.length > 0 ? chartData[0].data[chartData[0].data.length - 1].value : null;

  return (
    <div className="flex flex-col h-full">
      {showHeader && (
        <div className="px-6 py-3 border-b bg-background">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              {resolvedQuery && (
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {resolvedQuery.length > 100
                    ? `${resolvedQuery.substring(0, 100)}...`
                    : resolvedQuery}
                </p>
              )}
            </div>
            {currentValue !== null && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <div className="text-right">
                  <div className="text-2xl font-bold">{currentValue.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Current</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 px-6 py-4">
        {!hasData ? (
          <div className="h-full flex items-center justify-center border rounded">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No data returned</p>
              <p className="text-xs text-muted-foreground mt-1">
                The query executed successfully but returned no results
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full">
            <Chart
              options={{
                data: chartData,
                primaryAxis,
                secondaryAxes,
                dark: true,
              }}
            />
          </div>
        )}
      </div>

      {chartData.length > 1 && hasData && (
        <div className="px-6 py-2 border-t bg-background">
          <div className="flex gap-2 flex-wrap">
            {chartData.map((series) => (
              <Badge key={series.label} variant="outline" className="text-xs">
                {series.label}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
