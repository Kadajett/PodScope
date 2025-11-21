"use client";

import { AlertTriangle, ChevronDown, ChevronUp, Settings, X, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    prometheus: {
      status: "up" | "down";
      message?: string;
    };
    kubernetes: {
      status: "up" | "down";
      message?: string;
    };
    redis?: {
      status: "up" | "down" | "not_configured";
      message?: string;
    };
  };
}

interface HealthBannerProps {
  /**
   * How often to check health status (in milliseconds)
   * @default 60000 (1 minute)
   */
  checkInterval?: number;

  /**
   * Whether to show the banner even when all services are healthy
   * @default false
   */
  alwaysShow?: boolean;
}

function getHealthDescription(health: HealthCheck | null): string {
  if (health?.status === "unhealthy") {
    const downServices = [];
    if (health.checks.prometheus.status === "down") downServices.push("Prometheus");
    if (health.checks.kubernetes.status === "down") downServices.push("Kubernetes");

    return `${downServices.join(" and ")} ${downServices.length === 1 ? "is" : "are"} not accessible. Some features may not work correctly.`;
  }

  if (health?.status === "degraded") {
    return "Optional services are not configured. Core functionality is available.";
  }

  return "All services are operating normally.";
}

function ServiceStatusDetails({ health }: { health: HealthCheck }) {
  return (
    <div className="space-y-2 mt-3 pt-3 border-t">
      {/* Prometheus Status */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Prometheus</span>
        <div className="flex items-center gap-2">
          <Badge
            variant={health?.checks.prometheus.status === "up" ? "default" : "destructive"}
            className="text-xs"
          >
            {health?.checks.prometheus.status}
          </Badge>
          {health?.checks.prometheus.message && (
            <span className="text-xs text-muted-foreground">
              {health.checks.prometheus.message}
            </span>
          )}
        </div>
      </div>

      {/* Kubernetes Status */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Kubernetes</span>
        <div className="flex items-center gap-2">
          <Badge
            variant={health?.checks.kubernetes.status === "up" ? "default" : "destructive"}
            className="text-xs"
          >
            {health?.checks.kubernetes.status}
          </Badge>
          {health?.checks.kubernetes.message && (
            <span className="text-xs text-muted-foreground">
              {health.checks.kubernetes.message}
            </span>
          )}
        </div>
      </div>

      {/* Redis Status */}
      {health?.checks.redis && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Redis / BullMQ</span>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                health.checks.redis.status === "up"
                  ? "default"
                  : health.checks.redis.status === "not_configured"
                    ? "outline"
                    : "destructive"
              }
              className="text-xs"
            >
              {health.checks.redis.status}
            </Badge>
            {health.checks.redis.message && (
              <span className="text-xs text-muted-foreground">{health.checks.redis.message}</span>
            )}
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground pt-2">
        Last checked:{" "}
        {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : "Unknown"}
      </div>
    </div>
  );
}

/**
 * Health Status Banner
 *
 * Displays a banner at the top of the dashboard when critical services
 * are unavailable or degraded. Provides quick access to configuration
 * and detailed service status information.
 *
 * @example
 * <HealthBanner checkInterval={30000} />
 */
export function HealthBanner({ checkInterval = 60000, alwaysShow = false }: HealthBannerProps) {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch("/api/health");
      const data = await response.json();
      setHealth(data);

      // Reset dismissal if critical services are down
      if (data.status === "unhealthy") {
        setDismissed(false);
      }
    } catch (error) {
      console.error("Health check failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();

    // Set up periodic health checks
    const interval = setInterval(checkHealth, checkInterval);

    return () => clearInterval(interval);
  }, [checkInterval, checkHealth]);

  // Don't show banner if:
  // 1. Still loading
  // 2. User dismissed it
  // 3. All services healthy and alwaysShow is false
  if (loading) return null;
  if (dismissed) return null;
  if (!alwaysShow && health?.status === "healthy") return null;

  const statusConfig = {
    unhealthy: {
      variant: "destructive" as const,
      icon: <XCircle className="h-4 w-4" />,
      title: "Critical Services Unavailable",
    },
    degraded: {
      variant: "default" as const,
      icon: <AlertTriangle className="h-4 w-4" />,
      title: "Some Services Need Attention",
    },
    healthy: {
      variant: "default" as const,
      icon: <AlertTriangle className="h-4 w-4" />,
      title: "All Systems Operational",
    },
  };

  const config = statusConfig[health?.status || "healthy"];

  return (
    <div className="px-4 pt-4">
      <Alert variant={config.variant} className="relative">
        <div className="flex items-start gap-3">
          {config.icon}
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{config.title}</span>
                {health?.status && (
                  <Badge
                    variant={health.status === "unhealthy" ? "destructive" : "outline"}
                    className="text-xs"
                  >
                    {health.status}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Link href="/setup">
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    <Settings className="h-3 w-3 mr-1" />
                    Configure
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDismissed(true)}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <AlertDescription className="text-sm">{getHealthDescription(health)}</AlertDescription>

            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 mt-2 text-xs">
                  {expanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show Details
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {health && <ServiceStatusDetails health={health} />}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </Alert>
    </div>
  );
}
