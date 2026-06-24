import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateCommentContent } from "@/lib/collaboration";
import { db } from "@/lib/db";
import { comments, orgMemberships, pages, projects } from "@/lib/db/schema";

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
    .from(comments)
    .where(eq(comments.pageId, pageId))
    .orderBy(asc(comments.createdAt));

  return NextResponse.json({ comments: rows });
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
  const error = validateCommentContent(body.content);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const [created] = await db
    .insert(comments)
    .values({
      pageId,
      userId: session.user.id,
      parentId: body.parentId ?? null,
      content: body.content,
    })
    .returning();

  return NextResponse.json({ comment: created }, { status: 201 });
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

  const body = await req.json();
  if (!body.commentId) {
    return NextResponse.json(
      { error: "commentId is required" },
      { status: 400 },
    );
  }

  // Only admins/editors can resolve
  if (
    body.resolved !== undefined &&
    access.role !== "admin" &&
    access.role !== "editor"
  ) {
    return NextResponse.json(
      { error: "Only editors and admins can resolve comments" },
      { status: 403 },
    );
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (body.resolved !== undefined) updates.resolved = body.resolved;
  if (body.content !== undefined) {
    const err = validateCommentContent(body.content);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    updates.content = body.content;
  }

  const [updated] = await db
    .update(comments)
    .set(updates)
    .where(and(eq(comments.id, body.commentId), eq(comments.pageId, pageId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  return NextResponse.json({ comment: updated });
}
