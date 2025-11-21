"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Database,
  ExternalLink,
  Loader2,
  RefreshCw,
  Server,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface DataSource {
  context?: string;
  server?: string;
  connected: boolean;
  error?: string;
}

interface PrometheusSource {
  url: string;
  healthy: boolean;
  version?: string;
  error?: string;
}

interface VictoriaMetricsSource {
  url: string;
}

interface GrafanaSource {
  url: string;
  configured: boolean;
}

interface DataSourcesResponse {
  success: boolean;
  data: {
    kubernetes: DataSource;
    prometheus: PrometheusSource;
    victoriaMetrics?: VictoriaMetricsSource;
    grafana?: GrafanaSource;
  };
  timestamp: string;
}

function getStatusBadge(connected: boolean) {
  return connected ? (
    <Badge className="bg-green-600">Connected</Badge>
  ) : (
    <Badge variant="destructive">Disconnected</Badge>
  );
}

interface DataSourceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  required: boolean;
  children: React.ReactNode;
}

function DataSourceCard({ icon, title, description, required, children }: DataSourceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
          <Badge variant="outline" className="text-xs">
            {required ? "Required" : "Optional"}
          </Badge>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

/**
 * Data Sources Panel
 *
 * Displays the status of all configured data sources (Kubernetes, Prometheus,
 * VictoriaMetrics, Grafana) and allows users to test connections.
 *
 * @example
 * <DataSourcesPanel />
 */
export function DataSourcesPanel() {
  const [dataSources, setDataSources] = useState<DataSourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  const fetchDataSources = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/config/datasources");
      const data = await response.json();
      setDataSources(data);
    } catch (error) {
      console.error("Failed to fetch data sources:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDataSources();
  }, [fetchDataSources]);

  const testConnections = async () => {
    setTesting(true);
    await fetchDataSources();
    setTesting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasIssues = !(
    dataSources?.data.kubernetes.connected && dataSources?.data.prometheus.healthy
  );

  return (
    <ScrollArea className="h-[calc(100vh-280px)]">
      <div className="space-y-4 pr-4">
        {/* Status Alert */}
        {hasIssues && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              One or more critical data sources are unavailable. Some features may not work
              correctly.
            </AlertDescription>
          </Alert>
        )}

        {/* Test Connections Button */}
        <Button onClick={testConnections} disabled={testing} variant="outline" className="w-full">
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testing Connections...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Test All Connections
            </>
          )}
        </Button>

        <Separator />

        {/* Kubernetes */}
        <DataSourceCard
          icon={<Server className="h-4 w-4" />}
          title="Kubernetes"
          description="Cluster API connection"
          required
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            {getStatusBadge(dataSources?.data.kubernetes.connected ?? false)}
          </div>

          {dataSources?.data.kubernetes.context && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Context</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {dataSources.data.kubernetes.context}
              </code>
            </div>
          )}

          {dataSources?.data.kubernetes.server && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Server</span>
              <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px]">
                {dataSources.data.kubernetes.server}
              </code>
            </div>
          )}

          {dataSources?.data.kubernetes.error && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">
                {dataSources.data.kubernetes.error}
              </AlertDescription>
            </Alert>
          )}
        </DataSourceCard>

        {/* Prometheus */}
        <DataSourceCard
          icon={<Activity className="h-4 w-4" />}
          title="Prometheus"
          description="Metrics and monitoring data"
          required
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            {getStatusBadge(dataSources?.data.prometheus.healthy ?? false)}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">URL</span>
            <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px]">
              {dataSources?.data.prometheus.url}
            </code>
          </div>

          {dataSources?.data.prometheus.version && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Version</span>
              <span className="text-xs">{dataSources.data.prometheus.version}</span>
            </div>
          )}

          {dataSources?.data.prometheus.error && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">
                {dataSources.data.prometheus.error}
              </AlertDescription>
            </Alert>
          )}
        </DataSourceCard>

        {/* VictoriaMetrics */}
        {dataSources?.data.victoriaMetrics && (
          <DataSourceCard
            icon={<BarChart3 className="h-4 w-4" />}
            title="VictoriaMetrics"
            description="Alternative metrics storage"
            required={false}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">URL</span>
              <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px]">
                {dataSources.data.victoriaMetrics.url}
              </code>
            </div>
          </DataSourceCard>
        )}

        {/* Grafana */}
        {dataSources?.data.grafana && (
          <DataSourceCard
            icon={<Database className="h-4 w-4" />}
            title="Grafana"
            description="Dashboard integration"
            required={false}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={dataSources.data.grafana.configured ? "default" : "outline"}>
                {dataSources.data.grafana.configured ? "Configured" : "Not Configured"}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">URL</span>
              <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px]">
                {dataSources.data.grafana.url}
              </code>
            </div>

            {!dataSources.data.grafana.configured && (
              <Alert>
                <AlertDescription className="text-xs">
                  API key not configured. Some features may be limited.
                </AlertDescription>
              </Alert>
            )}
          </DataSourceCard>
        )}

        {/* Configuration Help */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Data sources are configured via environment variables. See the documentation for
              details.
            </p>

            <div className="flex gap-2">
              <Link href="/setup" className="flex-1">
                <Button variant="outline" className="w-full" size="sm">
                  <Server className="h-3 w-3 mr-2" />
                  Setup Wizard
                </Button>
              </Link>
              <a
                href="https://github.com/Kadajett/PodScope#readme"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" className="w-full" size="sm">
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Documentation
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Last Updated */}
        {dataSources?.timestamp && (
          <p className="text-xs text-muted-foreground text-center pb-4">
            Last checked: {new Date(dataSources.timestamp).toLocaleString()}
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
