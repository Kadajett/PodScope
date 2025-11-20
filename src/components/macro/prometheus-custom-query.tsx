"use client";

import type { z } from "zod";
import { CustomPromQLChart } from "@/components/dashboard/custom-promql-chart";
import type { PrometheusQueryComponentConfigSchema } from "@/config/schema";

/**
 * Prometheus Custom Query Macro Component
 * Wraps the CustomPromQLChart component with config-driven behavior
 *
 * This component visualizes any Prometheus metric with customizable chart types.
 * It supports both direct PromQL queries and references to the query library.
 *
 * Config options:
 * - queryRef: Reference to a query in the library (e.g., "promQueries.clusterMetrics.cpu_usage_v1-0-0")
 * - query: Direct PromQL query string (alternative to queryRef)
 * - chartType: Chart visualization type - "line", "area", or "bar" (default: "line")
 * - timeRange: Time range for range queries - "5m", "1h", "24h", etc. (default: "1h")
 * - variables: Object mapping variable names to values for substitution
 *   Example: { "pod": "my-pod", "namespace": "production" }
 * - title: Component title (default: "Custom Query")
 * - showHeader: Show/hide the header bar (default: true)
 *
 * Variable Substitution:
 * Queries can include {{variableName}} placeholders that will be replaced with
 * values from the variables config object.
 *
 * Example with queryRef:
 * {
 *   "title": "Pod CPU Usage",
 *   "queryRef": "promQueries.podMetrics.cpu_usage_v1-0-0",
 *   "chartType": "area",
 *   "timeRange": "1h",
 *   "variables": {
 *     "pod": "my-app-7f8c9d",
 *     "namespace": "production"
 *   }
 * }
 *
 * Example with direct query:
 * {
 *   "title": "Request Rate",
 *   "query": "rate(http_requests_total[5m])",
 *   "chartType": "line",
 *   "timeRange": "30m"
 * }
 */

type PrometheusCustomQueryProps = z.infer<typeof PrometheusQueryComponentConfigSchema>;

export function PrometheusCustomQuery(props: PrometheusCustomQueryProps) {
  const {
    title = "Custom Query",
    queryRef,
    query,
    chartType = "line",
    timeRange = "1h",
    variables = {},
    showHeader = true,
  } = props;

  return (
    <CustomPromQLChart
      title={title}
      queryRef={queryRef}
      query={query}
      chartType={chartType}
      timeRange={timeRange}
      variables={variables}
      showHeader={showHeader}
    />
  );
}
