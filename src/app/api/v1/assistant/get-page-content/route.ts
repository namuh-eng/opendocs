/**
 * POST /api/v1/assistant/get-page-content
 *
 * Retrieve the full text content of a specific documentation page by path.
 * Auth: assistant API key (mint_dsc_ prefix) via Bearer token.
 *
 * Request body: { path }
 * Response: { path, content }
 */

import { and, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import {
  formatPageContentResponse,
  validateGetPageContentRequest,
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

  const validation = validateGetPageContentRequest(body);
  if (!validation.valid) {
    return NextResponse.json({ message: validation.error }, { status: 400 });
  }

  // ── Find projects owned by this org ─────────────────────────────────────────
  const orgProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.orgId, auth.orgId));

  if (orgProjects.length === 0) {
    return NextResponse.json({ message: "Page not found" }, { status: 404 });
  }

  const projectIds = orgProjects.map((p) => p.id);

  // ── Fetch page ──────────────────────────────────────────────────────────────
  const rows = await db
    .select({
      path: pages.path,
      content: pages.content,
    })
    .from(pages)
    .where(
      and(
        inArray(pages.projectId, projectIds),
        eq(pages.path, validation.path),
        eq(pages.isPublished, true),
      ),
    )
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ message: "Page not found" }, { status: 404 });
  }

  return NextResponse.json(
    formatPageContentResponse({
      path: rows[0].path,
      content: rows[0].content ?? "",
    }),
    { status: 200 },
  );
}
