import { NextResponse } from "next/server";
import { getBullMQOverview, getRedisInstances } from "@/lib/bullmq";
import type { BullMQApiResponse, BullMQOverview } from "@/types/bullmq";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const instances = getRedisInstances();

    if (instances.length === 0) {
      const response: BullMQApiResponse<never> = {
        success: false,
        error: "No Redis instances configured. Set REDIS_INSTANCES in .env",
        timestamp,
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get overview for all instances
    const overviews: BullMQOverview[] = [];

    for (const instance of instances) {
      const overview = await getBullMQOverview(instance);
      overviews.push(overview);
    }

    const response: BullMQApiResponse<{ instances: BullMQOverview[] }> = {
      success: true,
      data: { instances: overviews },
      timestamp,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: BullMQApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get BullMQ overview",
      timestamp,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
