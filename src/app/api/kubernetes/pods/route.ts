import { type NextRequest, NextResponse } from "next/server";
import { getPods } from "@/lib/kubernetes";
import type { KubernetesApiResponse, KubernetesPod } from "@/types/kubernetes";

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const searchParams = request.nextUrl.searchParams;
  const namespace = searchParams.get("namespace") || undefined;

  try {
    const pods = await getPods(namespace);

    const response: KubernetesApiResponse<{ pods: KubernetesPod[]; count: number }> = {
      success: true,
      data: {
        pods,
        count: pods.length,
      },
      timestamp,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: KubernetesApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get pods",
      timestamp,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
