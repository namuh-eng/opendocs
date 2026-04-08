/**
 * GET /api/v1/analytics/visitors?projectId=...&dateFrom=...&dateTo=...&limit=...&offset=...
 *
 * Export visitor analytics with daily counts, top pages, referrals.
 * Requires admin API key.
 */

import { paginatedResponse, parseExportParams } from "@/lib/analytics-export";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { db } from "@/lib/db";
import { analyticsEvents, projects } from "@/lib/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const keyAuth = await authenticateApiKey(authHeader);
  if (!keyAuth || keyAuth.type !== "admin") {
    return NextResponse.json(
      { error: "Unauthorized — valid admin API key required" },
      { status: 401 },
    );
  }

  const { projectId, dateFrom, dateTo, limit, offset } =
    parseExportParams(request);
  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 },
    );
  }

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, keyAuth.orgId)))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const conditions = [
    eq(analyticsEvents.projectId, projectId),
    eq(analyticsEvents.type, "view"),
  ];
  if (dateFrom) conditions.push(gte(analyticsEvents.createdAt, dateFrom));
  if (dateTo) conditions.push(lte(analyticsEvents.createdAt, dateTo));
  const where = and(...conditions);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analyticsEvents)
    .where(where);

  const rows = await db
    .select({
      date: sql<string>`to_char(${analyticsEvents.createdAt}::date, 'YYYY-MM-DD')`,
      visitors: sql<number>`count(*)::int`,
      topPage: sql<string>`coalesce(mode() WITHIN GROUP (ORDER BY ${analyticsEvents.data}->>'page'), '/unknown')`,
      topReferrer: sql<string>`coalesce(mode() WITHIN GROUP (ORDER BY nullif(${analyticsEvents.data}->>'referrer', '')), '$direct')`,
    })
    .from(analyticsEvents)
    .where(where)
    .groupBy(sql`${analyticsEvents.createdAt}::date`)
    .orderBy(sql`${analyticsEvents.createdAt}::date`)
    .limit(limit)
    .offset(offset);

  return NextResponse.json(
    paginatedResponse(rows, countRow?.count ?? 0, limit, offset),
  );
}
