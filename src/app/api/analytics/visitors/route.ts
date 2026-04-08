import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyticsEvents, orgMemberships, projects } from "@/lib/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/analytics/visitors?projectId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns:
 * - dailyCounts: visitor counts per day
 * - topPages: top pages by view count
 * - referrals: referral sources by view count
 * - totalVisitors: total unique visitor count (approximated as total view events)
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
    eq(analyticsEvents.type, "view"),
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

  // Daily counts
  const dailyCounts = await db
    .select({
      date: sql<string>`to_char(${analyticsEvents.createdAt}::date, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(analyticsEvents)
    .where(whereClause)
    .groupBy(sql`${analyticsEvents.createdAt}::date`)
    .orderBy(sql`${analyticsEvents.createdAt}::date`);

  // Top pages — group by page path stored in data->>'page'
  const topPages = await db
    .select({
      pagePath: sql<string>`coalesce(${analyticsEvents.data}->>'page', '/unknown')`,
      views: sql<number>`count(*)::int`,
    })
    .from(analyticsEvents)
    .where(whereClause)
    .groupBy(sql`coalesce(${analyticsEvents.data}->>'page', '/unknown')`)
    .orderBy(sql`count(*) desc`)
    .limit(20);

  // Referrals — group by referrer stored in data->>'referrer'
  const referrals = await db
    .select({
      source: sql<string>`coalesce(nullif(${analyticsEvents.data}->>'referrer', ''), '$direct')`,
      views: sql<number>`count(*)::int`,
    })
    .from(analyticsEvents)
    .where(whereClause)
    .groupBy(
      sql`coalesce(nullif(${analyticsEvents.data}->>'referrer', ''), '$direct')`,
    )
    .orderBy(sql`count(*) desc`)
    .limit(20);

  // Total count
  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyticsEvents)
    .where(whereClause);

  return NextResponse.json({
    dailyCounts,
    topPages,
    referrals,
    totalVisitors: totalRow?.count ?? 0,
  });
}
