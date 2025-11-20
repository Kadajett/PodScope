import { NextResponse } from "next/server";
import { getClusterInfo } from "@/lib/kubernetes";
import { getHealth } from "@/lib/prometheus";

/**
 * Health Check Endpoint
 *
 * Provides a lightweight health check for monitoring systems and Kubernetes probes.
 * Returns 200 if critical services are operational, 503 otherwise.
 *
 * Critical services:
 * - Prometheus (required for metrics)
 * - Kubernetes API (required for cluster data)
 *
 * Optional services (warnings only):
 * - Redis/BullMQ (queue monitoring)
 */

interface HealthCheckResult {
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

export async function GET() {
  const timestamp = new Date().toISOString();

  const result: HealthCheckResult = {
    status: "healthy",
    timestamp,
    checks: {
      prometheus: { status: "down" },
      kubernetes: { status: "down" },
    },
  };

  let criticalFailure = false;

  // Check Prometheus (critical)
  try {
    const health = await getHealth();
    if (health.healthy) {
      result.checks.prometheus.status = "up";
      result.checks.prometheus.message = health.version
        ? `Prometheus ${health.version}`
        : "Connected";
    } else {
      result.checks.prometheus.status = "down";
      result.checks.prometheus.message = health.error || "Health check failed";
      criticalFailure = true;
    }
  } catch (error) {
    result.checks.prometheus.status = "down";
    result.checks.prometheus.message = error instanceof Error ? error.message : "Connection failed";
    criticalFailure = true;
  }

  // Check Kubernetes (critical)
  try {
    const clusterInfo = await getClusterInfo();
    result.checks.kubernetes.status = "up";
    result.checks.kubernetes.message = `Connected to ${clusterInfo.context}`;
  } catch (error) {
    result.checks.kubernetes.status = "down";
    result.checks.kubernetes.message = error instanceof Error ? error.message : "Connection failed";
    criticalFailure = true;
  }

  // Check Redis (optional - warning only, not critical)
  const redisInstances = process.env.REDIS_INSTANCES;
  if (redisInstances) {
    // Redis is configured, but we don't have a simple health check yet
    // This is a placeholder for future enhancement
    const instanceCount = redisInstances.split(",").length;
    result.checks.redis = {
      status: "not_configured",
      message: `${instanceCount} instance(s) configured`,
    };
  }

  // Set overall status
  if (criticalFailure) {
    result.status = "unhealthy";
    return NextResponse.json(result, { status: 503 });
  }

  // Degraded if optional services are down (future enhancement)
  // For now, we only have critical services

  return NextResponse.json(result, { status: 200 });
}
