import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships, projects } from "@/lib/db/schema";
import {
  buildGitHubSourceSelection,
  mergeProjectSettingsWithGitHubSource,
} from "@/lib/github-source";
import { createRequestId, logger } from "@/lib/logger";
import { attachResolvedGitHubSource } from "@/lib/project-response";
import { validateUpdateProjectRequest } from "@/lib/projects";
import { and, eq, ne, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

async function getUserOrgId(userId: string): Promise<string | null> {
  const membership = await db
    .select({ orgId: orgMemberships.orgId })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, userId))
    .limit(1);
  return membership.length > 0 ? membership[0].orgId : null;
}

async function getUserOrgRole(
  userId: string,
): Promise<{ orgId: string; role: string } | null> {
  const membership = await db
    .select({ orgId: orgMemberships.orgId, role: orgMemberships.role })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, userId))
    .limit(1);
  return membership.length > 0 ? membership[0] : null;
}

/** GET /api/projects/[id] — get a single project */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("project_get_unauthorized", {
      requestId,
      route: "/api/projects/[id]",
      method: "GET",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orgId = await getUserOrgId(session.user.id);
  if (!orgId) {
    logger.warn("project_get_no_org", {
      requestId,
      route: "/api/projects/[id]",
      method: "GET",
      userId: session.user.id,
      projectId: id,
    });
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  const result = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.orgId, orgId)))
    .limit(1);

  if (result.length === 0) {
    logger.warn("project_get_not_found", {
      requestId,
      route: "/api/projects/[id]",
      method: "GET",
      userId: session.user.id,
      orgId,
      projectId: id,
    });
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  logger.info("project_get_completed", {
    requestId,
    route: "/api/projects/[id]",
    method: "GET",
    userId: session.user.id,
    orgId,
    projectId: id,
  });

  return NextResponse.json({
    project: attachResolvedGitHubSource(result[0]),
    requestId,
  });
}

