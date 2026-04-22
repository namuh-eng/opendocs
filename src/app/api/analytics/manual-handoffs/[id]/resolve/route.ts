import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs, orgMemberships } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

/**
 * POST /api/analytics/manual-handoffs/[id]/resolve
 *
 * Appends a resolution audit record for a manual async handoff item.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [membership] = await db
    .select({ orgId: orgMemberships.orgId })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [handoff] = await db
    .select({
      id: auditLogs.id,
      orgId: auditLogs.orgId,
      action: auditLogs.action,
      details: auditLogs.details,
    })
    .from(auditLogs)
    .where(and(eq(auditLogs.id, id), eq(auditLogs.orgId, membership.orgId)))
    .limit(1);

  if (!handoff) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [resolution] = await db
    .insert(auditLogs)
    .values({
      orgId: membership.orgId,
      userId: session.user.id,
      action: `${handoff.action}_resolved`,
      details: {
        handoffId: handoff.id,
        originalAction: handoff.action,
        originalDetails: handoff.details ?? {},
      },
    })
    .returning({
      id: auditLogs.id,
      action: auditLogs.action,
      createdAt: auditLogs.createdAt,
    });

  return NextResponse.json({
    ok: true,
    resolution: {
      ...resolution,
      createdAt: resolution.createdAt.toISOString(),
    },
  });
}
