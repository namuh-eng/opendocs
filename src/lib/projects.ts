/**
 * Project utilities — slug generation, subdomain, validation, request parsing.
 */

import { validateCustomDomain } from "@/lib/domains";
import {
  isValidBranchName,
  isValidRepoPath,
  parseGitHubUrl,
} from "@/lib/git-settings";

/** Convert a project name to a URL-safe slug (lowercase, hyphens, no special chars). */
export function slugifyProject(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Generate a subdomain from org slug + project slug. */
export function generateSubdomain(
  orgSlug: string,
  projectSlug: string,
): string {
  if (orgSlug === projectSlug) return projectSlug;
  return `${orgSlug}-${projectSlug}`;
}

/** Validate a project name. Returns error string or null if valid. */
export function validateProjectName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Project name is required";
  if (trimmed.length < 2) return "Name must be at least 2 characters";
  if (trimmed.length > 128) return "Name must be at most 128 characters";
  return null;
}

/** Validate a subdomain string. */
export function validateSubdomain(subdomain: string): string | null {
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return "Subdomain must contain only lowercase letters, numbers, and hyphens";
  }
  return null;
}

/** Check if a string is a valid URL. */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/** Validate that a repository URL points to a GitHub repo. */
export function validateGitHubRepoUrl(repoUrl: string): string | null {
  const trimmed = repoUrl.trim();

  if (!trimmed) {
    return null;
  }

  if (!isValidUrl(trimmed)) {
    return "Invalid repository URL";
  }

  if (!parseGitHubUrl(trimmed)) {
    return "Repository URL must be a GitHub repository";
  }

  return null;
}

/** Validate a create-project request body. */
export function validateCreateProjectRequest(body: unknown):
  | {
      valid: true;
      name: string;
      repoUrl?: string;
      createInitialDeployment?: boolean;
    }
  | { valid: false; error: string } {
  if (
    !body ||
    typeof body !== "object" ||
    !("name" in body) ||
    typeof (body as Record<string, unknown>).name !== "string"
  ) {
    return { valid: false, error: "Project name is required" };
  }

  const name = ((body as Record<string, unknown>).name as string).trim();
  const error = validateProjectName(name);
  if (error) return { valid: false, error };

  const repoUrl = (body as Record<string, unknown>).repoUrl;
  const createInitialDeployment = (body as Record<string, unknown>)
    .createInitialDeployment;

  if (
    createInitialDeployment !== undefined &&
    typeof createInitialDeployment !== "boolean"
  ) {
    return {
      valid: false,
      error: "createInitialDeployment must be a boolean",
    };
  }

  const result: {
    valid: true;
    name: string;
    repoUrl?: string;
    createInitialDeployment?: boolean;
  } = { valid: true, name };

  if (createInitialDeployment) {
    result.createInitialDeployment = true;
  }

  if (repoUrl !== undefined && repoUrl !== null && repoUrl !== "") {
    if (typeof repoUrl !== "string") {
      return { valid: false, error: "Invalid repository URL" };
    }

    const repoUrlError = validateGitHubRepoUrl(repoUrl);
    if (repoUrlError) {
      return { valid: false, error: repoUrlError };
    }

    result.repoUrl = repoUrl.trim();
  }

  return result;
}

/** Validate an update-project request body. */
export function validateUpdateProjectRequest(
  body: unknown,
):
  | { valid: true; fields: Record<string, string> }
  | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "No fields to update" };
  }

  const raw = body as Record<string, unknown>;
  const fields: Record<string, string> = {};

  if (raw.name !== undefined) {
    if (typeof raw.name !== "string") {
      return { valid: false, error: "Name must be a string" };
    }
    const nameError = validateProjectName(raw.name);
    if (nameError) return { valid: false, error: nameError };
    fields.name = raw.name.trim();
  }

  if (raw.subdomain !== undefined) {
    if (typeof raw.subdomain !== "string") {
      return { valid: false, error: "Subdomain must be a string" };
    }
    const subdomainError = validateSubdomain(raw.subdomain);
    if (subdomainError) return { valid: false, error: subdomainError };
    fields.subdomain = raw.subdomain;
  }

  if (raw.repoUrl !== undefined) {
    if (typeof raw.repoUrl !== "string") {
      return { valid: false, error: "Repository URL must be a string" };
    }

    const trimmedRepoUrl = raw.repoUrl.trim();
    const repoUrlError = validateGitHubRepoUrl(trimmedRepoUrl);
    if (repoUrlError) {
      return { valid: false, error: repoUrlError };
    }

    fields.repoUrl = trimmedRepoUrl;
  }

  if (raw.repoBranch !== undefined) {
    if (typeof raw.repoBranch !== "string") {
      return { valid: false, error: "Branch must be a string" };
    }
    if (!isValidBranchName(raw.repoBranch)) {
      return { valid: false, error: "Invalid branch name" };
    }
    fields.repoBranch = raw.repoBranch;
  }

  if (raw.repoPath !== undefined) {
    if (typeof raw.repoPath !== "string") {
      return { valid: false, error: "Repository path must be a string" };
    }
    if (!isValidRepoPath(raw.repoPath)) {
      return {
        valid: false,
        error: "Invalid repository path — must start with /",
      };
    }
    fields.repoPath = raw.repoPath;
  }

  if (raw.customDomain !== undefined) {
    if (typeof raw.customDomain !== "string") {
      return { valid: false, error: "Custom domain must be a string" };
    }
    // Allow empty string to clear the domain
    if (raw.customDomain !== "") {
      const domainError = validateCustomDomain(raw.customDomain);
      if (domainError) return { valid: false, error: domainError };
      fields.customDomain = raw.customDomain.trim();
    } else {
      fields.customDomain = "";
    }
  }

  // Settings is a JSONB object — allow updating it
  let settingsUpdate: Record<string, unknown> | undefined;
  if (raw.settings !== undefined) {
    if (typeof raw.settings !== "object" || raw.settings === null) {
      return { valid: false, error: "Settings must be an object" };
    }
    settingsUpdate = raw.settings as Record<string, unknown>;
  }

  if (Object.keys(fields).length === 0 && !settingsUpdate) {
    return { valid: false, error: "No fields to update" };
  }

  const result: Record<string, unknown> = { ...fields };
  if (settingsUpdate) {
    result.settings = settingsUpdate;
  }

  return { valid: true, fields: result as Record<string, string> };
}
