import { parseGitHubUrl } from "@/lib/git-settings";

export interface GitHubSourceSelection {
  repoFullName: string;
  owner: string;
  repo: string;
  installationId?: string;
  branch?: string;
  path?: string;
  sourceType: "connected_repo" | "public_repo";
}

export function buildGitHubSourceSelection(params: {
  repoUrl?: string | null;
  installationId?: string | null;
  repoBranch?: string | null;
  repoPath?: string | null;
}): GitHubSourceSelection | null {
  const repoUrl = params.repoUrl?.trim();
  if (!repoUrl) {
    return null;
  }

  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    return null;
  }

  return {
    repoFullName: `${parsed.owner}/${parsed.repo}`,
    owner: parsed.owner,
    repo: parsed.repo,
    installationId: params.installationId?.trim() || undefined,
    branch: params.repoBranch?.trim() || undefined,
    path: params.repoPath?.trim() || undefined,
    sourceType: params.installationId ? "connected_repo" : "public_repo",
  };
}

export function mergeProjectSettingsWithGitHubSource(
  existing: Record<string, unknown> | null | undefined,
  selection: GitHubSourceSelection | null,
): Record<string, unknown> {
  const next = { ...(existing ?? {}) };

  if (selection) {
    next.githubSource = selection;
  } else {
    delete next.githubSource;
  }

  return next;
}
