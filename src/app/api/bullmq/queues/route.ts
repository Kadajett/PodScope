import { type NextRequest, NextResponse } from "next/server";
import { discoverQueues, getQueueStats, getRedisInstances } from "@/lib/bullmq";
import type { BullMQApiResponse, QueueStats } from "@/types/bullmq";

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const searchParams = request.nextUrl.searchParams;
  const instanceName = searchParams.get("instance");
  const queueName = searchParams.get("queue");

  try {
    const instances = getRedisInstances();

    if (instances.length === 0) {
      const response: BullMQApiResponse<never> = {
        success: false,
        error: "No Redis instances configured",
        timestamp,
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Find specific instance or use first
    const instance = instanceName ? instances.find((i) => i.name === instanceName) : instances[0];

    if (!instance) {
      const response: BullMQApiResponse<never> = {
        success: false,
        error: `Instance '${instanceName}' not found`,
        timestamp,
      };
      return NextResponse.json(response, { status: 404 });
    }

    // If specific queue requested
    if (queueName) {
      const stats = await getQueueStats(instance, queueName);

      const response: BullMQApiResponse<{ queue: QueueStats }> = {
        success: true,
        data: { queue: stats },
        timestamp,
      };

      return NextResponse.json(response);
    }

    // Otherwise return all queues
    const queueNames = await discoverQueues(instance);
    const queues: QueueStats[] = [];

    for (const name of queueNames) {
      const stats = await getQueueStats(instance, name);
      queues.push(stats);
    }

    const response: BullMQApiResponse<{
      instance: string;
      queues: QueueStats[];
    }> = {
      success: true,
      data: { instance: instance.name, queues },
      timestamp,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: BullMQApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get queue stats",
      timestamp,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
