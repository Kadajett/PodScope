"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useKubernetesEvents, useNamespaces } from "@/hooks/use-kubernetes";
import type { KubernetesEvent } from "@/types/kubernetes";

interface EventStreamViewerProps {
  title?: string;
  namespace?: string;
  eventTypes?: string[];
  limit?: number;
  autoScroll?: boolean;
  showFilters?: boolean;
  showHeader?: boolean;
}

function EventTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "Normal":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "Warning":
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case "Error":
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Activity className="h-4 w-4 text-gray-600" />;
  }
}

function EventTypeBadge({ type }: { type: string }) {
  const variant = type === "Normal" ? "default" : type === "Warning" ? "secondary" : "destructive";
  const className =
    type === "Normal" ? "bg-green-600" : type === "Warning" ? "bg-yellow-600 text-white" : "";

  return (
    <Badge variant={variant} className={className}>
      {type}
    </Badge>
  );
}

export function EventStreamViewer({
  title = "Events",
  namespace: defaultNamespace = "all",
  eventTypes = [],
  limit = 100,
  autoScroll: initialAutoScroll = true,
  showFilters = true,
  showHeader = true,
}: EventStreamViewerProps) {
  const [selectedNamespace, setSelectedNamespace] = useState(
    defaultNamespace === "all" ? undefined : defaultNamespace
  );
  const [selectedEventType, setSelectedEventType] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [autoScroll, setAutoScroll] = useState(initialAutoScroll);
  const [selectedEvent, setSelectedEvent] = useState<KubernetesEvent | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousEventCountRef = useRef(0);

  const { data: namespacesData } = useNamespaces();
  const {
    data: eventsData,
    isLoading,
    error,
  } = useKubernetesEvents(
    selectedNamespace,
    selectedEventType === "all" ? undefined : selectedEventType,
    limit
  );

  const events = eventsData?.events || [];

  // Filtered events based on search
  const filteredEvents = useMemo(() => {
    if (!searchFilter) return events;

    const filter = searchFilter.toLowerCase();
    return events.filter(
      (event) =>
        event.reason.toLowerCase().includes(filter) ||
        event.message.toLowerCase().includes(filter) ||
        event.involvedObject.name.toLowerCase().includes(filter) ||
        event.namespace.toLowerCase().includes(filter) ||
        event.involvedObject.kind.toLowerCase().includes(filter)
    );
  }, [events, searchFilter]);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current && events.length > previousEventCountRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    previousEventCountRef.current = events.length;
  }, [events.length, autoScroll]);

  // Apply event type filter from props
  useEffect(() => {
    if (eventTypes.length > 0 && eventTypes.length < 3) {
      // If specific types are configured, default to first one
      setSelectedEventType(eventTypes[0]);
    }
  }, [eventTypes]);

  if (isLoading) {
    return (
      <div className="px-6 py-4">
        {showHeader && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-4">
        {showHeader && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-red-600 font-medium">Failed to load events</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Event type counts
  const eventCounts = events.reduce(
    (acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        {showHeader && (
          <div className="flex items-center justify-between px-6 py-3 border-b bg-background">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">{title}</h2>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  <Activity className="mr-1 h-3 w-3" />
                  {events.length} events
                </Badge>
                {eventCounts.Normal > 0 && (
                  <Badge variant="default" className="bg-green-600 text-xs">
                    {eventCounts.Normal} Normal
                  </Badge>
                )}
                {eventCounts.Warning > 0 && (
                  <Badge variant="secondary" className="bg-yellow-600 text-white text-xs">
                    {eventCounts.Warning} Warning
                  </Badge>
                )}
                {eventCounts.Error > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {eventCounts.Error} Error
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="px-6 py-3 border-b space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {/* Namespace Filter */}
              <div>
                <Select
                  value={selectedNamespace || "all"}
                  onValueChange={(value) =>
                    setSelectedNamespace(value === "all" ? undefined : value)
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Namespace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Namespaces</SelectItem>
                    {namespacesData?.map((ns) => (
                      <SelectItem key={ns.name} value={ns.name}>
                        {ns.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Event Type Filter */}
              <div>
                <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Warning">Warning</SelectItem>
                    <SelectItem value="Error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Auto-scroll Toggle */}
              <Button
                variant={autoScroll ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoScroll(!autoScroll)}
                className="h-9"
              >
                <Clock className="mr-2 h-4 w-4" />
                {autoScroll ? "Auto-scroll On" : "Auto-scroll Off"}
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events by reason, message, object, or namespace..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
          </div>
        )}

        {/* Events List */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto"
          style={{ scrollBehavior: autoScroll ? "smooth" : "auto" }}
        >
          {filteredEvents.length === 0 ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center">
                <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  {searchFilter ? "No events match your search" : "No events found"}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {filteredEvents.map((event, index) => {
                const relativeTime = event.lastTimestamp
                  ? formatDistanceToNow(new Date(event.lastTimestamp), {
                      addSuffix: true,
                    })
                  : "unknown";

                return (
                  <button
                    type="button"
                    key={`${event.namespace}-${event.involvedObject.name}-${event.reason}-${index}`}
                    className="w-full px-6 py-3 hover:bg-muted/50 cursor-pointer transition-colors text-left"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <EventTypeIcon type={event.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{event.reason}</span>
                          <EventTypeBadge type={event.type} />
                          {event.count > 1 && (
                            <Badge variant="outline" className="text-xs">
                              {event.count}x
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{event.message}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>
                            {event.involvedObject.kind}: {event.involvedObject.name}
                          </span>
                          <span>•</span>
                          <span>{event.namespace}</span>
                          <span>•</span>
                          <span>{relativeTime}</span>
                          {event.source.component && (
                            <>
                              <span>•</span>
                              <span>{event.source.component}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <EventTypeIcon type={selectedEvent?.type || "Normal"} />
              {selectedEvent?.reason}
            </DialogTitle>
            <DialogDescription>Event Details</DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Type</div>
                  <div className="mt-1">
                    <EventTypeBadge type={selectedEvent.type} />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Count</div>
                  <div className="mt-1 text-sm">{selectedEvent.count}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Namespace</div>
                  <div className="mt-1 text-sm">{selectedEvent.namespace}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Object</div>
                  <div className="mt-1 text-sm">
                    {selectedEvent.involvedObject.kind}: {selectedEvent.involvedObject.name}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Source</div>
                  <div className="mt-1 text-sm">
                    {selectedEvent.source.component}
                    {selectedEvent.source.host && ` (${selectedEvent.source.host})`}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Last Seen</div>
                  <div className="mt-1 text-sm">
                    {selectedEvent.lastTimestamp
                      ? formatDistanceToNow(new Date(selectedEvent.lastTimestamp), {
                          addSuffix: true,
                        })
                      : "unknown"}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Message</div>
                <div className="p-3 bg-muted/50 rounded-md text-sm font-mono whitespace-pre-wrap">
                  {selectedEvent.message}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">First Timestamp:</span>{" "}
                  {new Date(selectedEvent.firstTimestamp).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Last Timestamp:</span>{" "}
                  {new Date(selectedEvent.lastTimestamp).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
