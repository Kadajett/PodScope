"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  HardDrive,
  MemoryStick,
  Search,
  Server,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNodes } from "@/hooks/use-kubernetes";
import type { KubernetesNode } from "@/types/kubernetes";

interface NodeStatusGridProps {
  title?: string;
  showHeader?: boolean;
  showTaints?: boolean;
  showLabels?: boolean;
}

function NodeStatusIcon({ status }: { status: string }) {
  if (status === "Ready") {
    return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  }
  return <XCircle className="h-4 w-4 text-red-600" />;
}

function NodeConditionBadge({
  condition,
}: {
  condition: { type: string; status: string; reason: string };
}) {
  const isHealthy =
    (condition.type === "Ready" && condition.status === "True") ||
    (condition.type !== "Ready" && condition.status === "False");

  const variant = isHealthy ? "default" : "destructive";
  const className = isHealthy ? "bg-green-600" : "";

  return (
    <Badge variant={variant} className={`text-xs ${className}`}>
      {condition.type}
      {!isHealthy && `: ${condition.status}`}
    </Badge>
  );
}

function formatBytes(bytes: string): string {
  const num = parseInt(bytes.replace(/[^0-9]/g, ""), 10);
  if (Number.isNaN(num)) return bytes;

  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let value = num;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export function NodeStatusGrid({
  title = "Nodes",
  showHeader = true,
  showTaints = true,
  showLabels: _showLabels = false,
}: NodeStatusGridProps) {
  const { data: nodes, isLoading, error } = useNodes();
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedNode, setSelectedNode] = useState<KubernetesNode | null>(null);

  // Filtered nodes based on search
  const filteredNodes = useMemo(() => {
    if (!(nodes && searchFilter)) return nodes || [];

    const filter = searchFilter.toLowerCase();
    return nodes.filter(
      (node) =>
        node.name.toLowerCase().includes(filter) ||
        node.roles.some((role) => role.toLowerCase().includes(filter)) ||
        node.status.toLowerCase().includes(filter)
    );
  }, [nodes, searchFilter]);

  if (isLoading) {
    return (
      <div className="px-6 py-4">
        {showHeader && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (error || !nodes) {
    return (
      <div className="px-6 py-4">
        {showHeader && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-red-600 font-medium">Failed to load nodes</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {error?.message || "Unable to fetch node information"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const healthyNodes = nodes.filter((n) => n.status === "Ready").length;

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        {showHeader && (
          <div className="flex items-center justify-between px-6 py-3 border-b bg-background">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">{title}</h2>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  <Server className="mr-1 h-3 w-3" />
                  {nodes.length} nodes
                </Badge>
                <Badge
                  variant={healthyNodes === nodes.length ? "default" : "destructive"}
                  className={healthyNodes === nodes.length ? "bg-green-600" : ""}
                >
                  {healthyNodes} healthy
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-6 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search nodes by name, role, or status..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>

        {/* Nodes Table */}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>CPU</TableHead>
                <TableHead>Memory</TableHead>
                <TableHead>Pods</TableHead>
                <TableHead>Conditions</TableHead>
                {showTaints && <TableHead>Taints</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showTaints ? 9 : 8} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {searchFilter ? "No nodes match your search" : "No nodes found"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredNodes.map((node) => {
                  const _cpuPercent =
                    node.capacity.cpu && node.allocatable.cpu
                      ? ((parseFloat(node.capacity.cpu) - parseFloat(node.allocatable.cpu)) /
                          parseFloat(node.capacity.cpu)) *
                        100
                      : 0;

                  return (
                    <TableRow
                      key={node.name}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedNode(node)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <NodeStatusIcon status={node.status} />
                          <span className="text-sm font-medium">{node.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{node.name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {node.roles.map((role) => (
                            <Badge key={role} variant="outline" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{node.version}</TableCell>
                      <TableCell className="text-sm">
                        {node.allocatable.cpu} / {node.capacity.cpu}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatBytes(node.allocatable.memory)} / {formatBytes(node.capacity.memory)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {node.allocatable.pods} / {node.capacity.pods}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap max-w-xs">
                          {node.conditions
                            .filter(
                              (c) =>
                                (c.type === "Ready" && c.status === "True") ||
                                (c.type !== "Ready" && c.status !== "False")
                            )
                            .slice(0, 3)
                            .map((condition) => (
                              <NodeConditionBadge key={condition.type} condition={condition} />
                            ))}
                        </div>
                      </TableCell>
                      {showTaints && (
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            0 taints
                          </Badge>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Node Detail Dialog */}
      <Dialog open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              {selectedNode?.name}
            </DialogTitle>
            <DialogDescription>Node Details and Status</DialogDescription>
          </DialogHeader>
          {selectedNode && (
            <div className="space-y-6">
              {/* Status Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <div className="flex items-center gap-2 mt-1">
                    <NodeStatusIcon status={selectedNode.status} />
                    <span className="font-medium">{selectedNode.status}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Roles</div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {selectedNode.roles.map((role) => (
                      <Badge key={role} variant="outline">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Version</div>
                  <div className="mt-1 text-sm">{selectedNode.version}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Internal IP</div>
                  <div className="mt-1 text-sm font-mono">{selectedNode.internalIP}</div>
                </div>
              </div>

              {/* Resource Capacity */}
              <div>
                <h3 className="text-sm font-medium mb-3">Resource Capacity</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Cpu className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">CPU</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Allocatable: {selectedNode.allocatable.cpu}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Capacity: {selectedNode.capacity.cpu}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MemoryStick className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Memory</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Allocatable: {formatBytes(selectedNode.allocatable.memory)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Capacity: {formatBytes(selectedNode.capacity.memory)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <HardDrive className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">Pods</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Allocatable: {selectedNode.allocatable.pods}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Capacity: {selectedNode.capacity.pods}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <HardDrive className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">Storage</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Allocatable: {formatBytes(selectedNode.allocatable.ephemeralStorage)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Capacity: {formatBytes(selectedNode.capacity.ephemeralStorage)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Node Conditions */}
              <div>
                <h3 className="text-sm font-medium mb-3">Node Conditions</h3>
                <div className="space-y-2">
                  {selectedNode.conditions.map((condition) => (
                    <div
                      key={condition.type}
                      className="p-3 bg-muted/30 rounded-md flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{condition.type}</span>
                          <NodeConditionBadge condition={condition} />
                        </div>
                        {condition.message && (
                          <p className="text-xs text-muted-foreground mt-1">{condition.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Info */}
              <div>
                <h3 className="text-sm font-medium mb-3">System Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">OS:</span>{" "}
                    <span className="font-mono">{selectedNode.osImage}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Kernel:</span>{" "}
                    <span className="font-mono">{selectedNode.kernelVersion}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Container Runtime:</span>{" "}
                    <span className="font-mono">{selectedNode.containerRuntime}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
