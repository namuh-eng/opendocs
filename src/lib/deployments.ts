/**
 * Deployment utilities — status helpers, formatting, validation.
 */

export type DeploymentStatus =
  | "queued"
  | "in_progress"
  | "succeeded"
  | "failed";

/** All valid deployment statuses. */
export const DEPLOYMENT_STATUSES: DeploymentStatus[] = [
  "queued",
  "in_progress",
  "succeeded",
  "failed",
];

/** Check if a string is a valid deployment status. */
export function isValidStatus(status: string): status is DeploymentStatus {
  return DEPLOYMENT_STATUSES.includes(status as DeploymentStatus);
}

/** Human-readable label for a deployment status. */
export function statusLabel(status: DeploymentStatus): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "in_progress":
      return "Updating";
    case "succeeded":
      return "Successful";
    case "failed":
      return "Failed";
  }
}

/** CSS color class for a deployment status badge. */
export function statusColor(status: DeploymentStatus): string {
  switch (status) {
    case "queued":
      return "text-gray-400 bg-gray-400/10";
    case "in_progress":
      return "text-amber-400 bg-amber-400/10";
    case "succeeded":
      return "text-emerald-400 bg-emerald-400/10";
    case "failed":
      return "text-red-400 bg-red-400/10";
  }
}

/** Dot indicator color for deployment status. */
export function statusDotColor(status: DeploymentStatus): string {
  switch (status) {
    case "queued":
      return "bg-gray-400";
    case "in_progress":
      return "bg-amber-400";
    case "succeeded":
      return "bg-emerald-400";
    case "failed":
      return "bg-red-400";
  }
}

/** Format a relative time string, e.g. "3 days ago", "just now". */
export function timeAgo(date: Date | string): string {
  const now = Date.now();
  const then =
    typeof date === "string" ? new Date(date).getTime() : date.getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

/** Truncate a commit SHA to 7 characters. */
export function shortSha(sha: string | null): string {
  if (!sha) return "";
  return sha.slice(0, 7);
}

/** Validate a trigger-deployment request body. */
export function validateTriggerDeploymentRequest(
  body: unknown,
):
  | { valid: true; commitSha?: string; commitMessage?: string }
  | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: true }; // allow empty body — manual trigger with no commit info
  }

  const raw = body as Record<string, unknown>;

  const commitSha =
    typeof raw.commitSha === "string" ? raw.commitSha.trim() : undefined;
  const commitMessage =
    typeof raw.commitMessage === "string"
      ? raw.commitMessage.trim()
      : undefined;

  if (commitSha && !/^[0-9a-f]{7,40}$/i.test(commitSha)) {
    return { valid: false, error: "Invalid commit SHA" };
  }

  return { valid: true, commitSha, commitMessage };
}

export type DeploymentType = "production" | "preview";

/** Validate a branch name (alphanumeric, hyphens, underscores, slashes, dots). */
export function isValidBranchName(branch: string): boolean {
  if (!branch || branch.length > 256) return false;
  return /^[a-zA-Z0-9._\-/]+$/.test(branch);
}

/** Generate a preview URL for a branch deployment. */
export function generatePreviewUrl(
  branch: string,
  subdomain: string | null,
): string {
  // Sanitize branch name for URL: lowercase, replace non-alphanumeric with hyphens
  const sanitized = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = subdomain ?? "docs";
  return `https://${sanitized}.preview.${base}.mintlify.app`;
}

/** Validate a create-preview-deployment request body. */
export function validateCreatePreviewRequest(
  body: unknown,
):
  | { valid: true; branch: string; commitSha?: string; commitMessage?: string }
  | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" };
  }

  const raw = body as Record<string, unknown>;

  if (typeof raw.branch !== "string" || !raw.branch.trim()) {
    return { valid: false, error: "Branch name is required" };
  }

  const branch = raw.branch.trim();
  if (!isValidBranchName(branch)) {
    return {
      valid: false,
      error:
        "Invalid branch name. Use alphanumeric characters, hyphens, underscores, dots, or slashes.",
    };
  }

  const commitSha =
    typeof raw.commitSha === "string" ? raw.commitSha.trim() : undefined;
  const commitMessage =
    typeof raw.commitMessage === "string"
      ? raw.commitMessage.trim()
      : undefined;

  if (commitSha && !/^[0-9a-f]{7,40}$/i.test(commitSha)) {
    return { valid: false, error: "Invalid commit SHA" };
  }

  return { valid: true, branch, commitSha, commitMessage };
}

/** Simulated deployment log steps (for the build process). */
export function generateDeploymentLogSteps(): string[] {
  return [
    "Verified update permissions",
    "Fetching and validating config file...",
    "Fetching .mintignore file...",
    "Fetching ASSISTANT.md file...",
    "Successfully validated docs.json",
    "Successfully fetched .mintignore",
    "No Assistant.md file found",
    "Deployment complete",
  ];
}

/** Compute deployment duration in seconds from startedAt and endedAt. */
export function deploymentDuration(
  startedAt: Date | string | null,
  endedAt: Date | string | null,
): number | null {
  if (!startedAt || !endedAt) return null;
  const start =
    typeof startedAt === "string"
      ? new Date(startedAt).getTime()
      : startedAt.getTime();
  const end =
    typeof endedAt === "string"
      ? new Date(endedAt).getTime()
      : endedAt.getTime();
  return Math.round((end - start) / 1000);
}

/** Format duration in seconds to a human-readable string. */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}
