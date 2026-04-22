/**
 * GET /api/agent/jobs/{jobId} — get a single agent job with messages
 *
 * Session-authenticated (dashboard use).
 */

import { db } from "@/lib/db";
import { agentJobs, orgMemberships, projects } from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";
import { getServerSession } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const requestId = createRequestId();
  const session = await getServerSession();
  if (!session) {
    logger.warn("agent_job_get_unauthorized", {
      requestId,
      route: "/api/agent/jobs/[jobId]",
      method: "GET",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;

  const rows = await db
    .select()
    .from(agentJobs)
    .where(eq(agentJobs.id, jobId))
    .limit(1);

  if (rows.length === 0) {
    logger.warn("agent_job_get_missing", {
      requestId,
      route: "/api/agent/jobs/[jobId]",
      method: "GET",
      userId: session.user.id,
      jobId,
    });
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const job = rows[0];

  // Verify access: user must be in the same org as the project
  const projectRows = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, job.projectId))
    .limit(1);

  if (projectRows.length === 0) {
    logger.warn("agent_job_get_missing_project", {
      requestId,
      route: "/api/agent/jobs/[jobId]",
      method: "GET",
      userId: session.user.id,
      jobId,
    });
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
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
    logger.warn("agent_job_get_forbidden", {
      requestId,
      route: "/api/agent/jobs/[jobId]",
      method: "GET",
      userId: session.user.id,
      jobId,
      projectId: job.projectId,
    });
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  logger.info("agent_job_get_completed", {
    requestId,
    route: "/api/agent/jobs/[jobId]",
    method: "GET",
    userId: session.user.id,
    jobId,
    projectId: job.projectId,
    status: job.status,
  });

  return NextResponse.json({
    id: job.id,
    projectId: job.projectId,
    prompt: job.prompt,
    status: job.status,
    prUrl: job.prUrl,
    messages: job.messages,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    requestId,
  });
}
