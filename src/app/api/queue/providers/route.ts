/**
 * Queue Providers API
 *
 * Lists all configured queue providers and their health status
 */

import { NextResponse } from "next/server";
import log from "@/lib/logger";
import { getAvailableProviders } from "@/lib/queues/registry";

/**
 * GET /api/queue/providers
 * Get all available queue providers and their status
 *
 * Response: {
 *   providers: [{
 *     name: "redis-bullmq",
 *     type: "bullmq",
 *     displayName: "Redis BullMQ",
 *     healthy: true
 *   }]
 * }
 */
export async function GET() {
  try {
    const providers = await getAvailableProviders();

    return NextResponse.json({
      providers,
      count: providers.length,
    });
  } catch (error) {
    log.error({ error }, "Failed to fetch queue providers");
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
