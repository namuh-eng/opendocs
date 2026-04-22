/**
 * POST /api/v1/agent/send-message/{jobId}
 *
 * Send a follow-up message to an agent job. Requires Bearer token auth with an admin API key.
 * Body: { content: string }
 * Appends the message to the job's messages array and returns updated job.
 */

import { authenticateApiKey } from "@/lib/api-key-auth";
import {
  formatAgentJobResponse,
  validateSendMessageInput,
  validateUuid,
} from "@/lib/api-v1-agents";
import { isAsyncSimulationEnabled } from "@/lib/async-execution";
import { db } from "@/lib/db";
import { agentJobs, projects } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
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

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateSendMessageInput(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
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

  // Only allow messages on active jobs (pending or running)
  if (job.status !== "pending" && job.status !== "running") {
    return NextResponse.json(
      { error: `Cannot send messages to a ${job.status} job` },
      { status: 409 },
    );
  }

  // Append the message
  const newMessage = {
    role: "user" as const,
    content: validation.data.content,
    timestamp: new Date().toISOString(),
  };

  const updatedMessages = [...job.messages, newMessage];

  const [updatedJob] = await db
    .update(agentJobs)
    .set({
      messages: updatedMessages,
      updatedAt: new Date(),
    })
    .where(eq(agentJobs.id, jobId))
    .returning();

  return NextResponse.json(
    formatAgentJobResponse(updatedJob, {
      simulated: isAsyncSimulationEnabled(),
    }),
  );
}
