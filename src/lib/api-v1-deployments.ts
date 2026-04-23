/**
 * Utilities for the v1 deployment REST API.
 *
 * POST /api/v1/project/update/{projectId} — trigger a deployment
 * GET  /api/v1/project/update-status/{statusId} — check deployment status
 *
 * Auth: Bearer token with an admin API key (mint_ prefix).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Extract Bearer token from Authorization header value. */
export function extractBearerToken(
  header: string | null | undefined,
): string | null {
  if (!header) return null;
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/** Validate that a string is a valid UUID v4 format. */
export function validateProjectId(id: string): boolean {
  return UUID_RE.test(id);
}

export interface DeploymentExecutionOptions {
  simulated?: boolean;
  handoff?: "simulated" | "manual_followup_required";
}

interface DeploymentRow {
  id: string;
  projectId: string;
  status: string;
  commitSha: string | null;
  commitMessage: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
}

/** Format the trigger-deployment response (just statusId + status). */
export function formatDeploymentTriggerResponse(
  deployment: DeploymentRow,
  options?: DeploymentExecutionOptions,
): {
  statusId: string;
  status: string;
  executionMode?: "simulation" | "manual";
  executionHandoff?: "simulated" | "manual_followup_required";
} {
  return {
    statusId: deployment.id,
    status: deployment.status,
    executionMode: options?.simulated ? "simulation" : "manual",
    executionHandoff:
      options?.handoff ??
      (options?.simulated ? "simulated" : "manual_followup_required"),
  };
}

/** Format the deployment status response. Returns null if deployment is null. */
export function formatDeploymentStatusResponse(
  deployment: DeploymentRow | null,
  options?: DeploymentExecutionOptions,
): {
  statusId: string;
  status: string;
  commitSha: string | null;
  commitMessage: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  executionMode?: "simulation" | "manual";
  executionHandoff?: "simulated" | "manual_followup_required";
} | null {
  if (!deployment) return null;

  return {
    statusId: deployment.id,
    status: deployment.status,
    commitSha: deployment.commitSha,
    commitMessage: deployment.commitMessage,
    startedAt: deployment.startedAt?.toISOString() ?? null,
    endedAt: deployment.endedAt?.toISOString() ?? null,
    createdAt: deployment.createdAt.toISOString(),
    executionMode: options?.simulated ? "simulation" : "manual",
    executionHandoff:
      options?.handoff ??
      (options?.simulated ? "simulated" : "manual_followup_required"),
  };
}
