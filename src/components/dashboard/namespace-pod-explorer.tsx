"use client";

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
import { useMemo, useState } from "react";
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

export interface NamespacePodExplorerProps {
  title?: string;
  query?: unknown;
  queryRef?: string;
  namespace?: string;
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
  const { data: queryData, isLoading: queryLoading } = useKubeQuery(queryRef, query);
  const { data: podsData, isLoading: podsLoading } = usePods(namespace);

  const useQuery = !!query || !!queryRef;
  const _isLoading = useQuery ? queryLoading : podsLoading;
  const pods = useQuery ? (queryData?.items as KubernetesPod[] | undefined) : podsData?.pods;

  const [expandedNamespaces, setExpandedNamespaces] = useState<Set<string>>(new Set());
  const [expandedReplicaSets, setExpandedReplicaSets] = useState<Set<string>>(new Set());
  const [expandedPods, setExpandedPods] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedPod, setSelectedPod] = useState<KubernetesPod | null>(null);

  const groupedData = useMemo(() => {
    if (!pods) return [];
    return groupPodsByReplicaSet(pods);
  }, [pods]);

  const filteredData = useMemo(() => {
    if (!searchFilter) return groupedData;

    const filterLower = searchFilter.toLowerCase();
    return groupedData
      .map((nsData) => {
        const matchesNs = nsData.namespace.toLowerCase().includes(filterLower);

        const filteredReplicaSets = nsData.replicaSets
          .map((rs) => ({
            ...rs,
            pods: rs.pods.filter((p) => matchesNs || p.name.toLowerCase().includes(filterLower)),
          }))
          .filter((rs) => matchesNs || rs.pods.length > 0);

        const filteredStandalone = nsData.standalonePods.filter(
          (p) => matchesNs || p.name.toLowerCase().includes(filterLower)
        );

        return {
          ...nsData,
          replicaSets: filteredReplicaSets,
          standalonePods: filteredStandalone,
        };
      })
      .filter((nsData) => nsData.replicaSets.length > 0 || nsData.standalonePods.length > 0);
  }, [groupedData, searchFilter]);

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

  return (
    <>
      <div className="flex flex-col h-full">
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
                <Badge variant="outline">{pods?.length || 0} Total</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setExpandedNamespaces(new Set(groupedData.map((g) => g.namespace)))
                }
              >
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setExpandedNamespaces(new Set());
                  setExpandedReplicaSets(new Set());
                  setExpandedPods(new Set());
                }}
              >
                Collapse
              </Button>
            </div>
          </div>
        )}

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

        <div className="flex-1 overflow-auto">
          {filteredData.map((nsData) => {
            const totalPods = nsData.replicaSets.reduce((acc, rs) => acc + rs.pods.length, 0) + nsData.standalonePods.length;

            return (
              <div key={nsData.namespace}>
                {/* Namespace Row */}
                <div
                  className="flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted cursor-pointer border-b"
                  onClick={() => {
                    const next = new Set(expandedNamespaces);
                    if (next.has(nsData.namespace)) {
                      next.delete(nsData.namespace);
                    } else {
                      next.add(nsData.namespace);
                    }
                    setExpandedNamespaces(next);
                  }}
                >
                  <div className="flex items-center gap-2">
                    {expandedNamespaces.has(nsData.namespace) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Box className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">{nsData.namespace}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {nsData.replicaSets.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Layers className="mr-1 h-3 w-3" />
                        {nsData.replicaSets.length} replicas
                      </Badge>
                    )}
                    <Badge variant="secondary">{totalPods} pods</Badge>
                  </div>
                </div>

                {/* Namespace Children */}
                {expandedNamespaces.has(nsData.namespace) && (
                  <>
                    {/* ReplicaSets */}
                    {nsData.replicaSets.map((rs) => {
                      const rsKey = `${rs.namespace}/${rs.name}`;
                      const healthColor = getReplicaSetHealthColor(rs);

                      return (
                        <div key={rsKey}>
                          {/* ReplicaSet Row */}
                          <div
                            className="flex items-center justify-between px-4 py-3 pl-12 bg-muted/30 hover:bg-muted/40 cursor-pointer border-b"
                            onClick={() => {
                              const next = new Set(expandedReplicaSets);
                              if (next.has(rsKey)) {
                                next.delete(rsKey);
                              } else {
                                next.add(rsKey);
                              }
                              setExpandedReplicaSets(next);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              {expandedReplicaSets.has(rsKey) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <Layers
                                className={`h-4 w-4 ${healthColor === "green" ? "text-green-500" : healthColor === "yellow" ? "text-yellow-500" : "text-red-500"}`}
                              />
                              <span className="font-medium">{getDeploymentName(rs.name)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={healthColor === "green" ? "default" : "destructive"}
                                className={`text-xs ${healthColor === "green" ? "bg-green-600" : healthColor === "yellow" ? "bg-yellow-600" : ""}`}
                              >
                                {rs.readyCount}/{rs.totalCount} ready
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {rs.totalRestarts} restarts
                              </Badge>
                            </div>
                          </div>

                          {/* ReplicaSet Metrics */}
                          {expandedReplicaSets.has(rsKey) && <ReplicaSetMetrics group={rs} />}

                          {/* ReplicaSet Pods */}
                          {expandedReplicaSets.has(rsKey) &&
                            rs.pods.map((pod) => {
                              const podKey = `${pod.namespace}/${pod.name}`;

                              return (
                                <div key={podKey}>
                                  {/* Pod Row */}
                                  <div
                                    className="flex items-center justify-between px-4 py-3 pl-20 hover:bg-muted/50 cursor-pointer border-b"
                                    onClick={() => {
                                      const next = new Set(expandedPods);
                                      if (next.has(podKey)) {
                                        next.delete(podKey);
                                      } else {
                                        next.add(podKey);
                                      }
                                      setExpandedPods(next);
                                    }}
                                  >
                                    <div className="flex items-center gap-3">
                                      {expandedPods.has(podKey) ? (
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
                                        <PodSparkline
                                          podName={pod.name}
                                          namespace={pod.namespace}
                                          metric="cpu"
                                          height={24}
                                        />
                                      </div>
                                      <Badge variant="outline" className="text-xs">
                                        {pod.status}
                                      </Badge>
                                    </div>
                                  </div>

                                  {/* Pod Details */}
                                  {expandedPods.has(podKey) && (
                                    <div className="px-4 py-3 pl-20 bg-muted/20 border-b space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2 text-sm font-medium">
                                            <Cpu className="h-4 w-4 text-blue-500" />
                                            CPU Usage (1h)
                                          </div>
                                          <PodMetricsChart
                                            podName={pod.name}
                                            namespace={pod.namespace}
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
                                            podName={pod.name}
                                            namespace={pod.namespace}
                                            metric="memory"
                                            height={180}
                                          />
                                        </div>
                                      </div>

                                      <PodLogsViewer
                                        podName={pod.name}
                                        namespace={pod.namespace}
                                        maxHeight="300px"
                                      />

                                      <div className="flex justify-end">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setSelectedPod(pod)}
                                        >
                                          <Expand className="mr-2 h-4 w-4" />
                                          Full Details
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      );
                    })}

                    {/* Standalone Pods */}
                    {nsData.standalonePods.map((pod) => {
                      const podKey = `${pod.namespace}/${pod.name}`;

                      return (
                        <div key={podKey}>
                          {/* Pod Row */}
                          <div
                            className="flex items-center justify-between px-4 py-3 pl-12 hover:bg-muted/50 cursor-pointer border-b"
                            onClick={() => {
                              const next = new Set(expandedPods);
                              if (next.has(podKey)) {
                                next.delete(podKey);
                              } else {
                                next.add(podKey);
                              }
                              setExpandedPods(next);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              {expandedPods.has(podKey) ? (
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
                                <PodSparkline
                                  podName={pod.name}
                                  namespace={pod.namespace}
                                  metric="cpu"
                                  height={24}
                                />
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {pod.status}
                              </Badge>
                            </div>
                          </div>

                          {/* Pod Details */}
                          {expandedPods.has(podKey) && (
                            <div className="px-4 py-3 pl-12 bg-muted/20 border-b space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm font-medium">
                                    <Cpu className="h-4 w-4 text-blue-500" />
                                    CPU Usage (1h)
                                  </div>
                                  <PodMetricsChart
                                    podName={pod.name}
                                    namespace={pod.namespace}
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
                                    podName={pod.name}
                                    namespace={pod.namespace}
                                    metric="memory"
                                    height={180}
                                  />
                                </div>
                              </div>

                              <PodLogsViewer
                                podName={pod.name}
                                namespace={pod.namespace}
                                maxHeight="300px"
                              />

                              <div className="flex justify-end">
                                <Button variant="outline" size="sm" onClick={() => setSelectedPod(pod)}>
                                  <Expand className="mr-2 h-4 w-4" />
                                  Full Details
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

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
