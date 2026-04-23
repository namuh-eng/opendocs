/**
 * GET /api/v1/project/update-status/{statusId}
 *
 * Check the status of a deployment. Requires Bearer token auth with an admin API key.
 * Returns deployment progress info.
 */

import { authenticateApiKey } from "@/lib/api-key-auth";
import { formatDeploymentStatusResponse } from "@/lib/api-v1-deployments";
import { getDeploymentExecutionMetadata } from "@/lib/async-execution";
import { db } from "@/lib/db";
import { deployments, projects } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ statusId: string }> },
) {
  const { statusId } = await params;

  // Authenticate via API key
  const authHeader = request.headers.get("authorization");
  const keyAuth = await authenticateApiKey(authHeader);
  if (!keyAuth) {
    return NextResponse.json(
      { error: "Unauthorized — valid admin API key required" },
      { status: 401 },
    );
  }

  if (keyAuth.type !== "admin") {
    return NextResponse.json(
      { error: "Forbidden — admin API key required" },
      { status: 403 },
    );
  }

  // Look up the deployment
  const rows = await db
    .select()
    .from(deployments)
    .where(eq(deployments.id, statusId))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Deployment not found" },
      { status: 404 },
    );
  }

  const deployment = rows[0];

  // Verify project belongs to the key's org
  const projectRows = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(
      and(
        eq(projects.id, deployment.projectId),
        eq(projects.orgId, keyAuth.orgId),
      ),
    )
    .limit(1);

  if (projectRows.length === 0) {
    return NextResponse.json(
      { error: "Deployment not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(
    formatDeploymentStatusResponse(
      deployment,
      getDeploymentExecutionMetadata(deployment.status),
    ),
  );
}
