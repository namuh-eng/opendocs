/**
 * Git settings utilities — helpers for repo cloning, VCS provider switching,
 * and git configuration validation.
 */

export type VcsProvider = "github" | "gitlab";

export type CloneVisibility = "public" | "private";

export interface GitSettingsData {
  repoUrl: string | null;
  repoBranch: string;
  repoPath: string;
  vcsProvider: VcsProvider;
}

/** Extract owner/repo from a GitHub URL */
export function parseGitHubUrl(
  url: string,
): { owner: string; repo: string } | null {
  const match = url.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/.]+)/,
  );
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

/** Build a GitHub clone URL */
export function buildCloneUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}.git`;
}

/** Build a GitHub app install URL (generic) */
export function buildGitHubAppInstallUrl(): string {
  return "https://github.com/apps";
}

/** Validate a git branch name (simplified) */
export function isValidBranchName(branch: string): boolean {
  if (!branch || branch.length > 256) return false;
  // No spaces, no "..", no control chars, no trailing dots/slashes
  if (/\s/.test(branch)) return false;
  if (branch.includes("..")) return false;
  if (branch.startsWith(".") || branch.endsWith(".")) return false;
  if (branch.startsWith("/") || branch.endsWith("/")) return false;
  if (branch.includes("//")) return false;
  // Only allowed chars
  return /^[a-zA-Z0-9._\-/]+$/.test(branch);
}

/** Validate a repo path (must start with /) */
export function isValidRepoPath(path: string): boolean {
  if (!path || path.length > 512) return false;
  if (!path.startsWith("/")) return false;
  // No ".." traversal
  if (path.includes("..")) return false;
  return true;
}

/** Build a ZIP download URL for a GitHub repo */
export function buildZipDownloadUrl(
  owner: string,
  repo: string,
  branch: string,
): string {
  return `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;
}

/** Get display name for a repo URL (owner/repo format) */
export function getRepoDisplayName(url: string | null): string {
  if (!url) return "Not configured";
  const parsed = parseGitHubUrl(url);
  if (parsed) return `${parsed.owner}/${parsed.repo}`;
  return url;
}

/** Default git settings */
export const DEFAULT_GIT_SETTINGS: GitSettingsData = {
  repoUrl: null,
  repoBranch: "main",
  repoPath: "/",
  vcsProvider: "github",
};
