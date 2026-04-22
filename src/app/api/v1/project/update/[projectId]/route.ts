/**
 * POST /api/v1/project/update/{projectId}
 *
 * Trigger a deployment for a project. Requires Bearer token auth with an admin API key.
 * Returns { statusId, status } on success.
 */

import { authenticateApiKey } from "@/lib/api-key-auth";
import {
  formatDeploymentTriggerResponse,
  validateProjectId,
} from "@/lib/api-v1-deployments";
import { enqueueDeployment } from "@/lib/async-execution";
import { db } from "@/lib/db";
import { deployments, projects } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  // Validate projectId format first (before auth, to give clear error)
  if (!validateProjectId(projectId)) {
    return NextResponse.json(
      { error: "Invalid project ID format" },
      { status: 400 },
    );
  }

  // Authenticate via API key
  const authHeader = _request.headers.get("authorization");
  const keyAuth = await authenticateApiKey(authHeader);
  if (!keyAuth) {
    return NextResponse.json(
      { error: "Unauthorized — valid admin API key required" },
      { status: 401 },
    );
  }

  // Only admin keys can trigger deployments
  if (keyAuth.type !== "admin") {
    return NextResponse.json(
      { error: "Forbidden — admin API key required" },
      { status: 403 },
    );
  }

  // Verify project exists and belongs to the key's org
  const projectRows = await db
    .select({ id: projects.id, orgId: projects.orgId })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, keyAuth.orgId)))
    .limit(1);

  if (projectRows.length === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Create the deployment
  const [deployment] = await db
    .insert(deployments)
    .values({
      projectId,
      status: "queued",
      commitMessage: "API-triggered update",
    })
    .returning();

  const enqueueResult = await enqueueDeployment(deployment.id, projectId);

  return NextResponse.json(
    formatDeploymentTriggerResponse(deployment, {
      simulated: enqueueResult.mode === "simulation",
    }),
    {
      status: 201,
    },
  );
}
