import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs, orgMemberships } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

/**
 * DELETE /api/analytics/manual-handoffs/[id]
 *
 * Deletes a manual async handoff record for an organization admin.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify membership and admin role
  const [membership] = await db
    .select({ orgId: orgMemberships.orgId, role: orgMemberships.role })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (membership.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden - Admin required" },
      { status: 403 },
    );
  }

  const result = await db
    .delete(auditLogs)
    .where(and(eq(auditLogs.id, id), eq(auditLogs.orgId, membership.orgId)))
    .returning({ id: auditLogs.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, deletedId: result[0].id });
}
