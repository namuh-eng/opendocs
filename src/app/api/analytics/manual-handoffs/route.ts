import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs, orgMemberships } from "@/lib/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

const MANUAL_HANDOFF_ACTIONS = [
  "agent_job_manual_handoff_required",
  "deployment_manual_handoff_required",
  "project_initial_deployment_manual_handoff_required",
  "preview_deployment_manual_handoff_required",
  "api_v1_agent_job_manual_handoff_required",
  "api_v1_deployment_manual_handoff_required",
] as const;

/**
 * GET /api/analytics/manual-handoffs
 *
 * Returns recent manual async handoff audit records for the current user's org.
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "20", 10);
  const action = searchParams.get("action");
  const projectId = searchParams.get("projectId");
  const includeResolved = searchParams.get("includeResolved") === "true";
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 100)
    : 20;

  const [membership] = await db
    .select({ orgId: orgMemberships.orgId })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (!membership) {
    return NextResponse.json({ handoffs: [] });
  }

  const actionFilter =
    action && MANUAL_HANDOFF_ACTIONS.includes(action as (typeof MANUAL_HANDOFF_ACTIONS)[number])
      ? action
      : null;

  const handoffConditions = [
    eq(auditLogs.orgId, membership.orgId),
    inArray(auditLogs.action, [...MANUAL_HANDOFF_ACTIONS]),
  ];

  if (actionFilter) {
    handoffConditions.push(eq(auditLogs.action, actionFilter));
  }

  if (projectId) {
    handoffConditions.push(
      sql<boolean>`${auditLogs.details} ->> 'projectId' = ${projectId}`,
    );
  }

  const unresolvedCondition = sql<boolean>`not exists (
    select 1
    from ${auditLogs} as resolutions
    where resolutions.org_id = ${auditLogs.orgId}
      and resolutions.action = ${auditLogs.action} || '_resolved'
      and resolutions.details ->> 'handoffId' = ${auditLogs.id}
  )`;

  const handoffs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      userId: auditLogs.userId,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(
      and(
        ...handoffConditions,
        ...(includeResolved ? [] : [unresolvedCondition]),
      ),
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  const total = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(
      and(
        ...handoffConditions,
        ...(includeResolved ? [] : [unresolvedCondition]),
      ),
    );

  return NextResponse.json({
    handoffs: handoffs.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
    total: total[0]?.count ?? 0,
    filters: {
      action: actionFilter,
      projectId,
      includeResolved,
      limit,
    },
  });
}
