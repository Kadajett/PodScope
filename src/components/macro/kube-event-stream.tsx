"use client";

import type { z } from "zod";
import { EventStreamViewer } from "@/components/dashboard/event-stream-viewer";
import type { EventStreamComponentConfigSchema } from "@/config/schema";

/**
 * Kubernetes Event Stream Macro Component
 * Wraps the EventStreamViewer component with config-driven behavior
 *
 * This component displays real-time Kubernetes events with filtering and search.
 * It can be configured to:
 * - Filter by namespace
 * - Filter by event types (Normal, Warning, Error)
 * - Limit the number of events displayed
 * - Auto-scroll to new events
 * - Show/hide filter controls
 * - Customize the title
 *
 * Config options:
 * - namespace: Namespace filter (default: "all" - shows all namespaces)
 *   Example: "kube-system", "default", "production"
 * - eventTypes: Array of event types to filter (default: [] - shows all types)
 *   Example: ["Warning", "Error"] to only show warnings and errors
 * - limit: Maximum number of events to fetch (default: 100)
 *   Example: 200, 500
 * - autoScroll: Enable auto-scrolling to new events (default: true)
 * - showFilters: Show/hide the filter controls (default: true)
 * - title: Component title (default: "Events")
 * - showHeader: Show/hide the header bar (default: true)
 *
 * Example configuration:
 * {
 *   "title": "Production Errors",
 *   "namespace": "production",
 *   "eventTypes": ["Error"],
 *   "limit": 50,
 *   "autoScroll": true,
 *   "showFilters": false,
 *   "showHeader": true
 * }
 */

type KubeEventStreamProps = z.infer<typeof EventStreamComponentConfigSchema>;

export function KubeEventStream(props: KubeEventStreamProps) {
  const {
    title = "Events",
    namespace = "all",
    eventTypes = [],
    limit = 100,
    autoScroll = true,
    showFilters = true,
    showHeader = true,
  } = props;

  return (
    <EventStreamViewer
      title={title}
      namespace={namespace}
      eventTypes={eventTypes}
      limit={limit}
      autoScroll={autoScroll}
      showFilters={showFilters}
      showHeader={showHeader}
    />
  );
}
