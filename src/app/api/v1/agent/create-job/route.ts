/**
 * POST /api/v1/agent/create-job
 *
 * Create an agent job for a project. Requires Bearer token auth with an admin API key.
 * Body: { projectId: string, prompt: string }
 * Returns the created job with status "pending".
 */

import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import {
  formatAgentJobResponse,
  validateCreateJobInput,
} from "@/lib/api-v1-agents";
import { enqueueAgentJob } from "@/lib/async-execution";
import { db } from "@/lib/db";
import { agentJobs, auditLogs, projects } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
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

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateCreateJobInput(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { projectId, prompt } = validation.data;

  // Verify project exists and belongs to the key's org
  const projectRows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, keyAuth.orgId)))
    .limit(1);

  if (projectRows.length === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Create the agent job
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
      projectId,
      prompt,
      status: "pending",
      messages: initialMessages,
    })
    .returning();

  const enqueueResult = await enqueueAgentJob(job.id);

  if (enqueueResult.handoff === "manual_followup_required") {
    await db.insert(auditLogs).values({
      orgId: keyAuth.orgId,
      userId: null,
      action: "api_v1_agent_job_manual_handoff_required",
      details: {
        jobId: job.id,
        projectId,
        executionMode: enqueueResult.mode,
      },
    });
  }

  return NextResponse.json(
    formatAgentJobResponse(job, {
      simulated: enqueueResult.mode === "simulation",
      handoff: enqueueResult.handoff,
    }),
    { status: 201 },
  );
}
