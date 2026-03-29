import { NextResponse } from "next/server";
import { processPendingGeocodes } from "@/lib/data-fetcher";

function isAuthorized(request) {
  const expectedSecret = process.env.GEOCODE_WORKER_SECRET;
  if (!expectedSecret) return true;

  const authHeader = request.headers.get("x-worker-secret") || "";
  return authHeader === expectedSecret;
}

export async function POST(request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const limit = body?.limit ?? 10;
    const retryFailed =
      typeof body?.retryFailed === "boolean"
        ? body.retryFailed
        : process.env.GEOCODE_RETRY_FAILED === "1";
    const retryMaxAttempts = Math.max(
      1,
      Math.min(Number(body?.retryMaxAttempts ?? process.env.GEOCODE_RETRY_MAX_ATTEMPTS) || 3, 10)
    );

    const result = await processPendingGeocodes({
      limit,
      retryFailed,
      retryMaxAttempts,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message || "Failed to process geocode queue" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      processed: result.processed,
      geocoded: result.geocoded,
      failed: result.failed,
      statusColumnEnabled: result.statusColumnEnabled,
    });
  } catch (error) {
    console.error("Geocode worker process failed:", error);
    return NextResponse.json(
      { error: "Failed to process geocode queue" },
      { status: 500 }
    );
  }
}
