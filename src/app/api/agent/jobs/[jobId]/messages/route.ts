/**
 * POST /api/agent/jobs/{jobId}/messages — send a follow-up message
 *
 * Session-authenticated (dashboard use).
 */

import { isAsyncSimulationEnabled } from "@/lib/async-execution";
import { db } from "@/lib/db";
import { agentJobs, orgMemberships, projects } from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";
import { getServerSession } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const requestId = createRequestId();
  const session = await getServerSession();
  if (!session) {
    logger.warn("agent_job_message_create_unauthorized", {
      requestId,
      route: "/api/agent/jobs/[jobId]/messages",
      method: "POST",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    logger.warn("agent_job_message_create_invalid_json", {
      requestId,
      route: "/api/agent/jobs/[jobId]/messages",
      method: "POST",
      userId: session.user.id,
      jobId,
    });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content || content.length === 0) {
    logger.warn("agent_job_message_create_missing_content", {
      requestId,
      route: "/api/agent/jobs/[jobId]/messages",
      method: "POST",
      userId: session.user.id,
      jobId,
    });
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(agentJobs)
    .where(eq(agentJobs.id, jobId))
    .limit(1);

  if (rows.length === 0) {
    logger.warn("agent_job_message_create_missing", {
      requestId,
      route: "/api/agent/jobs/[jobId]/messages",
      method: "POST",
      userId: session.user.id,
      jobId,
    });
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const job = rows[0];

  // Verify access
  const projectRows = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, job.projectId))
    .limit(1);

  if (projectRows.length === 0) {
    logger.warn("agent_job_message_create_missing_project", {
      requestId,
      route: "/api/agent/jobs/[jobId]/messages",
      method: "POST",
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
    logger.warn("agent_job_message_create_forbidden", {
      requestId,
      route: "/api/agent/jobs/[jobId]/messages",
      method: "POST",
      userId: session.user.id,
      jobId,
      projectId: job.projectId,
    });
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "pending" && job.status !== "running") {
    logger.warn("agent_job_message_create_invalid_status", {
      requestId,
      route: "/api/agent/jobs/[jobId]/messages",
      method: "POST",
      userId: session.user.id,
      jobId,
      status: job.status,
    });
    return NextResponse.json(
      { error: `Cannot send messages to a ${job.status} job` },
      { status: 409 },
    );
  }

  const userMessage = {
    role: "user" as const,
    content,
    timestamp: new Date().toISOString(),
  };

  const updatedMessages = [...job.messages, userMessage];

  const [updatedJob] = await db
    .update(agentJobs)
    .set({ messages: updatedMessages, updatedAt: new Date() })
    .where(eq(agentJobs.id, jobId))
    .returning();

  logger.info("agent_job_message_create_completed", {
    requestId,
    route: "/api/agent/jobs/[jobId]/messages",
    method: "POST",
    userId: session.user.id,
    jobId,
    projectId: updatedJob.projectId,
    status: updatedJob.status,
    simulationEnabled: isAsyncSimulationEnabled(),
  });

  return NextResponse.json({
    id: updatedJob.id,
    projectId: updatedJob.projectId,
    prompt: updatedJob.prompt,
    status: updatedJob.status,
    prUrl: updatedJob.prUrl,
    messages: updatedJob.messages,
    createdAt: updatedJob.createdAt.toISOString(),
    updatedAt: updatedJob.updatedAt.toISOString(),
    executionMode: isAsyncSimulationEnabled() ? "simulation" : "manual",
    requestId,
  });
}
