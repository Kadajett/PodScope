import { type NextRequest, NextResponse } from "next/server";
import type { RedisInstanceConfig } from "@/config/schema";
import { getBullMQOverview, getRedisInstances } from "@/lib/bullmq";
import type { BullMQApiResponse, BullMQOverview, RedisInstance } from "@/types/bullmq";

/**
 * GET /api/bullmq/overview
 *
 * Query params:
 * - host: Redis host (for single instance)
 * - port: Redis port (default: 6379)
 * - password: Redis password (optional)
 * - name: Instance name (default: "default")
 * - envVar: Environment variable name to read instances from
 *
 * If no params provided, reads from REDIS_INSTANCES env var
 */
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const searchParams = request.nextUrl.searchParams;

  try {
    let instances: RedisInstance[];

    // Check if direct connection params provided
    const host = searchParams.get("host");
    const envVar = searchParams.get("envVar");

    if (host) {
      // Direct connection via query params
      const directInstance: RedisInstanceConfig = {
        name: searchParams.get("name") || "default",
        host,
        port: parseInt(searchParams.get("port") || "6379", 10),
        password: searchParams.get("password") || undefined,
      };
      instances = getRedisInstances({ instances: [directInstance] });
    } else if (envVar) {
      // Use specified env var
      instances = getRedisInstances({ envVar });
    } else {
      // Default: use REDIS_INSTANCES env var
      instances = getRedisInstances();
    }

    if (instances.length === 0) {
      const response: BullMQApiResponse<never> = {
        success: false,
        error:
          "No Redis instances configured. Set REDIS_INSTANCES in .env or pass connection params",
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

/**
 * POST /api/bullmq/overview
 *
 * Body:
 * - instances: Array of { name, host, port, password } objects
 * - envVar: Environment variable name to read instances from
 * - useEnv: Boolean to use default REDIS_INSTANCES env var
 */
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();

  try {
    const body = await request.json();
    const instances = getRedisInstances(body);

    if (instances.length === 0) {
      const response: BullMQApiResponse<never> = {
        success: false,
        error: "No Redis instances provided in request body",
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
