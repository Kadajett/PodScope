import { NextResponse } from "next/server";
import { getTargets } from "@/lib/prometheus";
import type { PrometheusApiResponse, PrometheusTargetsResponse } from "@/types/prometheus";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const result = await getTargets();

    if (result.status === "error") {
      const response: PrometheusApiResponse<never> = {
        success: false,
        error: result.error || "Failed to get targets",
        timestamp,
      };
      return NextResponse.json(response, { status: 400 });
    }

    const targets = result.data?.activeTargets || [];
    const response: PrometheusApiResponse<
      PrometheusTargetsResponse & { summary: { total: number; up: number; down: number } }
    > = {
      success: true,
      data: {
        ...(result.data || { activeTargets: [], droppedTargets: [] }),
        summary: {
          total: targets.length,
          up: targets.filter((t) => t.health === "up").length,
          down: targets.filter((t) => t.health === "down").length,
        },
      },
      timestamp,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: PrometheusApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get targets",
      timestamp,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
