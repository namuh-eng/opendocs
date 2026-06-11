/**
 * Utilities for the v1 agent job REST API.
 *
 * POST /api/v1/agent/create-job — create an agent job
 * GET /api/v1/agent/get-job/{jobId} — get job status
 * POST /api/v1/agent/send-message/{jobId} — send follow-up message
 */

import type { InferSelectModel } from "drizzle-orm";
import type { ExecutionMetadataOptions } from "@/lib/async-metadata";
import { resolveExecutionMetadata } from "@/lib/async-metadata";
import type { agentJobs } from "@/lib/db/schema";

type AgentJob = InferSelectModel<typeof agentJobs>;

export interface CreateJobInput {
  projectId: string;
  prompt: string;
}

export interface SendMessageInput {
  content: string;
}

export interface AgentExecutionOptions extends ExecutionMetadataOptions {}

export interface AgentJobResponse {
  id: string;
  projectId: string;
  prompt: string;
  status: string;
  prUrl: string | null;
  messages: { role: "user" | "agent"; content: string; timestamp: string }[];
  createdAt: string;
  updatedAt: string;
  executionMode?: "simulation" | "manual";
  executionHandoff?: "simulated" | "manual_followup_required";
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUuid(value: string | undefined | null): boolean {
  if (!value) return false;
  return UUID_RE.test(value);
}

export function validateCreateJobInput(
  body: unknown,
): { valid: true; data: CreateJobInput } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" };
  }

  const { projectId, prompt } = body as Record<string, unknown>;

  if (!projectId || typeof projectId !== "string") {
    return {
      valid: false,
      error: "projectId is required and must be a string",
    };
  }

  if (!validateUuid(projectId)) {
    return { valid: false, error: "projectId must be a valid UUID" };
  }

  if (!prompt || typeof prompt !== "string") {
    return { valid: false, error: "prompt is required and must be a string" };
  }

  if (prompt.trim().length === 0) {
    return { valid: false, error: "prompt must not be empty" };
  }

  return { valid: true, data: { projectId, prompt: prompt.trim() } };
}

export function validateSendMessageInput(
  body: unknown,
): { valid: true; data: SendMessageInput } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" };
  }

  const { content } = body as Record<string, unknown>;

  if (!content || typeof content !== "string") {
    return { valid: false, error: "content is required and must be a string" };
  }

  if (content.trim().length === 0) {
    return { valid: false, error: "content must not be empty" };
  }

  return { valid: true, data: { content: content.trim() } };
}

export function formatAgentJobResponse(
  job: AgentJob,
  options?: AgentExecutionOptions,
): AgentJobResponse {
  return {
    id: job.id,
    projectId: job.projectId,
    prompt: job.prompt,
    status: job.status,
    prUrl: job.prUrl,
    messages: job.messages,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    ...resolveExecutionMetadata(options),
  };
}
