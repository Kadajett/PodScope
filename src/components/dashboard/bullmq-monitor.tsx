"use client";

import { AlertTriangle, CheckCircle2, Clock, Database, ListTodo, XCircle, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import type { AxisOptions } from "react-charts";
import { Chart } from "react-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { getQueueHealth, type RedisConnectionConfig, useBullMQOverview } from "@/hooks/use-bullmq";
import type { QueueStats } from "@/types/bullmq";

/**
 * BullMQ Monitor Props
 *
 * Connection config can be provided in several ways:
 * 1. Direct instances: { instances: [{ host: "localhost", port: 6379 }] }
 * 2. Env var reference: { envVar: "MY_REDIS_URL" }
 * 3. Use default env: { useEnv: true } or omit connection config
 *
 * Example config in dashboard JSON:
 * {
 *   "component": "BullMQMonitor",
 *   "config": {
 *     "title": "My Queues",
 *     "connection": {
 *       "instances": [
 *         { "name": "prod", "host": "redis.example.com", "port": 6379, "password": "secret" }
 *       ]
 *     }
 *   }
 * }
 */
export interface BullMQMonitorProps {
  title?: string;
  showHeader?: boolean;
  connection?: RedisConnectionConfig;
}

type QueueChartDatum = {
  status: string;
  count: number;
};

type QueueChartSeries = {
  label: string;
  data: QueueChartDatum[];
};

function QueueCard({ queue, onClick }: { queue: QueueStats; onClick: () => void }) {
  const health = getQueueHealth(queue);
  const _totalActive = queue.counts.waiting + queue.counts.active;

  return (
    <button
      type="button"
      className="p-3 bg-muted/30 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm font-medium">{queue.name}</span>
        </div>
        <Badge
          variant={
            health === "healthy" ? "default" : health === "warning" ? "secondary" : "destructive"
          }
          className={`text-xs ${health === "healthy" ? "bg-green-600" : health === "warning" ? "bg-yellow-600" : ""}`}
        >
          {health === "healthy" ? (
            <CheckCircle2 className="mr-1 h-3 w-3" />
          ) : health === "warning" ? (
            <AlertTriangle className="mr-1 h-3 w-3" />
          ) : (
            <XCircle className="mr-1 h-3 w-3" />
          )}
          {health}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-yellow-500" />
          <span>{queue.counts.waiting} waiting</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3 text-blue-500" />
          <span>{queue.counts.active} active</span>
        </div>
        <div className="flex items-center gap-1">
          <XCircle className="h-3 w-3 text-red-500" />
          <span>{queue.counts.failed} failed</span>
        </div>
      </div>

      <div className="mt-2">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Completed</span>
          <span>{queue.counts.completed}</span>
        </div>
        <Progress
          value={queue.totalJobs > 0 ? (queue.counts.completed / queue.totalJobs) * 100 : 0}
          className="h-1"
        />
      </div>

      {queue.failureRate > 0 && (
        <div className="mt-2 text-xs text-red-400">
          Failure rate: {queue.failureRate.toFixed(2)}%
        </div>
      )}
    </button>
  );
}

function QueueDistributionChart({ queues }: { queues: QueueStats[] }) {
  const chartData = useMemo((): QueueChartSeries[] => {
    // Aggregate all queues
    const totals = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };

    queues.forEach((q) => {
      totals.waiting += q.counts.waiting;
      totals.active += q.counts.active;
      totals.completed += q.counts.completed;
      totals.failed += q.counts.failed;
      totals.delayed += q.counts.delayed;
    });

    return [
      {
        label: "Jobs",
        data: [
          { status: "Waiting", count: totals.waiting },
          { status: "Active", count: totals.active },
          { status: "Completed", count: totals.completed },
          { status: "Failed", count: totals.failed },
          { status: "Delayed", count: totals.delayed },
        ],
      },
    ];
  }, [queues]);

  const primaryAxis = useMemo(
    (): AxisOptions<QueueChartDatum> => ({
      getValue: (datum) => datum.status,
      scaleType: "band",
    }),
    []
  );

  const secondaryAxes = useMemo(
    (): AxisOptions<QueueChartDatum>[] => [
      {
        getValue: (datum) => datum.count,
        elementType: "bar",
        min: 0,
      },
    ],
    []
  );

  if (chartData[0].data.every((d) => d.count === 0)) {
    return (
      <div className="h-[120px] flex items-center justify-center text-sm text-muted-foreground border rounded">
        No job data available
      </div>
    );
  }

  return (
    <div style={{ height: "120px" }}>
      <Chart
        options={{
          data: chartData,
          primaryAxis,
          secondaryAxes,
          dark: true,
        }}
      />
    </div>
  );
}

