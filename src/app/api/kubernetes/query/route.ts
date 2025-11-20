import { type NextRequest, NextResponse } from "next/server";
import { executeKubeQuery, getKubeQueryFromConfig } from "@/lib/kube-query";
import type { KubernetesApiResponse } from "@/types/kubernetes";

/**
 * GET /api/kubernetes/query?ref=kubeQueries.podFilters.failed_pods_v1-0-0
 * Execute a Kubernetes query from the config
 */
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const searchParams = request.nextUrl.searchParams;
  const queryRef = searchParams.get("ref");

  if (!queryRef) {
    const response: KubernetesApiResponse<never> = {
      success: false,
      error: "Missing required parameter: ref",
      timestamp,
    };
    return NextResponse.json(response, { status: 400 });
  }

  try {
    // Get the query definition from config
    const queryDef = getKubeQueryFromConfig(queryRef);

    // Execute the query
    const result = await executeKubeQuery(queryDef);

    const response: KubernetesApiResponse<typeof result> = {
      success: true,
      data: result,
      timestamp,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: KubernetesApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to execute query",
      timestamp,
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * POST /api/kubernetes/query
 * Execute a custom Kubernetes query (not from config)
 */
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();

  try {
    const queryDef = await request.json();

    // Execute the query
    const result = await executeKubeQuery(queryDef);

    const response: KubernetesApiResponse<typeof result> = {
      success: true,
      data: result,
      timestamp,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: KubernetesApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to execute query",
      timestamp,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
