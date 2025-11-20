"use client";

import { CheckCircle2, ChevronDown, Server, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useNodes } from "@/hooks/use-kubernetes";

export function ClusterSelectorBar() {
  const { data: nodes, isLoading, error } = useNodes();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-6 py-3 border-b bg-muted/30">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-28" />
      </div>
    );
  }

  if (error || !nodes) {
    return (
      <div className="flex items-center gap-2 px-6 py-3 border-b bg-muted/30">
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Failed to load nodes
        </Badge>
      </div>
    );
  }

  // Show as badges if <=10 nodes, otherwise use dropdown
  const showAsDropdown = nodes.length > 10;

  return (
    <div className="flex items-center gap-2 px-6 py-3 border-b bg-muted/30">
      <span className="text-sm font-medium text-muted-foreground">Nodes ({nodes.length}):</span>

      {showAsDropdown ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7">
              <Server className="mr-2 h-3 w-3" />
              {nodes[0]?.name || "Select Node"}
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-[300px] overflow-y-auto">
            {nodes.map((node) => (
              <DropdownMenuItem key={node.name}>
                <div className="flex items-center gap-2">
                  {node.status === "Ready" ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-600" />
                  )}
                  <span>{node.name}</span>
                  <span className="text-xs text-muted-foreground">{node.version}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex flex-wrap gap-2">
          {nodes.map((node) => (
            <Badge
              key={node.name}
              variant={node.status === "Ready" ? "default" : "destructive"}
              className="cursor-pointer hover:opacity-80"
            >
              <Server className="mr-1 h-3 w-3" />
              {node.name}
              <span className="ml-2 text-xs opacity-70">
                {node.capacity.cpu} CPU | {node.capacity.memory}
              </span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
