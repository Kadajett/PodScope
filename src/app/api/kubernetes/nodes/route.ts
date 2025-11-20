import { NextResponse } from "next/server";
import { getNodes } from "@/lib/kubernetes";
import type { KubernetesApiResponse, KubernetesNode } from "@/types/kubernetes";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const nodes = await getNodes();

    const response: KubernetesApiResponse<{ nodes: KubernetesNode[] }> = {
      success: true,
      data: { nodes },
      timestamp,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: KubernetesApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get nodes",
      timestamp,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
