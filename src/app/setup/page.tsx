"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  Server,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

type ServiceStatus = "up" | "down" | "not_configured";

function getStatusIcon(status: ServiceStatus) {
  switch (status) {
    case "up":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "down":
      return <XCircle className="h-5 w-5 text-red-500" />;
    case "not_configured":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  }
}

function getStatusBadge(status: ServiceStatus) {
  switch (status) {
    case "up":
      return (
        <Badge variant="default" className="bg-green-600">
          Connected
        </Badge>
      );
    case "down":
      return <Badge variant="destructive">Disconnected</Badge>;
    case "not_configured":
      return <Badge variant="outline">Optional</Badge>;
  }
}

interface ServiceStatusItemProps {
  icon: React.ReactNode;
  name: string;
  required: boolean;
  status: ServiceStatus;
  message?: string;
}

function ServiceStatusItem({ icon, name, required, status, message }: ServiceStatusItemProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        {getStatusIcon(status)}
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium">{name}</span>
            <Badge variant="outline" className="text-xs">
              {required ? "Required" : "Optional"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{message || "Not configured"}</p>
        </div>
      </div>
      {getStatusBadge(status)}
    </div>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Configuration state (in a real app, this would be persisted)
  const [prometheusUrl, setPrometheusUrl] = useState(process.env.NEXT_PUBLIC_PROMETHEUS_URL || "");

  const checkHealth = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/health");
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      console.error("Health check failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const testConnection = async () => {
    setTesting(true);
    await checkHealth();
    setTesting(false);
  };

  const calculateProgress = () => {
    if (!health) return 0;

    const checks = [
      health.checks.prometheus.status === "up" ? 50 : 0,
      health.checks.kubernetes.status === "up" ? 50 : 0,
    ];

    return checks.reduce((sum, val) => sum + val, 0);
  };

  const canProceed =
    health?.checks.prometheus.status === "up" && health?.checks.kubernetes.status === "up";

  const hasWarnings = health?.checks.redis?.status === "not_configured";

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Checking system health...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Welcome to PodScope</h1>
          <p className="text-muted-foreground">
            Let&apos;s get your Kubernetes monitoring dashboard set up
          </p>
        </div>

        {/* Overall Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              {health?.status === "healthy" && "All critical services are operational"}
              {health?.status === "degraded" && "Some services need attention"}
              {health?.status === "unhealthy" && "Critical services are unavailable"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Setup Progress</span>
                <span>{calculateProgress()}%</span>
              </div>
              <Progress value={calculateProgress()} />
            </div>

            {health?.status === "unhealthy" && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  PodScope requires both Prometheus and Kubernetes to be accessible. Please
                  configure these services below.
                </AlertDescription>
              </Alert>
            )}

            {health?.status === "healthy" && hasWarnings && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Optional services are not configured. You can still use PodScope, but some
                  features may be limited.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Configuration Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="prometheus">Prometheus</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Service Status</CardTitle>
                <CardDescription>Current status of all monitored services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ServiceStatusItem
                  icon={<Activity className="h-4 w-4" />}
                  name="Prometheus"
                  required
                  status={health?.checks.prometheus.status || "down"}
                  message={health?.checks.prometheus.message}
                />

                <ServiceStatusItem
                  icon={<Server className="h-4 w-4" />}
                  name="Kubernetes"
                  required
                  status={health?.checks.kubernetes.status || "down"}
                  message={health?.checks.kubernetes.message}
                />

                {health?.checks.redis && (
                  <ServiceStatusItem
                    icon={<Database className="h-4 w-4" />}
                    name="Redis / BullMQ"
                    required={false}
                    status={health.checks.redis.status}
                    message={health.checks.redis.message || "For queue monitoring"}
                  />
                )}
              </CardContent>
              <CardFooter>
                <Button
                  onClick={testConnection}
                  disabled={testing}
                  variant="outline"
                  className="w-full"
                >
                  {testing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Recheck Status
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="prometheus" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Prometheus Configuration</CardTitle>
                <CardDescription>
                  Configure your Prometheus or VictoriaMetrics endpoint
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Activity className="h-4 w-4" />
                  <AlertDescription>
                    Prometheus configuration is set via environment variables. Update your{" "}
                    <code className="px-1 py-0.5 bg-muted rounded text-xs">PROMETHEUS_URL</code>{" "}
                    environment variable and restart the application.
                  </AlertDescription>
                </Alert>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="prometheus-url">Prometheus URL</Label>
                  <Input
                    id="prometheus-url"
                    placeholder="http://prometheus:9090"
                    value={prometheusUrl}
                    onChange={(e) => setPrometheusUrl(e.target.value)}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Current value from environment: {prometheusUrl || "Not set"}
                  </p>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">For Kubernetes deployments:</p>
                  <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                    {`# ConfigMap or values.yaml
PROMETHEUS_URL: "http://prometheus.monitoring.svc:9090"`}
                  </pre>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">For local development:</p>
                  <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                    {`# .env.local
PROMETHEUS_URL=http://localhost:9090`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Configuration</CardTitle>
                <CardDescription>Optional services and advanced settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Advanced configuration options are set via environment variables. See the{" "}
                    <a
                      href="https://github.com/Kadajett/PodScope#readme"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      documentation
                    </a>{" "}
                    for details on configuring Redis, VictoriaMetrics, and Grafana integration.
                  </AlertDescription>
                </Alert>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Redis / BullMQ Monitoring</h3>
                    <p className="text-sm text-muted-foreground">
                      Monitor job queues by setting{" "}
                      <code className="px-1 py-0.5 bg-muted rounded text-xs">REDIS_INSTANCES</code>
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">VictoriaMetrics</h3>
                    <p className="text-sm text-muted-foreground">
                      Use VictoriaMetrics instead of Prometheus by setting{" "}
                      <code className="px-1 py-0.5 bg-muted rounded text-xs">
                        VICTORIA_METRICS_URL
                      </code>
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Grafana Integration</h3>
                    <p className="text-sm text-muted-foreground">
                      Enable Grafana features with{" "}
                      <code className="px-1 py-0.5 bg-muted rounded text-xs">GRAFANA_URL</code> and{" "}
                      <code className="px-1 py-0.5 bg-muted rounded text-xs">GRAFANA_API_KEY</code>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <Card>
          <CardFooter className="flex justify-between pt-6">
            <Button variant="outline" onClick={() => router.push("/")}>
              Skip Setup
            </Button>

            <Button onClick={() => router.push("/")} disabled={!canProceed}>
              Continue to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>

        {/* Help Text */}
        <p className="text-center text-sm text-muted-foreground">
          Need help? Check the{" "}
          <a
            href="https://github.com/Kadajett/PodScope#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            documentation
          </a>{" "}
          or{" "}
          <a
            href="https://github.com/Kadajett/PodScope/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            report an issue
          </a>
        </p>
      </div>
    </div>
  );
}
