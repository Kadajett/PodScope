import { type NextRequest, NextResponse } from "next/server";
import { ALLOWED_KUBECTL_COMMANDS, getExecRateLimit } from "@/lib/config";
import { executeKubectl } from "@/lib/kubernetes";
import type { KubectlExecResponse, KubernetesApiResponse } from "@/types/kubernetes";

// Simple in-memory rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(clientId: string): boolean {
  const limit = getExecRateLimit();
  const now = Date.now();
  const windowMs = 60000; // 1 minute window

  // Cleanup old entries to prevent memory leak
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime + windowMs) {
      requestCounts.delete(key);
    }
  }

  const record = requestCounts.get(clientId);

  if (!record || now > record.resetTime) {
    requestCounts.set(clientId, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();

  // Rate limiting (using IP or a simple identifier)
  const clientId = request.headers.get("x-forwarded-for") || "default";

  if (!checkRateLimit(clientId)) {
    const response: KubernetesApiResponse<never> = {
      success: false,
      error: `Rate limit exceeded. Maximum ${getExecRateLimit()} requests per minute.`,
      timestamp,
    };
    return NextResponse.json(response, { status: 429 });
  }

  try {
    let body: {
      command: string;
      args?: string[];
      namespace?: string;
    };
    try {
      body = await request.json();
    } catch {
      const response: KubernetesApiResponse<never> = {
        success: false,
        error: "Invalid JSON in request body",
        timestamp,
      };
      return NextResponse.json(response, { status: 400 });
    }

    const { command, args = [], namespace } = body;

    // Validate command
    if (!command || typeof command !== "string") {
      const response: KubernetesApiResponse<never> = {
        success: false,
        error: "Missing or invalid required field: command",
        timestamp,
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate args
    if (!Array.isArray(args)) {
      const response: KubernetesApiResponse<never> = {
        success: false,
        error: "Invalid field: args must be an array",
        timestamp,
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate namespace if provided
    if (namespace !== undefined && typeof namespace !== "string") {
      const response: KubernetesApiResponse<never> = {
        success: false,
        error: "Invalid field: namespace must be a string",
        timestamp,
      };
      return NextResponse.json(response, { status: 400 });
    }

    const result = await executeKubectl({ command, args, namespace });

    const response: KubernetesApiResponse<KubectlExecResponse> = {
      success: result.success,
      data: result,
      error: result.error,
      timestamp,
    };

    return NextResponse.json(response, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    const response: KubernetesApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to execute command",
      timestamp,
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// GET endpoint to show allowed commands
export function GET() {
  const timestamp = new Date().toISOString();

  const response: KubernetesApiResponse<{
    allowedCommands: readonly string[];
    rateLimit: number;
    rateLimitWindow: string;
  }> = {
    success: true,
    data: {
      allowedCommands: ALLOWED_KUBECTL_COMMANDS,
      rateLimit: getExecRateLimit(),
      rateLimitWindow: "1 minute",
    },
    timestamp,
  };

  return NextResponse.json(response);
}
