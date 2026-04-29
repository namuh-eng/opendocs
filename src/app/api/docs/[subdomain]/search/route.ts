/**
 * GET /api/docs/[subdomain]/search?q=...
 *
 * Public full-text search across published documentation pages.
 * No auth required — this powers the docs site Cmd+K search modal.
 *
 * Uses Postgres ILIKE for substring matching with relevance-based ordering:
 * title matches rank higher than description, which ranks higher than content.
 *
 * Query params:
 *   q      — search query (required, 1-200 chars)
 *   limit  — max results (default 20, max 50)
 */

import { buildSearchQuery } from "@/lib/assistant";
import { db } from "@/lib/db";
import { pages, projects } from "@/lib/db/schema";
import {
  getDocsAccessCookieName,
  hasValidDocsAccess,
} from "@/lib/project-docs-access";
import { extractSnippet, getBreadcrumb } from "@/lib/search";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ subdomain: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { subdomain } = await context.params;
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
  const limit = Math.min(
    Math.max(Number.isNaN(limitParam) ? 20 : limitParam, 1),
    50,
  );

  if (!query || query.length > 200) {
    return NextResponse.json(
      {
        message: query
          ? "Query too long (max 200 chars)"
          : "Query parameter 'q' is required",
      },
      { status: 400 },
    );
  }

  // Find the project by subdomain
  const projectResult = await db
    .select({ id: projects.id, settings: projects.settings })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (projectResult.length === 0) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  if (
    !hasValidDocsAccess(
      projectResult[0].settings,
      subdomain,
      request.cookies.get(getDocsAccessCookieName(subdomain))?.value,
    )
  ) {
    return NextResponse.json(
      { message: "Docs password required" },
      { status: 401 },
    );
  }

  const projectId = projectResult[0].id;
  const pattern = buildSearchQuery(query);

  // Search with relevance ordering: title > description > content
  const results = await db
    .select({
      path: pages.path,
      title: pages.title,
      description: pages.description,
      content: pages.content,
    })
    .from(pages)
    .where(
      and(
        eq(pages.projectId, projectId),
        eq(pages.isPublished, true),
        or(
          ilike(pages.title, pattern),
          ilike(pages.description, pattern),
          ilike(pages.content, pattern),
          ilike(pages.path, pattern),
        ),
      ),
    )
    .orderBy(
      // Title matches first, then description, then content
      sql`CASE
        WHEN LOWER(${pages.title}) LIKE LOWER(${pattern}) THEN 0
        WHEN LOWER(${pages.description}) LIKE LOWER(${pattern}) THEN 1
        WHEN LOWER(${pages.path}) LIKE LOWER(${pattern}) THEN 2
        ELSE 3
      END`,
    )
    .limit(limit);

  const formatted = results.map((r) => ({
    path: r.path,
    title: r.title,
    description: r.description,
    snippet: extractSnippet(r.content, query),
    breadcrumb: getBreadcrumb(r.path),
  }));

  return NextResponse.json(formatted, { status: 200 });
}
