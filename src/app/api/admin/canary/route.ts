import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships } from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/canary
 *
 * Mock canary/rollback control endpoint. Admins only.
 * In a real environment, this would interface with App Runner/ECS/CloudWatch.
 */
export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [membership] = await db
    .select({ role: orgMemberships.role, orgId: orgMemberships.orgId })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (!membership || membership.role !== "admin") {
    logger.warn("admin_canary_forbidden", {
      requestId,
      route: "/api/admin/canary",
      method: "POST",
      userId: session.user.id,
    });
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  let body: { action: "promote" | "rollback"; version?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!["promote", "rollback"].includes(body.action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  logger.info("admin_canary_action_triggered", {
    requestId,
    orgId: membership.orgId,
    userId: session.user.id,
    action: body.action,
    version: body.version ?? "latest",
  });

  return NextResponse.json({
    ok: true,
    action: body.action,
    status: "in_progress",
    requestId,
  });
}
