import { type NextRequest, NextResponse } from "next/server";
import { getK8sClient } from "@/lib/kubernetes";
import type { KubernetesApiResponse } from "@/types/kubernetes";

function parseSinceToSeconds(since: string | null): number | undefined {
  if (!since) return undefined;

  const match = since.match(/^(\d+)([hms])$/);
  if (!match) return undefined;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "h":
      return value * 3600;
    case "m":
      return value * 60;
    case "s":
      return value;
    default:
      return undefined;
  }
}

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const searchParams = request.nextUrl.searchParams;
  const podName = searchParams.get("pod");
  const namespace = searchParams.get("namespace");
  const container = searchParams.get("container");
  const tailLines = searchParams.get("tail") || "100";
  const since = searchParams.get("since");

  if (!(podName && namespace)) {
    const response: KubernetesApiResponse<never> = {
      success: false,
      error: "Missing required parameters: pod and namespace",
      timestamp,
    };
    return NextResponse.json(response, { status: 400 });
  }

  try {
    const { k8sApi } = getK8sClient();
    const sinceSeconds = parseSinceToSeconds(since);

    // Read pod logs using K8s API
    const logsResponse = await k8sApi.readNamespacedPodLog({
      name: podName,
      namespace: namespace,
      container: container || undefined,
      tailLines: parseInt(tailLines, 10),
      sinceSeconds: sinceSeconds,
      pretty: "false",
    });

    // Handle response - might be response.body or response directly
    const logData =
      typeof logsResponse === "object" && logsResponse !== null && "body" in logsResponse
        ? logsResponse.body
        : logsResponse;
    const logText = typeof logData === "string" ? logData : String(logData);
    const lines = logText.split("\n").filter((line) => line.trim());

    const response: KubernetesApiResponse<{
      logs: string[];
      lineCount: number;
      pod: string;
      namespace: string;
    }> = {
      success: true,
      data: {
        logs: lines,
        lineCount: lines.length,
        pod: podName,
        namespace,
      },
      timestamp,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: KubernetesApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get logs",
      timestamp,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
