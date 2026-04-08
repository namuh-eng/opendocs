import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships, pages, projects } from "@/lib/db/schema";
import { validateCreatePageRequest } from "@/lib/pages";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** Resolve user's org and verify project belongs to it. Returns projectId or error response. */
async function resolveProject(
  userId: string,
  projectId: string,
): Promise<
  { ok: true; orgId: string } | { ok: false; response: NextResponse }
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

  const orgId = membership[0].orgId;

  const project = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
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

  return { ok: true, orgId };
}

/** GET /api/projects/[id]/pages — list all pages for a project */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const resolved = await resolveProject(session.user.id, projectId);
  if (!resolved.ok) return resolved.response;

  const projectPages = await db
    .select({
      id: pages.id,
      path: pages.path,
      title: pages.title,
      description: pages.description,
      isPublished: pages.isPublished,
      createdAt: pages.createdAt,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .where(eq(pages.projectId, projectId))
    .orderBy(pages.path);

  return NextResponse.json({ pages: projectPages });
}

/** POST /api/projects/[id]/pages — create a new page */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const resolved = await resolveProject(session.user.id, projectId);
  if (!resolved.ok) return resolved.response;

  const body = await request.json();
  const validation = validateCreatePageRequest(body);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Check path uniqueness within project
  const existing = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.projectId, projectId), eq(pages.path, validation.path)))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "A page with this path already exists in this project" },
      { status: 409 },
    );
  }

  const [page] = await db
    .insert(pages)
    .values({
      projectId,
      path: validation.path,
      title: validation.title,
      content: validation.content ?? "",
      description: validation.description ?? null,
    })
    .returning();

  return NextResponse.json({ page }, { status: 201 });
}
