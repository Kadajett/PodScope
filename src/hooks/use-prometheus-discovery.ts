"use client";

import { useCallback, useEffect, useState } from "react";
import type { MetricInfo } from "@/lib/prometheus";

interface DiscoveryState {
  metrics: MetricInfo[];
  labels: string[];
  totalCount: number;
  loading: boolean;
  error: string | null;
}

interface LabelValuesState {
  values: string[];
  loading: boolean;
  error: string | null;
}

export function usePrometheusDiscovery() {
  const [state, setState] = useState<DiscoveryState>({
    metrics: [],
    labels: [],
    totalCount: 0,
    loading: true,
    error: null,
  });

  const fetchDiscovery = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch("/api/prometheus/discover?action=all");
      const data = await response.json();

      if (data.success) {
        setState({
          metrics: data.data.metrics,
          labels: data.data.labels,
          totalCount: data.data.totalCount,
          loading: false,
          error: null,
        });
      } else {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: data.error || "Failed to fetch metrics",
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to fetch metrics",
      }));
    }
  }, []);

  useEffect(() => {
    fetchDiscovery();
  }, [fetchDiscovery]);

  const searchMetrics = useCallback(
    async (query: string): Promise<MetricInfo[]> => {
      if (!query.trim()) {
        return state.metrics;
      }

      try {
        const response = await fetch(
          `/api/prometheus/discover?action=search&query=${encodeURIComponent(query)}`
        );
        const data = await response.json();

        if (data.success) {
          return data.data.metrics;
        }
        return [];
      } catch {
        return [];
      }
    },
    [state.metrics]
  );

  const getMetricLabels = useCallback(async (metricName: string): Promise<string[]> => {
    try {
      const response = await fetch(
        `/api/prometheus/discover?action=labels&metric=${encodeURIComponent(metricName)}`
      );
      const data = await response.json();

      if (data.success) {
        return data.data.labels;
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  return {
    ...state,
    refresh: fetchDiscovery,
    searchMetrics,
    getMetricLabels,
  };
}

export function useLabelValues(labelName: string | null) {
  const [state, setState] = useState<LabelValuesState>({
    values: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!labelName) {
      setState({ values: [], loading: false, error: null });
      return;
    }

    const fetchValues = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await fetch(
          `/api/prometheus/discover?action=label-values&label=${encodeURIComponent(labelName)}`
        );
        const data = await response.json();

        if (data.success) {
          setState({
            values: data.data.values,
            loading: false,
            error: null,
          });
        } else {
          setState({
            values: [],
            loading: false,
            error: data.error || "Failed to fetch label values",
          });
        }
      } catch (error) {
        setState({
          values: [],
          loading: false,
          error: error instanceof Error ? error.message : "Failed to fetch label values",
        });
      }
    };

    fetchValues();
  }, [labelName]);

  return state;
}
