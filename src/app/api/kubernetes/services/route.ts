import { type NextRequest, NextResponse } from "next/server";
import { getServices } from "@/lib/kubernetes";
import type { KubernetesApiResponse, KubernetesService } from "@/types/kubernetes";

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const searchParams = request.nextUrl.searchParams;
  const namespace = searchParams.get("namespace") || undefined;

  try {
    const services = await getServices(namespace);

    const response: KubernetesApiResponse<{ services: KubernetesService[]; count: number }> = {
      success: true,
      data: {
        services,
        count: services.length,
      },
      timestamp,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: KubernetesApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get services",
      timestamp,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
