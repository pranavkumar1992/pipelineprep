import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { expireStaleSubscriptions } from "@/lib/auth/entitlement";

export const dynamic = "force-dynamic";

/**
 * Liveness and readiness probe used by Docker's HEALTHCHECK and by the EC2
 * load balancer. Reports the database round-trip, because an app process that
 * is up but cannot reach Postgres is not healthy.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ok",
        database: "reachable",
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "unreachable",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}

/**
 * Housekeeping hook for subscriptions that lapsed without a page view (a user
 * who never returns). Entitlement checks already flip these lazily, so this is
 * only for accurate reporting.
 */
export async function POST() {
  const token = process.env.CRON_SECRET;
  if (token) {
    const { headers } = await import("next/headers");
    const requestHeaders = await headers();
    if (requestHeaders.get("authorization") !== `Bearer ${token}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const expired = await expireStaleSubscriptions();
  return NextResponse.json({ expired });
}
