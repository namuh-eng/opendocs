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

export function readGitHubSourceFromSettings(
  settings: Record<string, unknown> | null | undefined,
): GitHubSourceSelection | null {
  const candidate = settings?.githubSource;
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const source = candidate as Record<string, unknown>;
  if (
    typeof source.repoFullName !== "string" ||
    typeof source.owner !== "string" ||
    typeof source.repo !== "string" ||
    (source.sourceType !== "connected_repo" &&
      source.sourceType !== "public_repo")
  ) {
    return null;
  }

  return {
    repoFullName: source.repoFullName,
    owner: source.owner,
    repo: source.repo,
    installationId:
      typeof source.installationId === "string"
        ? source.installationId
        : undefined,
    branch: typeof source.branch === "string" ? source.branch : undefined,
    path: typeof source.path === "string" ? source.path : undefined,
    sourceType: source.sourceType,
  };
}

export function resolveGitHubSource(params: {
  repoUrl?: string | null;
  repoBranch?: string | null;
  repoPath?: string | null;
  settings?: Record<string, unknown> | null;
}): GitHubSourceSelection | null {
  const fromSettings = readGitHubSourceFromSettings(params.settings);
  if (fromSettings) {
    return {
      ...fromSettings,
      branch: params.repoBranch?.trim() || fromSettings.branch,
      path: params.repoPath?.trim() || fromSettings.path,
    };
  }

  return buildGitHubSourceSelection({
    repoUrl: params.repoUrl,
    repoBranch: params.repoBranch,
    repoPath: params.repoPath,
  });
}

export function mergeProjectSettingsWithGitHubSource(
  existing: Record<string, unknown> | null | undefined,
  selection: GitHubSourceSelection | null,
): Record<string, unknown> {
  const next = { ...(existing ?? {}) };

  if (selection) {
    next.githubSource = selection;
  } else {
    next.githubSource = undefined;
  }

  return next;
}
