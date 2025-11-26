import { NextResponse } from "next/server";
import {
  discoverMetrics,
  getLabelValues,
  getMetricLabels,
  type MetricInfo,
  searchMetrics,
} from "@/lib/prometheus";
import type { PrometheusApiResponse } from "@/types/prometheus";

export interface MetricDiscoveryResponse {
  metrics: MetricInfo[];
  labels: string[];
  totalCount: number;
}

export interface MetricSearchResponse {
  metrics: MetricInfo[];
  query: string;
  totalCount: number;
}

export interface MetricLabelsResponse {
  metric: string;
  labels: string[];
}

export interface LabelValuesResponse {
  label: string;
  values: string[];
}

// GET /api/prometheus/discover
// Query params:
//   - action: "all" | "search" | "labels" | "label-values"
//   - query: search query (for action=search)
//   - metric: metric name (for action=labels)
//   - label: label name (for action=label-values)
export async function GET(request: Request) {
  const timestamp = new Date().toISOString();
  const { searchParams } = new URL(request.url);

  const action = searchParams.get("action") || "all";
  const query = searchParams.get("query") || "";
  const metric = searchParams.get("metric") || "";
  const label = searchParams.get("label") || "";

  try {
    switch (action) {
      case "all": {
        const result = await discoverMetrics();
        const response: PrometheusApiResponse<MetricDiscoveryResponse> = {
          success: true,
          data: result,
          timestamp,
        };
        return NextResponse.json(response);
      }

      case "search": {
        if (!query) {
          return NextResponse.json(
            {
              success: false,
              error: "Query parameter 'query' is required for search action",
              timestamp,
            },
            { status: 400 }
          );
        }
        const metrics = await searchMetrics(query);
        const response: PrometheusApiResponse<MetricSearchResponse> = {
          success: true,
          data: {
            metrics,
            query,
            totalCount: metrics.length,
          },
          timestamp,
        };
        return NextResponse.json(response);
      }

      case "labels": {
        if (!metric) {
          return NextResponse.json(
            {
              success: false,
              error: "Query parameter 'metric' is required for labels action",
              timestamp,
            },
            { status: 400 }
          );
        }
        const labels = await getMetricLabels(metric);
        const response: PrometheusApiResponse<MetricLabelsResponse> = {
          success: true,
          data: {
            metric,
            labels,
          },
          timestamp,
        };
        return NextResponse.json(response);
      }

      case "label-values": {
        if (!label) {
          return NextResponse.json(
            {
              success: false,
              error: "Query parameter 'label' is required for label-values action",
              timestamp,
            },
            { status: 400 }
          );
        }
        const values = await getLabelValues(label);
        const response: PrometheusApiResponse<LabelValuesResponse> = {
          success: true,
          data: {
            label,
            values,
          },
          timestamp,
        };
        return NextResponse.json(response);
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown action: ${action}. Valid actions: all, search, labels, label-values`,
            timestamp,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    const response: PrometheusApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to discover metrics",
      timestamp,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