/** PUT /api/projects/[id] — update a project */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("project_update_unauthorized", {
      requestId,
      route: "/api/projects/[id]",
      method: "PUT",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const membership = await getUserOrgRole(session.user.id);
  if (!membership) {
    logger.warn("project_update_no_org", {
      requestId,
      route: "/api/projects/[id]",
      method: "PUT",
      userId: session.user.id,
      projectId: id,
    });
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  if (membership.role !== "admin" && membership.role !== "editor") {
    logger.warn("project_update_forbidden", {
      requestId,
      route: "/api/projects/[id]",
      method: "PUT",
      userId: session.user.id,
      orgId: membership.orgId,
      projectId: id,
      role: membership.role,
    });
    return NextResponse.json(
      { error: "Only admins and editors can update projects" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const validation = validateUpdateProjectRequest(body);

  if (!validation.valid) {
    logger.warn("project_update_invalid_request", {
      requestId,
      route: "/api/projects/[id]",
      method: "PUT",
      userId: session.user.id,
      orgId: membership.orgId,
      projectId: id,
      error: validation.error,
    });
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Verify project belongs to user's org
  const existing = await db
    .select({
      id: projects.id,
      repoUrl: projects.repoUrl,
      repoBranch: projects.repoBranch,
      repoPath: projects.repoPath,
      settings: projects.settings,
    })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.orgId, membership.orgId)))
    .limit(1);

  if (existing.length === 0) {
    logger.warn("project_update_not_found", {
      requestId,
      route: "/api/projects/[id]",
      method: "PUT",
      userId: session.user.id,
      orgId: membership.orgId,
      projectId: id,
    });
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const resolvedRepoUrl =
    (validation.fields.repoUrl as string | undefined) ??
    existing[0].repoUrl ??
    null;
  const resolvedRepoBranch =
    (validation.fields.repoBranch as string | undefined) ??
    existing[0].repoBranch ??
    null;
  const resolvedRepoPath =
    (validation.fields.repoPath as string | undefined) ??
    existing[0].repoPath ??
    null;
  const resolvedInstallationId =
    (validation.fields.githubInstallationId as string | undefined) ??
    (
      existing[0].settings?.githubSource as
        | { installationId?: string }
        | undefined
    )?.installationId ??
    null;

  const settingsUpdate = validation.fields.settings as
    | Record<string, unknown>
    | undefined;

  const mergedSettings = mergeProjectSettingsWithGitHubSource(
    existing[0].settings,
    buildGitHubSourceSelection({
      repoUrl: resolvedRepoUrl,
      installationId: resolvedInstallationId,
      repoBranch: resolvedRepoBranch,
      repoPath: resolvedRepoPath,
    }),
    settingsUpdate,
  );

  const updateFields = {
    ...validation.fields,
    settings: mergedSettings,
    updatedAt: new Date(),
  };

  const [updated] = await db
    .update(projects)
    .set(updateFields)
    .where(eq(projects.id, id))
    .returning();

  logger.info("project_update_completed", {
    requestId,
    route: "/api/projects/[id]",
    method: "PUT",
    userId: session.user.id,
    orgId: membership.orgId,
    projectId: id,
    updatedFields: Object.keys(validation.fields),
  });

  return NextResponse.json({
    project: attachResolvedGitHubSource(updated),
    requestId,
  });
}

/** DELETE /api/projects/[id] — delete a project (cannot delete last) */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("project_delete_unauthorized", {
      requestId,
      route: "/api/projects/[id]",
      method: "DELETE",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const membership = await getUserOrgRole(session.user.id);
  if (!membership) {
    logger.warn("project_delete_no_org", {
      requestId,
      route: "/api/projects/[id]",
      method: "DELETE",
      userId: session.user.id,
      projectId: id,
    });
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  if (membership.role !== "admin") {
    logger.warn("project_delete_forbidden", {
      requestId,
      route: "/api/projects/[id]",
      method: "DELETE",
      userId: session.user.id,
      orgId: membership.orgId,
      projectId: id,
      role: membership.role,
    });
    return NextResponse.json(
      { error: "Only admins can delete projects" },
      { status: 403 },
    );
  }

  // Parse body for reason and confirmation
  let body: { reason?: string; confirmName?: string } = {};
  try {
    body = await request.json();
  } catch {
    logger.warn("project_delete_missing_body", {
      requestId,
      route: "/api/projects/[id]",
      method: "DELETE",
      userId: session.user.id,
      orgId: membership.orgId,
      projectId: id,
    });
    return NextResponse.json(
      { error: "Request body is required" },
      { status: 400 },
    );
  }

  // Check project exists and belongs to org
  const result = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.orgId, membership.orgId)))
    .limit(1);

  if (result.length === 0) {
    logger.warn("project_delete_not_found", {
      requestId,
      route: "/api/projects/[id]",
      method: "DELETE",
      userId: session.user.id,
      orgId: membership.orgId,
      projectId: id,
    });
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const project = result[0];

  // Verify confirmation name
  if (body.confirmName !== project.name) {
    logger.warn("project_delete_confirmation_mismatch", {
      requestId,
      route: "/api/projects/[id]",
      method: "DELETE",
      userId: session.user.id,
      orgId: membership.orgId,
      projectId: id,
      expected: project.name,
      received: body.confirmName,
    });
    return NextResponse.json(
      { error: "Project name confirmation does not match" },
      { status: 400 },
    );
  }

  // Cannot delete the org's last project
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projects)
    .where(eq(projects.orgId, membership.orgId));

  if (countResult[0].count <= 1) {
    logger.warn("project_delete_last_project_attempt", {
      requestId,
      route: "/api/projects/[id]",
      method: "DELETE",
      userId: session.user.id,
      orgId: membership.orgId,
      projectId: id,
    });
    return NextResponse.json(
      { error: "Cannot delete the organization's last project" },
      { status: 400 },
    );
  }

  await db.delete(projects).where(eq(projects.id, id));

  logger.info("project_delete_completed", {
    requestId,
    route: "/api/projects/[id]",
    method: "DELETE",
    userId: session.user.id,
    orgId: membership.orgId,
    projectId: id,
    reason: body.reason,
  });

  return NextResponse.json({ success: true, requestId });
}
