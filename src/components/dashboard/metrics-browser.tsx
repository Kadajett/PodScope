"use client";

import {
  Activity,
  ChevronRight,
  Copy,
  Filter,
  Gauge,
  Hash,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Timer,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLabelValues, usePrometheusDiscovery } from "@/hooks/use-prometheus-discovery";
import type { MetricInfo } from "@/lib/prometheus";

interface MetricsBrowserProps {
  onAddQuery?: (metricName: string, promQL: string) => void;
  onCopyMetric?: (metricName: string) => void;
}

const metricTypeIcons: Record<string, React.ReactNode> = {
  counter: <Hash className="h-4 w-4" />,
  gauge: <Gauge className="h-4 w-4" />,
  histogram: <Activity className="h-4 w-4" />,
  summary: <Timer className="h-4 w-4" />,
  unknown: <Activity className="h-4 w-4" />,
};

const metricTypeColors: Record<string, string> = {
  counter: "text-blue-500",
  gauge: "text-green-500",
  histogram: "text-orange-500",
  summary: "text-purple-500",
  unknown: "text-gray-500",
};

// Group metrics by prefix (e.g., node_, kube_, container_)
function groupMetricsByPrefix(metrics: MetricInfo[]): Record<string, MetricInfo[]> {
  const groups: Record<string, MetricInfo[]> = {};

  for (const metric of metrics) {
    const parts = metric.name.split("_");
    const prefix = parts.length > 1 ? parts[0] : "other";
    if (!groups[prefix]) {
      groups[prefix] = [];
    }
    groups[prefix].push(metric);
  }

  // Sort groups by count (largest first)
  const sortedGroups: Record<string, MetricInfo[]> = {};
  const sortedKeys = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);
  for (const key of sortedKeys) {
    sortedGroups[key] = groups[key];
  }

  return sortedGroups;
}

