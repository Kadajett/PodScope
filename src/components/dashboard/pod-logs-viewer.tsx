"use client";

import { RefreshCw, Terminal } from "lucide-react";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { usePodLogs } from "@/hooks/use-kubernetes";

interface PodLogsViewerProps {
  podName: string;
  namespace: string;
  maxHeight?: string;
}

export function PodLogsViewer({ podName, namespace, maxHeight = "300px" }: PodLogsViewerProps) {
  const { data, isLoading, isFetching, error } = usePodLogs(podName, namespace);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-500">Failed to load logs: {error.message}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Logs</span>
          <Badge variant="outline" className="text-xs">
            {data?.lineCount || 0} lines
          </Badge>
        </div>
        {isFetching && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>

      <ScrollArea className="rounded-md border bg-black/90 p-3" style={{ height: maxHeight }}>
        <div ref={scrollRef} className="font-mono text-xs text-green-400">
          {data?.logs && data.logs.length > 0 ? (
            data.logs.map((line, i) => (
              <div
                key={`${i}-${line.substring(0, 50)}`}
                className="whitespace-pre-wrap break-all py-0.5"
              >
                {line}
              </div>
            ))
          ) : (
            <div className="text-muted-foreground">No logs available</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
