import { type NextRequest, NextResponse } from "next/server";
import { queryInstant, queryRange } from "@/lib/prometheus";
import type {
  PrometheusApiResponse,
  PrometheusQueryResult,
  PrometheusResponse,
} from "@/types/prometheus";

interface QueryRequestBody {
  query?: unknown;
  time?: unknown;
  start?: unknown;
  end?: unknown;
  step?: unknown;
}

interface ValidatedQueryParams {
  query: string;
  time?: string;
  start?: string;
  end?: string;
  step?: string;
}

function validateQueryParams(body: QueryRequestBody): {
  error?: string;
  params?: ValidatedQueryParams;
} {
  const { query, time, start, end, step } = body;

  if (!query || typeof query !== "string") {
    return { error: "Missing or invalid required field: query" };
  }

  if (time !== undefined && typeof time !== "string") {
    return { error: "Invalid field: time must be a string" };
  }

  if (start !== undefined && typeof start !== "string") {
    return { error: "Invalid field: start must be a string" };
  }

  if (end !== undefined && typeof end !== "string") {
    return { error: "Invalid field: end must be a string" };
  }

  if (step !== undefined && typeof step !== "string") {
    return { error: "Invalid field: step must be a string" };
  }

  return {
    params: {
      query,
      time: time as string | undefined,
      start: start as string | undefined,
      end: end as string | undefined,
      step: step as string | undefined,
    },
  };
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();

  try {
    let body: QueryRequestBody;
    try {
      body = await request.json();
    } catch {
      const response: PrometheusApiResponse<never> = {
        success: false,
        error: "Invalid JSON in request body",
        timestamp,
      };
      return NextResponse.json(response, { status: 400 });
    }

    const validation = validateQueryParams(body);
    if (validation.error || !validation.params) {
      const response: PrometheusApiResponse<never> = {
        success: false,
        error: validation.error || "Invalid request parameters",
        timestamp,
      };
      return NextResponse.json(response, { status: 400 });
    }

    // TypeScript needs explicit assertion after validation
    const params = validation.params;
    const { query, time, start, end, step } = params;

    let result: PrometheusResponse<PrometheusQueryResult>;

    // If start/end/step provided, use range query
    if (start && end && step) {
      result = await queryRange({ query, start, end, step });
    } else {
      // Otherwise use instant query
      result = await queryInstant({ query, time });
    }

    if (result.status === "error") {
      const response: PrometheusApiResponse<never> = {
        success: false,
        error: result.error || "Query failed",
        timestamp,
      };
      return NextResponse.json(response, { status: 400 });
    }

    const response: PrometheusApiResponse<PrometheusQueryResult> = {
      success: true,
      data: result.data,
      timestamp,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: PrometheusApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to execute query",
      timestamp,
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// GET endpoint for simple queries via URL params
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");
  const time = searchParams.get("time") || undefined;

  if (!query) {
    const response: PrometheusApiResponse<never> = {
      success: false,
      error: "Missing required parameter: query",
      timestamp,
    };
    return NextResponse.json(response, { status: 400 });
  }

  try {
    const result = await queryInstant({ query, time });

    if (result.status === "error") {
      const response: PrometheusApiResponse<never> = {
        success: false,
        error: result.error || "Query failed",
        timestamp,
      };
      return NextResponse.json(response, { status: 400 });
    }

    const response: PrometheusApiResponse<PrometheusQueryResult> = {
      success: true,
      data: result.data,
      timestamp,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: PrometheusApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to execute query",
      timestamp,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
