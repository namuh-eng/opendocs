import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deployments, orgMemberships, projects } from "@/lib/db/schema";
import { isValidStatus } from "@/lib/deployments";
import { createRequestId, logger } from "@/lib/logger";

/** POST /api/deployments/[id]/complete — mark a deployment as succeeded/failed */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("deployment_complete_unauthorized", {
      requestId,
      route: "/api/deployments/[id]/complete",
      method: "POST",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify deployment exists
  const rows = await db
    .select()
    .from(deployments)
    .where(eq(deployments.id, id))
    .limit(1);

  if (rows.length === 0) {
    logger.warn("deployment_complete_missing", {
      requestId,
      route: "/api/deployments/[id]/complete",
      method: "POST",
      deploymentId: id,
    });
    return NextResponse.json(
      { error: "Deployment not found" },
      { status: 404 },
    );
  }

  const deployment = rows[0];

  // Verify user has access to the project's org
  const projectRows = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, deployment.projectId))
    .limit(1);

  if (projectRows.length === 0) {
    logger.warn("deployment_complete_missing_project", {
      requestId,
      route: "/api/deployments/[id]/complete",
      method: "POST",
      deploymentId: id,
    });
    return NextResponse.json(
      { error: "Deployment not found" },
      { status: 404 },
    );
  }

  const memberRows = await db
    .select({ role: orgMemberships.role })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.userId, session.user.id),
        eq(orgMemberships.orgId, projectRows[0].orgId),
      ),
    )
    .limit(1);

  if (memberRows.length === 0) {
    logger.warn("deployment_complete_forbidden", {
      requestId,
      route: "/api/deployments/[id]/complete",
      method: "POST",
      deploymentId: id,
      userId: session.user.id,
    });
    return NextResponse.json(
      { error: "Deployment not found" },
      { status: 404 },
    );
  }

  const body = await request.json();
  const newStatus = body.status;

  if (!newStatus || !isValidStatus(newStatus)) {
    logger.warn("deployment_complete_invalid_status", {
      requestId,
      route: "/api/deployments/[id]/complete",
      method: "POST",
      deploymentId: id,
      providedStatus: typeof newStatus === "string" ? newStatus : "unknown",
    });
    return NextResponse.json(
      {
        error:
          "Invalid status. Must be one of: queued, in_progress, succeeded, failed",
      },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = { status: newStatus };

  if (newStatus === "in_progress") {
    updates.startedAt = new Date();
  }

  if (newStatus === "succeeded" || newStatus === "failed") {
    updates.endedAt = new Date();
    // Update project status back to active or error
    const projectStatus = newStatus === "succeeded" ? "active" : "error";
    await db
      .update(projects)
      .set({ status: projectStatus })
      .where(eq(projects.id, deployment.projectId));
  }

  const [updated] = await db
    .update(deployments)
    .set(updates)
    .where(eq(deployments.id, id))
    .returning();

  logger.info("deployment_complete_completed", {
    requestId,
    route: "/api/deployments/[id]/complete",
    method: "POST",
    deploymentId: id,
    projectId: deployment.projectId,
    newStatus,
  });

  return NextResponse.json({ deployment: updated, requestId });
}
