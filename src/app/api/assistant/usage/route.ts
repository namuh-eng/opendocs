/**
 * GET /api/assistant/usage — fetch assistant usage stats for the current user's project
 *
 * Session-authenticated (dashboard use).
 */

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assistantUsage, orgMemberships, projects } from "@/lib/db/schema";
import { getServerSession } from "@/lib/session";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await db
    .select({ orgId: orgMemberships.orgId })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (membership.length === 0) {
    return NextResponse.json(
      { error: "No organization found" },
      { status: 404 },
    );
  }

  const projectRows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.orgId, membership[0].orgId))
    .orderBy(projects.createdAt)
    .limit(1);

  if (projectRows.length === 0) {
    return NextResponse.json({ error: "No project found" }, { status: 404 });
  }

  const projectId = projectRows[0].id;

  const rows = await db
    .select()
    .from(assistantUsage)
    .where(eq(assistantUsage.projectId, projectId))
    .limit(1);

  const u = rows[0] ?? null;

  return NextResponse.json({
    usage: u
      ? {
          messagesUsed: u.messagesUsed,
          messageLimit: u.messageLimit,
          billingCycleStart: u.billingCycleStart?.toISOString() ?? null,
          billingCycleEnd: u.billingCycleEnd?.toISOString() ?? null,
          monthlyPrice: u.monthlyPrice,
          overageSpend: u.overageSpend,
        }
      : {
          messagesUsed: 0,
          messageLimit: 250,
          billingCycleStart: null,
          billingCycleEnd: null,
          monthlyPrice: 0,
          overageSpend: 0,
        },
  });
}
