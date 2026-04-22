import { enqueueDeployment } from "@/lib/async-execution";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  deployments,
  orgMemberships,
  organizations,
  projects,
} from "@/lib/db/schema";
import { validateTriggerDeploymentRequest } from "@/lib/deployments";
import { createRequestId, logger } from "@/lib/logger";
import { desc, eq } from "drizzle-orm";
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

/** GET /api/deployments — list deployments for the user's active project */
export async function GET() {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("deployments_list_unauthorized", {
      requestId,
      route: "/api/deployments",
      method: "GET",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveUserProject(session.user.id);
  if (!ctx) {
    logger.info("deployments_list_no_project", {
      requestId,
      route: "/api/deployments",
      method: "GET",
      userId: session.user.id,
    });
    return NextResponse.json({ deployments: [], requestId });
  }

  const rows = await db
    .select({
      id: deployments.id,
      projectId: deployments.projectId,
      status: deployments.status,
      commitSha: deployments.commitSha,
      commitMessage: deployments.commitMessage,
      startedAt: deployments.startedAt,
      endedAt: deployments.endedAt,
      createdAt: deployments.createdAt,
    })
    .from(deployments)
    .where(eq(deployments.projectId, ctx.project.id))
    .orderBy(desc(deployments.createdAt))
    .limit(50);

  logger.info("deployments_list_completed", {
    requestId,
    route: "/api/deployments",
    method: "GET",
    projectId: ctx.project.id,
    deploymentCount: rows.length,
  });

  return NextResponse.json({ deployments: rows, requestId });
}

/** POST /api/deployments — trigger a new deployment */
export async function POST(request: Request) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("deployments_trigger_unauthorized", {
      requestId,
      route: "/api/deployments",
      method: "POST",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveUserProject(session.user.id);
  if (!ctx) {
    logger.warn("deployments_trigger_no_project", {
      requestId,
      route: "/api/deployments",
      method: "POST",
      userId: session.user.id,
    });
    return NextResponse.json({ error: "No project found" }, { status: 403 });
  }

  if (ctx.role !== "admin" && ctx.role !== "editor") {
    logger.warn("deployments_trigger_forbidden", {
      requestId,
      route: "/api/deployments",
      method: "POST",
      userId: session.user.id,
      role: ctx.role,
      projectId: ctx.project.id,
    });
    return NextResponse.json(
      { error: "Only admins and editors can trigger deployments" },
      { status: 403 },
    );
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine for manual trigger
  }

  const validation = validateTriggerDeploymentRequest(body);
  if (!validation.valid) {
    logger.warn("deployments_trigger_invalid_request", {
      requestId,
      route: "/api/deployments",
      method: "POST",
      projectId: ctx.project.id,
      error: validation.error,
    });
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const commitMessage =
    validation.valid && "commitMessage" in validation
      ? (validation.commitMessage ?? "Manual Update")
      : "Manual Update";

  const commitSha =
    validation.valid && "commitSha" in validation
      ? (validation.commitSha ?? null)
      : null;

  const [deployment] = await db
    .insert(deployments)
    .values({
      projectId: ctx.project.id,
      status: "queued",
      commitSha,
      commitMessage,
    })
    .returning();

  const enqueueResult = await enqueueDeployment(
    deployment.id,
    ctx.project.id,
  );

  logger.info("deployments_trigger_completed", {
    requestId,
    route: "/api/deployments",
    method: "POST",
    projectId: ctx.project.id,
    deploymentId: deployment.id,
    queuedStatus: "queued",
    simulationEnabled: enqueueResult.mode === "simulation",
    executionHandoff: enqueueResult.handoff,
  });

  return NextResponse.json(
    {
      deployment: {
        ...deployment,
        status: "queued",
        executionMode: enqueueResult.mode,
        executionHandoff: enqueueResult.handoff,
      },
      requestId,
    },
    { status: 201 },
  );
}

