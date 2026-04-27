import { enqueuePreviewDeployment } from "@/lib/async-execution";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  auditLogs,
  deployments,
  orgMemberships,
  organizations,
  projects,
} from "@/lib/db/schema";
import {
  generatePreviewUrl,
  validateCreatePreviewRequest,
} from "@/lib/deployments";
import { createRequestId, logger } from "@/lib/logger";
import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** Resolve user's first org + first project. Returns null if not found. */
async function resolveUserProject(userId: string) {
  const membership = await db
    .select({
      orgId: orgMemberships.orgId,
      role: orgMemberships.role,
      orgSlug: organizations.slug,
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(eq(orgMemberships.userId, userId))
    .limit(1);

  if (membership.length === 0) return null;

  const orgId = membership[0].orgId;

  const orgProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      subdomain: projects.subdomain,
    })
    .from(projects)
    .where(eq(projects.orgId, orgId))
    .orderBy(projects.createdAt)
    .limit(1);

  if (orgProjects.length === 0) return null;

  return {
    orgId,
    role: membership[0].role,
    project: orgProjects[0],
  };
}

/** GET /api/deployments/previews — list preview deployments for the user's active project */
export async function GET() {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("previews_list_unauthorized", {
      requestId,
      route: "/api/deployments/previews",
      method: "GET",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveUserProject(session.user.id);
  if (!ctx) {
    logger.info("previews_list_no_project", {
      requestId,
      route: "/api/deployments/previews",
      method: "GET",
      userId: session.user.id,
    });
    return NextResponse.json({ previews: [], requestId });
  }

  const rows = await db
    .select({
      id: deployments.id,
      projectId: deployments.projectId,
      type: deployments.type,
      status: deployments.status,
      branch: deployments.branch,
      previewUrl: deployments.previewUrl,
      commitSha: deployments.commitSha,
      commitMessage: deployments.commitMessage,
      startedAt: deployments.startedAt,
      endedAt: deployments.endedAt,
      createdAt: deployments.createdAt,
    })
    .from(deployments)
    .where(
      and(
        eq(deployments.projectId, ctx.project.id),
        eq(deployments.type, "preview"),
      ),
    )
    .orderBy(desc(deployments.createdAt))
    .limit(50);

  logger.info("previews_list_completed", {
    requestId,
    route: "/api/deployments/previews",
    method: "GET",
    projectId: ctx.project.id,
    previewCount: rows.length,
  });

  return NextResponse.json({ previews: rows, requestId });
}

/** POST /api/deployments/previews — create a preview deployment */
export async function POST(request: Request) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("previews_create_unauthorized", {
      requestId,
      route: "/api/deployments/previews",
      method: "POST",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveUserProject(session.user.id);
  if (!ctx) {
    logger.warn("previews_create_no_project", {
      requestId,
      route: "/api/deployments/previews",
      method: "POST",
      userId: session.user.id,
    });
    return NextResponse.json({ error: "No project found" }, { status: 403 });
  }

  if (ctx.role !== "admin" && ctx.role !== "editor") {
    logger.warn("previews_create_forbidden", {
      requestId,
      route: "/api/deployments/previews",
      method: "POST",
      userId: session.user.id,
      role: ctx.role,
      projectId: ctx.project.id,
    });
    return NextResponse.json(
      { error: "Only admins and editors can create preview deployments" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    logger.warn("previews_create_invalid_json", {
      requestId,
      route: "/api/deployments/previews",
      method: "POST",
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateCreatePreviewRequest(body);
  if (!validation.valid) {
    logger.warn("previews_create_invalid_request", {
      requestId,
      route: "/api/deployments/previews",
      method: "POST",
      projectId: ctx.project.id,
      error: validation.error,
    });
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const previewUrl = generatePreviewUrl(
    validation.branch,
    ctx.project.subdomain,
  );

  const commitMessage =
    validation.commitMessage ?? `Preview: ${validation.branch}`;
  const commitSha = validation.commitSha ?? null;

  const [deployment] = await db
    .insert(deployments)
    .values({
      projectId: ctx.project.id,
      type: "preview",
      status: "queued",
      branch: validation.branch,
      previewUrl,
      commitSha,
      commitMessage,
    })
    .returning();

  const enqueueResult = await enqueuePreviewDeployment(
    deployment.id,
    ctx.project.id,
  );

  if (enqueueResult.handoff === "manual_followup_required") {
    await db.insert(auditLogs).values({
      orgId: ctx.orgId,
      userId: session.user.id,
      action: "preview_deployment_manual_handoff_required",
      details: {
        requestId,
        deploymentId: deployment.id,
        projectId: ctx.project.id,
        branch: validation.branch,
        executionMode: enqueueResult.mode,
      },
    });
  }

  logger.info("previews_create_completed", {
    requestId,
    route: "/api/deployments/previews",
    method: "POST",
    projectId: ctx.project.id,
    deploymentId: deployment.id,
    branch: validation.branch,
    simulationEnabled: enqueueResult.mode === "simulation",
    executionHandoff: enqueueResult.handoff,
  });

  return NextResponse.json(
    {
      preview: {
        ...deployment,
        status: "queued",
        previewUrl,
        executionMode: enqueueResult.mode,
        executionHandoff: enqueueResult.handoff,
      },
      requestId,
    },
    { status: 201 },
  );
}
