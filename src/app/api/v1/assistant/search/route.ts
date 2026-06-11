/**
 * POST /api/v1/assistant/search
 *
 * Search published documentation pages by keyword.
 * Auth: assistant API key (mint_dsc_ prefix) via Bearer token.
 *
 * Request body: { query, pageSize?, scoreThreshold?, filter? }
 * Response: Array of { content, path, metadata }
 */

import { and, eq, ilike, inArray, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import {
  buildSearchQuery,
  formatSearchResult,
  validateSearchRequest,
} from "@/lib/assistant";
import { db } from "@/lib/db";
import { pages, projects } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const auth = await authenticateApiKey(request.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (auth.type !== "assistant") {
    return NextResponse.json(
      { message: "Forbidden — assistant API key required" },
      { status: 403 },
    );
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateSearchRequest(body);
  if (!validation.valid) {
    return NextResponse.json({ message: validation.error }, { status: 400 });
  }

  // ── Find projects owned by this org ─────────────────────────────────────────
  const orgProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.orgId, auth.orgId));

  if (orgProjects.length === 0) {
    return NextResponse.json([], { status: 200 });
  }

  const projectIds = orgProjects.map((p) => p.id);
  const pattern = buildSearchQuery(validation.query);

  // ── Search pages ────────────────────────────────────────────────────────────
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
        inArray(pages.projectId, projectIds),
        eq(pages.isPublished, true),
        or(
          ilike(pages.title, pattern),
          ilike(pages.content, pattern),
          ilike(pages.path, pattern),
        ),
      ),
    )
    .limit(validation.pageSize);

  return NextResponse.json(results.map(formatSearchResult), { status: 200 });
}
