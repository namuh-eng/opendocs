import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deployments, orgMemberships, projects } from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";

/** GET /api/deployments/[id] — get a single deployment */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("deployment_get_unauthorized", {
      requestId,
      route: "/api/deployments/[id]",
      method: "GET",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Get deployment
  const rows = await db
    .select()
    .from(deployments)
    .where(eq(deployments.id, id))
    .limit(1);

  if (rows.length === 0) {
    logger.warn("deployment_get_missing", {
      requestId,
      route: "/api/deployments/[id]",
      method: "GET",
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
    logger.warn("deployment_get_missing_project", {
      requestId,
      route: "/api/deployments/[id]",
      method: "GET",
      deploymentId: id,
    });
    return NextResponse.json(
      { error: "Deployment not found" },
      { status: 404 },
    );
  }

  const memberRows = await db
    .select({ orgId: orgMemberships.orgId })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.userId, session.user.id),
        eq(orgMemberships.orgId, projectRows[0].orgId),
      ),
    )
    .limit(1);

  if (memberRows.length === 0) {
    logger.warn("deployment_get_forbidden", {
      requestId,
      route: "/api/deployments/[id]",
      method: "GET",
      deploymentId: id,
      userId: session.user.id,
    });
    return NextResponse.json(
      { error: "Deployment not found" },
      { status: 404 },
    );
  }

  logger.info("deployment_get_completed", {
    requestId,
    route: "/api/deployments/[id]",
    method: "GET",
    deploymentId: id,
    projectId: deployment.projectId,
  });

  return NextResponse.json({ deployment, requestId });
}
