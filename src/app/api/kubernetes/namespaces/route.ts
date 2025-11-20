import { NextResponse } from "next/server";
import { getNamespaces } from "@/lib/kubernetes";
import type { KubernetesApiResponse, KubernetesNamespace } from "@/types/kubernetes";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const namespaces = await getNamespaces();

    const response: KubernetesApiResponse<{ namespaces: KubernetesNamespace[] }> = {
      success: true,
      data: { namespaces },
      timestamp,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: KubernetesApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get namespaces",
      timestamp,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
