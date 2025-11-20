"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  Expand,
  Layers,
  MemoryStick,
  Search,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { getPodStatusCounts, useKubeQuery, usePods } from "@/hooks/use-kubernetes";
import {
  getDeploymentName,
  getReplicaSetHealthColor,
  groupPodsByReplicaSet,
  type ReplicaSetGroup,
} from "@/lib/pod-grouping";
import type { KubernetesPod } from "@/types/kubernetes";
import { PodLogsViewer } from "./pod-logs-viewer";
import { PodMetricsChart, PodSparkline } from "./pod-sparkline";
import { ReplicaSetMetrics } from "./replicaset-metrics";

// Virtual list item types
interface NamespaceItem {
  type: "namespace";
  namespace: string;
  podCount: number;
  rsCount: number;
  expanded: boolean;
}

interface ReplicaSetItem {
  type: "replicaset";
  group: ReplicaSetGroup;
  expanded: boolean;
}

interface PodItem {
  type: "pod";
  pod: KubernetesPod;
  expanded: boolean;
  indent: number; // 1 = under namespace, 2 = under replicaset
}

type VirtualItem = NamespaceItem | ReplicaSetItem | PodItem;

function PodStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "Running":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "Pending":
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case "Failed":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "Succeeded":
      return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-gray-600" />;
  }
}

function PodExpandedDetails({ pod, onOpenSheet }: { pod: KubernetesPod; onOpenSheet: () => void }) {
  return (
    <div className="px-4 py-3 pl-20 bg-muted/20 border-b space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Cpu className="h-4 w-4 text-blue-500" />
            CPU Usage (1h)
          </div>
          <PodMetricsChart podName={pod.name} namespace={pod.namespace} metric="cpu" height={120} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MemoryStick className="h-4 w-4 text-green-500" />
            Memory Usage (1h)
          </div>
          <PodMetricsChart
            podName={pod.name}
            namespace={pod.namespace}
            metric="memory"
            height={120}
          />
        </div>
      </div>

      <PodLogsViewer podName={pod.name} namespace={pod.namespace} maxHeight="200px" />

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onOpenSheet}>
          <Expand className="mr-2 h-4 w-4" />
          Full Details
        </Button>
      </div>
    </div>
  );
}

function PodRow({
  pod,
  isExpanded,
  onToggleExpand,
  onOpenSheet,
  indent,
}: {
  pod: KubernetesPod;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenSheet: () => void;
  indent: number;
}) {
  const paddingLeft = indent === 2 ? "pl-20" : "pl-12";

  return (
    <div>
      <button
        type="button"
        className={`flex w-full items-center justify-between px-4 py-2 ${paddingLeft} hover:bg-muted/50 cursor-pointer border-b border-muted/30`}
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <PodStatusIcon status={pod.status} />
          <div>
            <div className="font-mono text-sm">{pod.name}</div>
            <div className="text-xs text-muted-foreground">
              {pod.ready} ready | {pod.restarts} restarts | {pod.age}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden lg:block">
            <PodSparkline podName={pod.name} namespace={pod.namespace} metric="cpu" height={24} />
          </div>
          <Badge variant="outline" className="text-xs">
            {pod.status}
          </Badge>
        </div>
      </button>
      {isExpanded && <PodExpandedDetails pod={pod} onOpenSheet={onOpenSheet} />}
    </div>
  );
}

export interface NamespacePodExplorerProps {
  title?: string;
  query?: unknown; // Inline query definition
  queryRef?: string; // Reference to global query
  namespace?: string; // Legacy namespace filter
  showMetrics?: boolean;
  showLogs?: boolean;
  showHeader?: boolean;
}

