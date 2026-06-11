import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateSuggestionDiff } from "@/lib/collaboration";
import { db } from "@/lib/db";
import { orgMemberships, pages, projects, suggestions } from "@/lib/db/schema";

async function resolvePageAccess(
  userId: string,
  pageId: string,
): Promise<
  | { ok: true; page: { id: string; projectId: string }; role: string }
  | { ok: false; response: NextResponse }
> {
  const page = await db
    .select({ id: pages.id, projectId: pages.projectId })
    .from(pages)
    .where(eq(pages.id, pageId))
    .limit(1);

  if (page.length === 0) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Page not found" }, { status: 404 }),
    };
  }

  const project = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, page[0].projectId))
    .limit(1);

  if (project.length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      ),
    };
  }

  const membership = await db
    .select({ role: orgMemberships.role })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.userId, userId),
        eq(orgMemberships.orgId, project[0].orgId),
      ),
    )
    .limit(1);

  if (membership.length === 0) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, page: page[0], role: membership[0].role };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pageId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pageId } = await params;
  const access = await resolvePageAccess(session.user.id, pageId);
  if (!access.ok) return access.response;

  const rows = await db
    .select()
    .from(suggestions)
    .where(eq(suggestions.pageId, pageId))
    .orderBy(desc(suggestions.createdAt));

  return NextResponse.json({ suggestions: rows });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ pageId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pageId } = await params;
  const access = await resolvePageAccess(session.user.id, pageId);
  if (!access.ok) return access.response;

  const body = await req.json();
  const error = validateSuggestionDiff(body.diff);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const [created] = await db
    .insert(suggestions)
    .values({
      pageId,
      userId: session.user.id,
      diff: body.diff,
    })
    .returning();

  return NextResponse.json({ suggestion: created }, { status: 201 });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ pageId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pageId } = await params;
  const access = await resolvePageAccess(session.user.id, pageId);
  if (!access.ok) return access.response;

  // Only editors/admins can accept/reject
  if (access.role !== "admin" && access.role !== "editor") {
    return NextResponse.json(
      { error: "Only editors and admins can review suggestions" },
      { status: 403 },
    );
  }

  const body = await req.json();
  if (!body.suggestionId || !body.status) {
    return NextResponse.json(
      { error: "suggestionId and status are required" },
      { status: 400 },
    );
  }

  if (!["accepted", "rejected"].includes(body.status)) {
    return NextResponse.json(
      { error: "Status must be 'accepted' or 'rejected'" },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(suggestions)
    .set({ status: body.status, updatedAt: new Date() })
    .where(
      and(
        eq(suggestions.id, body.suggestionId),
        eq(suggestions.pageId, pageId),
      ),
    )
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Suggestion not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ suggestion: updated });
}
