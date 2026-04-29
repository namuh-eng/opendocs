import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs, orgMemberships } from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";
import { and, desc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/audit-logs
 *
 * Returns recent audit logs for the current user's organization.
 * Admins only.
 */
export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("audit_logs_list_unauthorized", {
      requestId,
      route: "/api/admin/audit-logs",
      method: "GET",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [membership] = await db
    .select({ orgId: orgMemberships.orgId, role: orgMemberships.role })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (!membership) {
    logger.warn("audit_logs_list_no_org", {
      requestId,
      route: "/api/admin/audit-logs",
      method: "GET",
      userId: session.user.id,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (membership.role !== "admin") {
    logger.warn("audit_logs_list_forbidden", {
      requestId,
      route: "/api/admin/audit-logs",
      method: "GET",
      userId: session.user.id,
      role: membership.role,
      orgId: membership.orgId,
    });
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "50", 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 100)
    : 50;

  const logs = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.orgId, membership.orgId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  logger.info("audit_logs_list_completed", {
    requestId,
    route: "/api/admin/audit-logs",
    method: "GET",
    orgId: membership.orgId,
    logCount: logs.length,
  });

  return NextResponse.json({ logs, requestId });
}
