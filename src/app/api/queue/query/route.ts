/**
 * Queue Query API
 *
 * Executes queue queries (inline or by reference)
 * Supports all queue providers (BullMQ, RabbitMQ, SQS, Kafka, etc.)
 */

import { type NextRequest, NextResponse } from "next/server";
import { QueueQuerySchema } from "@/config/schema";
import type { QueueQuery } from "@/lib/queues/base";
import { executeInlineQueueQuery, executeQueueQueryByRef } from "@/lib/queues/registry";

/**
 * GET /api/queue/query?ref=queueQueries.jobFilters.failed_jobs_v1-0-0
 * Execute a queue query by reference
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryRef = searchParams.get("ref");

    if (!queryRef) {
      return NextResponse.json({ error: "Query reference (ref) is required" }, { status: 400 });
    }

    const result = await executeQueueQueryByRef(queryRef);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Queue query error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/queue/query
 * Execute an inline queue query
 *
 * Body: {
 *   provider: "redis-bullmq",
 *   queue: "emails",
 *   status: "failed",
 *   limit: 20
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate query using Zod schema
    const validationResult = QueueQuerySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid queue query",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const result = await executeInlineQueueQuery(validationResult.data as QueueQuery);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Queue query error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
