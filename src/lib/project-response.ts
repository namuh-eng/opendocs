import { resolveGitHubSource } from "@/lib/github-source";

interface ProjectWithGitFields {
  repoUrl?: string | null;
  repoBranch?: string | null;
  repoPath?: string | null;
  settings?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export function attachResolvedGitHubSource<T extends ProjectWithGitFields>(
  project: T,
): T & { githubSource: ReturnType<typeof resolveGitHubSource> } {
  return {
    ...project,
    githubSource: resolveGitHubSource({
      repoUrl: project.repoUrl,
      repoBranch: project.repoBranch,
      repoPath: project.repoPath,
      settings: project.settings,
    }),
  };
}
