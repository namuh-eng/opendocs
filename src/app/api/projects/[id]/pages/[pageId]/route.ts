import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships, pages, projects } from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";
import { normalizeMarkdownContent } from "@/lib/markdown-normalization";
import { validateUpdatePageRequest } from "@/lib/pages";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** Verify project belongs to user's org and page belongs to project. */
async function resolvePageInProject(
  userId: string,
  projectId: string,
  pageId: string,
): Promise<
  | { ok: true; page: { id: string; title: string }; role: string }
  | { ok: false; response: NextResponse }
> {
  const membership = await db
    .select({ orgId: orgMemberships.orgId, role: orgMemberships.role })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, userId))
    .limit(1);

  if (membership.length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No organization" },
        { status: 403 },
      ),
    };
  }

  const project = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(eq(projects.id, projectId), eq(projects.orgId, membership[0].orgId)),
    )
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

  const page = await db
    .select({ id: pages.id, title: pages.title })
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.projectId, projectId)))
    .limit(1);

  if (page.length === 0) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Page not found" }, { status: 404 }),
    };
  }

  return { ok: true, page: page[0], role: membership[0].role };
}

/** GET /api/projects/[id]/pages/[pageId] — get a single page with content */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("project_page_get_unauthorized", {
      requestId,
      route: "/api/projects/[id]/pages/[pageId]",
      method: "GET",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, pageId } = await params;
  const resolved = await resolvePageInProject(
    session.user.id,
    projectId,
    pageId,
  );
  if (!resolved.ok) return resolved.response;

  const [page] = await db
    .select()
    .from(pages)
    .where(eq(pages.id, pageId))
    .limit(1);

  logger.info("project_page_get_completed", {
    requestId,
    route: "/api/projects/[id]/pages/[pageId]",
    method: "GET",
    userId: session.user.id,
    projectId,
    pageId,
  });

  return NextResponse.json({
    page: {
      ...page,
      content: normalizeMarkdownContent(page.content ?? "", {
        title: page.title,
      }),
    },
    requestId,
  });
}

/** PUT /api/projects/[id]/pages/[pageId] — update a page */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("project_page_update_unauthorized", {
      requestId,
      route: "/api/projects/[id]/pages/[pageId]",
      method: "PUT",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, pageId } = await params;
  const resolved = await resolvePageInProject(
    session.user.id,
    projectId,
    pageId,
  );
  if (!resolved.ok) return resolved.response;

  if (resolved.role !== "admin" && resolved.role !== "editor") {
    logger.warn("project_page_update_forbidden", {
      requestId,
      route: "/api/projects/[id]/pages/[pageId]",
      method: "PUT",
      userId: session.user.id,
      projectId,
      pageId,
      role: resolved.role,
    });
    return NextResponse.json(
      { error: "Only admins and editors can manage pages" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const validation = validateUpdatePageRequest(body);

  if (!validation.valid) {
    logger.warn("project_page_update_invalid_request", {
      requestId,
      route: "/api/projects/[id]/pages/[pageId]",
      method: "PUT",
      userId: session.user.id,
      projectId,
      pageId,
      error: validation.error,
    });
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  if (typeof validation.fields.content === "string") {
    validation.fields.content = normalizeMarkdownContent(
      validation.fields.content,
      {
        title:
          typeof validation.fields.title === "string"
            ? validation.fields.title
            : resolved.page.title,
      },
    );
  }

  // If path is being changed, check uniqueness
  if (validation.fields.path) {
    const existing = await db
      .select({ id: pages.id })
      .from(pages)
      .where(
        and(
          eq(pages.projectId, projectId),
          eq(pages.path, validation.fields.path as string),
        ),
      )
      .limit(1);

    if (existing.length > 0 && existing[0].id !== pageId) {
      logger.warn("project_page_update_conflict", {
        requestId,
        route: "/api/projects/[id]/pages/[pageId]",
        method: "PUT",
        userId: session.user.id,
        projectId,
        pageId,
        path: validation.fields.path as string,
      });
      return NextResponse.json(
        { error: "A page with this path already exists" },
        { status: 409 },
      );
    }
  }

  const [updated] = await db
    .update(pages)
    .set({ ...validation.fields, updatedAt: new Date() })
    .where(eq(pages.id, pageId))
    .returning();

  logger.info("project_page_update_completed", {
    requestId,
    route: "/api/projects/[id]/pages/[pageId]",
    method: "PUT",
    userId: session.user.id,
    projectId,
    pageId,
  });

  return NextResponse.json({ page: updated, requestId });
}

/** DELETE /api/projects/[id]/pages/[pageId] — delete a page */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("project_page_delete_unauthorized", {
      requestId,
      route: "/api/projects/[id]/pages/[pageId]",
      method: "DELETE",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, pageId } = await params;
  const resolved = await resolvePageInProject(
    session.user.id,
    projectId,
    pageId,
  );
  if (!resolved.ok) return resolved.response;

  if (resolved.role !== "admin" && resolved.role !== "editor") {
    logger.warn("project_page_delete_forbidden", {
      requestId,
      route: "/api/projects/[id]/pages/[pageId]",
      method: "DELETE",
      userId: session.user.id,
      projectId,
      pageId,
      role: resolved.role,
    });
    return NextResponse.json(
      { error: "Only admins and editors can manage pages" },
      { status: 403 },
    );
  }

  await db.delete(pages).where(eq(pages.id, pageId));

  logger.info("project_page_delete_completed", {
    requestId,
    route: "/api/projects/[id]/pages/[pageId]",
    method: "DELETE",
    userId: session.user.id,
    projectId,
    pageId,
  });

  return NextResponse.json({ success: true, requestId });
}
