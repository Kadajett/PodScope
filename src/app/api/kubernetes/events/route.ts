import { type NextRequest, NextResponse } from "next/server";
import { getEvents } from "@/lib/kubernetes";
import type { KubernetesApiResponse, KubernetesEvent } from "@/types/kubernetes";

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const searchParams = request.nextUrl.searchParams;
  const namespace = searchParams.get("namespace") || undefined;
  const eventType = searchParams.get("eventType") || undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  try {
    const events = await getEvents(namespace, eventType, limit);

    const response: KubernetesApiResponse<{ events: KubernetesEvent[]; count: number }> = {
      success: true,
      data: {
        events,
        count: events.length,
      },
      timestamp,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: KubernetesApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get events",
      timestamp,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