export function BullMQMonitor({ title = "BullMQ Queues", connection }: BullMQMonitorProps) {
  const { data: overviews, isLoading, error } = useBullMQOverview(connection);
  const [selectedQueue, setSelectedQueue] = useState<QueueStats | null>(null);

  if (isLoading) {
    return (
      <div className="px-6 py-4">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <div className="space-y-4">
          <Skeleton className="h-[100px]" />
          <Skeleton className="h-[120px]" />
        </div>
      </div>
    );
  }

  if (error || !overviews || overviews.length === 0) {
    return (
      <div className="px-6 py-4">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-yellow-600" />
              <span className="text-yellow-600 font-medium">
                {error ? "Connection Failed" : "No Redis Configured"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error
                ? error.message
                : "Set REDIS_INSTANCES in .env.local to monitor BullMQ queues"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use first instance for now (could add instance selector later)
  const instance = overviews[0];

  if (!instance.connected) {
    return (
      <div className="px-6 py-4">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-600 font-medium">Redis Disconnected</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {instance.error || "Failed to connect to Redis instance"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (instance.queues.length === 0) {
    return (
      <div className="px-6 py-4">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">No Queues Found</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              No BullMQ queues discovered in Redis instance &quot;{instance.instance}&quot;
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Badge
            variant="outline"
            className={
              instance.connected ? "border-green-600 text-green-600" : "border-red-600 text-red-600"
            }
          >
            <Database className="mr-1 h-3 w-3" />
            {instance.instance}
          </Badge>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Queues</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold">{instance.totalQueues}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Jobs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold">{instance.totalJobs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-xl font-bold text-blue-500">{instance.totalActive}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Failed</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div
                className={`text-xl font-bold ${instance.totalFailed > 0 ? "text-red-500" : ""}`}
              >
                {instance.totalFailed}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Job Distribution Chart */}
        <div className="mb-4">
          <div className="text-sm font-medium mb-2">Job Distribution</div>
          <QueueDistributionChart queues={instance.queues} />
        </div>

        {/* Queue List */}
        <div>
          <div className="text-sm font-medium mb-2">Queues ({instance.queues.length})</div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {instance.queues.map((queue) => (
              <QueueCard key={queue.name} queue={queue} onClick={() => setSelectedQueue(queue)} />
            ))}
          </div>
        </div>
      </div>

      {/* Queue Detail Sheet */}
      <Sheet open={!!selectedQueue} onOpenChange={() => setSelectedQueue(null)}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle className="font-mono">{selectedQueue?.name}</SheetTitle>
            <SheetDescription>Queue Details and Statistics</SheetDescription>
          </SheetHeader>
          {selectedQueue && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Waiting</div>
                  <div className="text-2xl font-bold text-yellow-500">
                    {selectedQueue.counts.waiting}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Active</div>
                  <div className="text-2xl font-bold text-blue-500">
                    {selectedQueue.counts.active}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Completed</div>
                  <div className="text-2xl font-bold text-green-500">
                    {selectedQueue.counts.completed}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Failed</div>
                  <div className="text-2xl font-bold text-red-500">
                    {selectedQueue.counts.failed}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Delayed</div>
                  <div className="text-2xl font-bold">{selectedQueue.counts.delayed}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Total Jobs</div>
                  <div className="text-2xl font-bold">{selectedQueue.totalJobs}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Failure Rate</div>
                <Progress value={selectedQueue.failureRate} className="h-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedQueue.failureRate.toFixed(2)}%
                </div>
              </div>

              {selectedQueue.isPaused && (
                <div className="p-3 bg-yellow-500/20 rounded-md">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-500">Queue is Paused</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
