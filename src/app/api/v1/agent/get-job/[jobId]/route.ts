/**
 * GET /api/v1/agent/get-job/{jobId}
 *
 * Get agent job status and details. Requires Bearer token auth with an admin API key.
 * Returns the job with status, PR link, and messages.
 */

import { authenticateApiKey } from "@/lib/api-key-auth";
import { formatAgentJobResponse, validateUuid } from "@/lib/api-v1-agents";
import { getAgentJobExecutionMetadata } from "@/lib/async-execution";
import { db } from "@/lib/db";
import { agentJobs, projects } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  if (!validateUuid(jobId)) {
    return NextResponse.json(
      { error: "Invalid job ID format" },
      { status: 400 },
    );
  }

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

  // Look up the job
  const rows = await db
    .select()
    .from(agentJobs)
    .where(eq(agentJobs.id, jobId))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const job = rows[0];

  // Verify project belongs to the key's org
  const projectRows = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(
      and(eq(projects.id, job.projectId), eq(projects.orgId, keyAuth.orgId)),
    )
    .limit(1);

  if (projectRows.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(
    formatAgentJobResponse(job, getAgentJobExecutionMetadata(job.status)),
  );
}
