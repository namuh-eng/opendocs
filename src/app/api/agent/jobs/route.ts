/**
 * GET /api/agent/jobs — list agent jobs for the current user's active project
 * POST /api/agent/jobs — create a new agent job
 *
 * Session-authenticated (dashboard use), not API-key-based.
 */

import { enqueueAgentJob, isAsyncSimulationEnabled } from "@/lib/async-execution";
import { db } from "@/lib/db";
import { agentJobs, orgMemberships, projects } from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";
import { getServerSession } from "@/lib/session";
import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

async function resolveProject(userId: string) {
  const membership = await db
    .select({ orgId: orgMemberships.orgId })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, userId))
    .limit(1);

  if (membership.length === 0) return null;

  const orgId = membership[0].orgId;
  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.orgId, orgId))
    .orderBy(projects.createdAt)
    .limit(1);

  return projectRows[0] ?? null;
}

export async function GET() {
  const requestId = createRequestId();
  const session = await getServerSession();
  if (!session) {
    logger.warn("agent_jobs_list_unauthorized", {
      requestId,
      route: "/api/agent/jobs",
      method: "GET",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await resolveProject(session.user.id);
  if (!project) {
    logger.info("agent_jobs_list_no_project", {
      requestId,
      route: "/api/agent/jobs",
      method: "GET",
      userId: session.user.id,
    });
    return NextResponse.json({ jobs: [], requestId });
  }

  const jobs = await db
    .select()
    .from(agentJobs)
    .where(eq(agentJobs.projectId, project.id))
    .orderBy(desc(agentJobs.createdAt))
    .limit(50);

  logger.info("agent_jobs_list_completed", {
    requestId,
    route: "/api/agent/jobs",
    method: "GET",
    userId: session.user.id,
    projectId: project.id,
    jobCount: jobs.length,
  });

  return NextResponse.json({
    jobs: jobs.map((j) => ({
      id: j.id,
      prompt: j.prompt,
      status: j.status,
      prUrl: j.prUrl,
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
    })),
    requestId,
  });
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  const session = await getServerSession();
  if (!session) {
    logger.warn("agent_jobs_create_unauthorized", {
      requestId,
      route: "/api/agent/jobs",
      method: "POST",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await resolveProject(session.user.id);
  if (!project) {
    logger.warn("agent_jobs_create_no_project", {
      requestId,
      route: "/api/agent/jobs",
      method: "POST",
      userId: session.user.id,
    });
    return NextResponse.json({ error: "No project found" }, { status: 404 });
  }

  let body: { prompt?: string };
  try {
    body = await request.json();
  } catch {
    logger.warn("agent_jobs_create_invalid_json", {
      requestId,
      route: "/api/agent/jobs",
      method: "POST",
      projectId: project.id,
    });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt || prompt.length === 0) {
    logger.warn("agent_jobs_create_missing_prompt", {
      requestId,
      route: "/api/agent/jobs",
      method: "POST",
      projectId: project.id,
    });
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  if (prompt.length > 5000) {
    logger.warn("agent_jobs_create_prompt_too_long", {
      requestId,
      route: "/api/agent/jobs",
      method: "POST",
      projectId: project.id,
      promptLength: prompt.length,
    });
    return NextResponse.json(
      { error: "prompt must be 5000 characters or less" },
      { status: 400 },
    );
  }

  const initialMessages = [
    {
      role: "user" as const,
      content: prompt,
      timestamp: new Date().toISOString(),
    },
  ];

  const [job] = await db
    .insert(agentJobs)
    .values({
      projectId: project.id,
      prompt,
      status: "pending",
      messages: initialMessages,
    })
    .returning();

  await enqueueAgentJob(job.id);

  logger.info("agent_jobs_create_completed", {
    requestId,
    route: "/api/agent/jobs",
    method: "POST",
    userId: session.user.id,
    projectId: project.id,
    jobId: job.id,
    simulationEnabled: isAsyncSimulationEnabled(),
  });

  return NextResponse.json(
    {
      id: job.id,
      prompt: job.prompt,
      status: job.status,
      prUrl: job.prUrl,
      messages: job.messages,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      executionMode: isAsyncSimulationEnabled() ? "simulation" : "manual",
      requestId,
    },
    { status: 201 },
  );
}

