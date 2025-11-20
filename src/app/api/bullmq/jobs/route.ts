import { type NextRequest, NextResponse } from "next/server";
import { getQueueJobs, getRedisInstances } from "@/lib/bullmq";
import type { BullMQApiResponse, QueueJobsResponse } from "@/types/bullmq";

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const searchParams = request.nextUrl.searchParams;
  const instanceName = searchParams.get("instance");
  const queueName = searchParams.get("queue");
  const status = searchParams.get("status") as
    | "waiting"
    | "active"
    | "completed"
    | "failed"
    | "delayed";
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  if (!queueName) {
    const response: BullMQApiResponse<never> = {
      success: false,
      error: "Missing required parameter: queue",
      timestamp,
    };
    return NextResponse.json(response, { status: 400 });
  }

  if (!status) {
    const response: BullMQApiResponse<never> = {
      success: false,
      error: "Missing required parameter: status (waiting|active|completed|failed|delayed)",
      timestamp,
    };
    return NextResponse.json(response, { status: 400 });
  }

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

    const instance = instanceName ? instances.find((i) => i.name === instanceName) : instances[0];

    if (!instance) {
      const response: BullMQApiResponse<never> = {
        success: false,
        error: `Instance '${instanceName}' not found`,
        timestamp,
      };
      return NextResponse.json(response, { status: 404 });
    }

    const jobs = await getQueueJobs(instance, queueName, status, limit);

    const response: BullMQApiResponse<QueueJobsResponse> = {
      success: true,
      data: {
        queue: queueName,
        instance: instance.name,
        jobs,
        total: jobs.length,
        status,
      },
      timestamp,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: BullMQApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get jobs",
      timestamp,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