export function MetricsBrowser({ onAddQuery, onCopyMetric }: MetricsBrowserProps) {
  const { metrics, labels, totalCount, loading, error, refresh } = usePrometheusDiscovery();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedMetric, setSelectedMetric] = useState<MetricInfo | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const { values: labelValues, loading: labelValuesLoading } = useLabelValues(selectedLabel);

  // Filter metrics based on search and type
  const filteredMetrics = useMemo(() => {
    let filtered = metrics;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(query) || m.metadata?.help?.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((m) => m.metadata?.type === typeFilter);
    }

    return filtered;
  }, [metrics, searchQuery, typeFilter]);

  const groupedMetrics = useMemo(() => groupMetricsByPrefix(filteredMetrics), [filteredMetrics]);

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const handleCopyMetric = useCallback(
    (metricName: string) => {
      navigator.clipboard.writeText(metricName);
      onCopyMetric?.(metricName);
    },
    [onCopyMetric]
  );

  const handleAddAsQuery = useCallback(
    (metric: MetricInfo) => {
      // Generate a simple PromQL query for the metric
      const promQL = metric.name;
      onAddQuery?.(metric.name, promQL);
    },
    [onAddQuery]
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Activity className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">Failed to load metrics</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={refresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Prometheus Metrics</h3>
          <p className="text-sm text-muted-foreground">
            Browse {totalCount.toLocaleString()} available metrics
          </p>
        </div>
        <Button onClick={refresh} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search metrics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="counter">Counter</SelectItem>
            <SelectItem value="gauge">Gauge</SelectItem>
            <SelectItem value="histogram">Histogram</SelectItem>
            <SelectItem value="summary">Summary</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Metrics List */}
          <div className="border rounded-md">
            <div className="p-3 border-b bg-muted/50">
              <h4 className="font-medium text-sm">
                Metrics ({filteredMetrics.length.toLocaleString()})
              </h4>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="p-2 space-y-1">
                {Object.entries(groupedMetrics).map(([group, groupMetrics]) => (
                  <Collapsible
                    key={group}
                    open={expandedGroups.has(group)}
                    onOpenChange={() => toggleGroup(group)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-accent text-left">
                      <div className="flex items-center gap-2">
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${
                            expandedGroups.has(group) ? "rotate-90" : ""
                          }`}
                        />
                        <span className="font-medium">{group}_*</span>
                        <Badge variant="secondary" className="text-xs">
                          {groupMetrics.length}
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-6 space-y-1">
                      {groupMetrics.map((metric) => (
                        <div
                          key={metric.name}
                          className={`flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer group ${
                            selectedMetric?.name === metric.name ? "bg-accent" : ""
                          }`}
                          onClick={() => setSelectedMetric(metric)}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={metricTypeColors[metric.metadata?.type || "unknown"]}>
                              {metricTypeIcons[metric.metadata?.type || "unknown"]}
                            </span>
                            <span className="text-sm truncate">{metric.name}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyMetric(metric.name);
                              }}
                              title="Copy metric name"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            {onAddQuery && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddAsQuery(metric);
                                }}
                                title="Add as query"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}

                {filteredMetrics.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No metrics found</p>
                    {searchQuery && <p className="text-sm mt-1">Try a different search term</p>}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Metric Details & Labels */}
          <div className="border rounded-md">
            <div className="p-3 border-b bg-muted/50">
              <h4 className="font-medium text-sm">
                {selectedMetric ? "Metric Details" : "Labels"}
              </h4>
            </div>
            <ScrollArea className="h-[400px]">
              {selectedMetric ? (
                <div className="p-4 space-y-4">
                  <div>
                    <h5 className="text-sm font-medium mb-1">Name</h5>
                    <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                      {selectedMetric.name}
                    </code>
                  </div>

                  {selectedMetric.metadata && (
                    <>
                      <div>
                        <h5 className="text-sm font-medium mb-1">Type</h5>
                        <Badge
                          variant="outline"
                          className={metricTypeColors[selectedMetric.metadata.type]}
                        >
                          {selectedMetric.metadata.type}
                        </Badge>
                      </div>

                      {selectedMetric.metadata.help && (
                        <div>
                          <h5 className="text-sm font-medium mb-1">Description</h5>
                          <p className="text-sm text-muted-foreground">
                            {selectedMetric.metadata.help}
                          </p>
                        </div>
                      )}

                      {selectedMetric.metadata.unit && (
                        <div>
                          <h5 className="text-sm font-medium mb-1">Unit</h5>
                          <Badge variant="secondary">{selectedMetric.metadata.unit}</Badge>
                        </div>
                      )}
                    </>
                  )}

                  <div className="pt-2 border-t">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyMetric(selectedMetric.name)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      {onAddQuery && (
                        <Button size="sm" onClick={() => handleAddAsQuery(selectedMetric)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add to Queries
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  <p className="text-sm text-muted-foreground mb-3">
                    Available labels ({labels.length})
                  </p>
                  {labels.map((label) => (
                    <div
                      key={label}
                      className={`flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer ${
                        selectedLabel === label ? "bg-accent" : ""
                      }`}
                      onClick={() => setSelectedLabel(selectedLabel === label ? null : label)}
                    >
                      <span className="text-sm font-mono">{label}</span>
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${
                          selectedLabel === label ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  ))}

                  {selectedLabel && (
                    <div className="mt-4 pt-4 border-t">
                      <h5 className="text-sm font-medium mb-2">Values for "{selectedLabel}"</h5>
                      {labelValuesLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-[200px] overflow-y-auto">
                          {labelValues.slice(0, 50).map((value) => (
                            <Badge
                              key={value}
                              variant="outline"
                              className="mr-1 mb-1 cursor-pointer hover:bg-accent"
                              onClick={() => navigator.clipboard.writeText(value)}
                            >
                              {value}
                            </Badge>
                          ))}
                          {labelValues.length > 50 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              +{labelValues.length - 50} more values
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
