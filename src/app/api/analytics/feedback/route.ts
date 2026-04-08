import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyticsEvents, orgMemberships, projects } from "@/lib/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/analytics/feedback?projectId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns:
 * - entries: individual feedback events with status, type, abusive flag
 * - ratingsByPage: aggregated helpful/not_helpful counts per page
 * - totalCount: total feedback events
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get("projectId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 },
    );
  }

  // Verify user has access to this project's org
  const [project] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const [membership] = await db
    .select({ id: orgMemberships.id })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.orgId, project.orgId),
        eq(orgMemberships.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Build date conditions
  const conditions = [
    eq(analyticsEvents.projectId, projectId),
    eq(analyticsEvents.type, "feedback"),
  ];

  if (from) {
    conditions.push(
      gte(analyticsEvents.createdAt, new Date(`${from}T00:00:00Z`)),
    );
  }
  if (to) {
    conditions.push(
      lte(analyticsEvents.createdAt, new Date(`${to}T23:59:59.999Z`)),
    );
  }

  const whereClause = and(...conditions);

  // Fetch all feedback entries
  const entries = await db
    .select({
      id: analyticsEvents.id,
      page: sql<string>`coalesce(${analyticsEvents.data}->>'page', '/unknown')`,
      rating: sql<string>`coalesce(${analyticsEvents.data}->>'rating', 'unknown')`,
      comment: sql<string>`coalesce(${analyticsEvents.data}->>'comment', '')`,
      status: sql<string>`coalesce(${analyticsEvents.data}->>'status', 'pending')`,
      isAbusive: sql<boolean>`coalesce((${analyticsEvents.data}->>'isAbusive')::boolean, false)`,
      type: sql<string>`coalesce(${analyticsEvents.data}->>'feedbackType', 'contextual')`,
      createdAt: analyticsEvents.createdAt,
    })
    .from(analyticsEvents)
    .where(whereClause)
    .orderBy(sql`${analyticsEvents.createdAt} desc`)
    .limit(500);

  // Aggregate ratings by page
  const ratingsByPage = await db
    .select({
      page: sql<string>`coalesce(${analyticsEvents.data}->>'page', '/unknown')`,
      helpful: sql<number>`count(*) filter (where ${analyticsEvents.data}->>'rating' = 'helpful')::int`,
      notHelpful: sql<number>`count(*) filter (where ${analyticsEvents.data}->>'rating' = 'not_helpful')::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(analyticsEvents)
    .where(whereClause)
    .groupBy(sql`${analyticsEvents.data}->>'page'`)
    .orderBy(sql`count(*) desc`)
    .limit(50);

  // Total count
  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyticsEvents)
    .where(whereClause);

  return NextResponse.json({
    entries: entries.map((e) => ({
      ...e,
      createdAt:
        e.createdAt instanceof Date
          ? e.createdAt.toISOString()
          : String(e.createdAt),
    })),
    ratingsByPage,
    totalCount: totalRow?.count ?? 0,
  });
}