export function NamespacePodExplorer({
  title = "Pods",
  query,
  queryRef,
  namespace,
  showMetrics: _showMetrics = true,
  showLogs: _showLogs = true,
  showHeader = true,
}: NamespacePodExplorerProps = {}) {
  // Priority: inline query > queryRef > namespace > all pods
  const { data: queryData, isLoading: queryLoading } = useKubeQuery(queryRef, query);
  const { data: podsData, isLoading: podsLoading } = usePods(namespace);

  // Determine which data source to use
  const useQuery = !!query || !!queryRef;
  const _isLoading = useQuery ? queryLoading : podsLoading;
  const pods = useQuery ? (queryData?.items as KubernetesPod[] | undefined) : podsData?.pods;

  const [expandedNamespaces, setExpandedNamespaces] = useState<Set<string>>(new Set());
  const [expandedReplicaSets, setExpandedReplicaSets] = useState<Set<string>>(new Set());
  const [expandedPods, setExpandedPods] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedPod, setSelectedPod] = useState<KubernetesPod | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // Group pods into hierarchy
  const groupedData = useMemo(() => {
    if (!pods) return [];
    return groupPodsByReplicaSet(pods);
  }, [pods]);

  // Build virtual list items with 3-level hierarchy
  const virtualItems = useMemo(() => {
    const items: VirtualItem[] = [];
    const filterLower = searchFilter.toLowerCase();

    groupedData.forEach((nsData) => {
      // Filter check
      let matchesFilter = false;
      let totalPodsInNs = 0;

      // Check if namespace name matches
      if (nsData.namespace.toLowerCase().includes(filterLower)) {
        matchesFilter = true;
      }

      // Count matching pods
      const filteredReplicaSets: ReplicaSetGroup[] = [];
      nsData.replicaSets.forEach((rs) => {
        const matchingPods = searchFilter
          ? rs.pods.filter((p) => p.name.toLowerCase().includes(filterLower))
          : rs.pods;
        if (matchingPods.length > 0 || matchesFilter) {
          filteredReplicaSets.push({
            ...rs,
            pods: searchFilter ? matchingPods : rs.pods,
          });
          totalPodsInNs += matchingPods.length;
        }
      });

      const filteredStandalone = searchFilter
        ? nsData.standalonePods.filter((p) => p.name.toLowerCase().includes(filterLower))
        : nsData.standalonePods;
      totalPodsInNs += filteredStandalone.length;

      if (totalPodsInNs === 0 && !matchesFilter) return;

      // Add namespace header
      items.push({
        type: "namespace",
        namespace: nsData.namespace,
        podCount: totalPodsInNs,
        rsCount: filteredReplicaSets.length,
        expanded: expandedNamespaces.has(nsData.namespace),
      });

      if (expandedNamespaces.has(nsData.namespace)) {
        // Add ReplicaSets
        filteredReplicaSets.forEach((rs) => {
          const rsKey = `${rs.namespace}/${rs.name}`;
          items.push({
            type: "replicaset",
            group: rs,
            expanded: expandedReplicaSets.has(rsKey),
          });

          if (expandedReplicaSets.has(rsKey)) {
            // Add pods under ReplicaSet
            rs.pods.forEach((pod) => {
              const podKey = `${pod.namespace}/${pod.name}`;
              items.push({
                type: "pod",
                pod,
                expanded: expandedPods.has(podKey),
                indent: 2,
              });
            });
          }
        });

        // Add standalone pods
        filteredStandalone.forEach((pod) => {
          const podKey = `${pod.namespace}/${pod.name}`;
          items.push({
            type: "pod",
            pod,
            expanded: expandedPods.has(podKey),
            indent: 1,
          });
        });
      }
    });

    return items;
  }, [groupedData, expandedNamespaces, expandedReplicaSets, expandedPods, searchFilter]);

  const virtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = virtualItems[index];
      if (item.type === "namespace") return 48;
      if (item.type === "replicaset") return item.expanded ? 420 : 52;
      if (item.type === "pod") return item.expanded ? 580 : 56;
      return 56;
    },
    overscan: 5,
  });

  // Re-measure when expansions change
  useEffect(() => {
    virtualizer.measure();
  }, [virtualizer]);

  const toggleNamespace = (namespace: string) => {
    setExpandedNamespaces((prev) => {
      const next = new Set(prev);
      if (next.has(namespace)) {
        next.delete(namespace);
      } else {
        next.add(namespace);
      }
      return next;
    });
  };

  const toggleReplicaSet = (rsKey: string) => {
    setExpandedReplicaSets((prev) => {
      const next = new Set(prev);
      if (next.has(rsKey)) {
        next.delete(rsKey);
      } else {
        next.add(rsKey);
      }
      return next;
    });
  };

  const togglePod = (podKey: string) => {
    setExpandedPods((prev) => {
      const next = new Set(prev);
      if (next.has(podKey)) {
        next.delete(podKey);
      } else {
        next.add(podKey);
      }
      return next;
    });
  };

  const expandAllNamespaces = () => {
    setExpandedNamespaces(new Set(groupedData.map((g) => g.namespace)));
  };

  const collapseAll = () => {
    setExpandedNamespaces(new Set());
    setExpandedReplicaSets(new Set());
    setExpandedPods(new Set());
  };

  if (podsLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  const statusCounts = pods
    ? getPodStatusCounts(pods)
    : { Running: 0, Pending: 0, Failed: 0, Succeeded: 0, Unknown: 0 };

  const totalCount = pods?.length || 0;

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Summary Bar */}
        {showHeader && (
          <div className="flex items-center justify-between px-6 py-3 border-b bg-background">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">{title}</h2>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="default" className="bg-green-600">
                  {statusCounts.Running} Running
                </Badge>
                {statusCounts.Pending > 0 && (
                  <Badge variant="secondary" className="bg-yellow-600 text-white">
                    {statusCounts.Pending} Pending
                  </Badge>
                )}
                {statusCounts.Failed > 0 && (
                  <Badge variant="destructive">{statusCounts.Failed} Failed</Badge>
                )}
                <Badge variant="outline">{totalCount} Total</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={expandAllNamespaces}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-6 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pods, namespaces, or deployments..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Virtualized List */}
        <div ref={parentRef} className="flex-1 overflow-auto">
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const item = virtualItems[virtualRow.index];

              if (item.type === "namespace") {
                return (
                  <div
                    key={`ns-${item.namespace}`}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted cursor-pointer border-b"
                      onClick={() => toggleNamespace(item.namespace)}
                    >
                      <div className="flex items-center gap-2">
                        {item.expanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Box className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{item.namespace}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.rsCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Layers className="mr-1 h-3 w-3" />
                            {item.rsCount} replicas
                          </Badge>
                        )}
                        <Badge variant="secondary">{item.podCount} pods</Badge>
                      </div>
                    </button>
                  </div>
                );
              }

              if (item.type === "replicaset") {
                const rsKey = `${item.group.namespace}/${item.group.name}`;
                const healthColor = getReplicaSetHealthColor(item.group);

                return (
                  <div
                    key={`rs-${rsKey}`}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 pl-12 bg-muted/30 hover:bg-muted/40 cursor-pointer border-b"
                      onClick={() => toggleReplicaSet(rsKey)}
                    >
                      <div className="flex items-center gap-2">
                        {item.expanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Layers
                          className={`h-4 w-4 ${healthColor === "green" ? "text-green-500" : healthColor === "yellow" ? "text-yellow-500" : "text-red-500"}`}
                        />
                        <span className="font-medium">{getDeploymentName(item.group.name)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={healthColor === "green" ? "default" : "destructive"}
                          className={`text-xs ${healthColor === "green" ? "bg-green-600" : healthColor === "yellow" ? "bg-yellow-600" : ""}`}
                        >
                          {item.group.readyCount}/{item.group.totalCount} ready
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {item.group.totalRestarts} restarts
                        </Badge>
                      </div>
                    </button>
                    {item.expanded && <ReplicaSetMetrics group={item.group} />}
                  </div>
                );
              }

              // Pod item
              const podKey = `${item.pod.namespace}/${item.pod.name}`;

              return (
                <div
                  key={`pod-${podKey}`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <PodRow
                    pod={item.pod}
                    isExpanded={item.expanded}
                    onToggleExpand={() => togglePod(podKey)}
                    onOpenSheet={() => setSelectedPod(item.pod)}
                    indent={item.indent}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pod Detail Sheet */}
      <Sheet open={!!selectedPod} onOpenChange={() => setSelectedPod(null)}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-mono">{selectedPod?.name}</SheetTitle>
            <SheetDescription>Namespace: {selectedPod?.namespace}</SheetDescription>
          </SheetHeader>
          {selectedPod && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <div className="flex items-center gap-2 mt-1">
                    <PodStatusIcon status={selectedPod.status} />
                    {selectedPod.status}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Ready</div>
                  <div className="mt-1">{selectedPod.ready}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Restarts</div>
                  <div className="mt-1">{selectedPod.restarts}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Age</div>
                  <div className="mt-1">{selectedPod.age}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Node</div>
                  <div className="mt-1">{selectedPod.node || "N/A"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">IP</div>
                  <div className="mt-1 font-mono text-sm">{selectedPod.ip || "N/A"}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Cpu className="h-4 w-4 text-blue-500" />
                    CPU Usage (1h)
                  </div>
                  <PodMetricsChart
                    podName={selectedPod.name}
                    namespace={selectedPod.namespace}
                    metric="cpu"
                    height={180}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MemoryStick className="h-4 w-4 text-green-500" />
                    Memory Usage (1h)
                  </div>
                  <PodMetricsChart
                    podName={selectedPod.name}
                    namespace={selectedPod.namespace}
                    metric="memory"
                    height={180}
                  />
                </div>
              </div>

              <PodLogsViewer
                podName={selectedPod.name}
                namespace={selectedPod.namespace}
                maxHeight="300px"
              />

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Containers</div>
                <div className="space-y-2">
                  {selectedPod.containers.map((container) => (
                    <div key={container.name} className="p-3 bg-muted/50 rounded-md">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-sm">{container.name}</div>
                        <Badge variant={container.ready ? "default" : "destructive"}>
                          {container.state}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{container.image}</div>
                      <div className="text-xs text-muted-foreground">
                        Restarts: {container.restartCount}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
