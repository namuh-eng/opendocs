import { attachResolvedGitHubSource } from "@/lib/project-response";
import { describe, expect, it } from "vitest";

describe("attachResolvedGitHubSource", () => {
  it("adds resolved githubSource from settings metadata", () => {
    const result = attachResolvedGitHubSource({
      id: "project-1",
      repoUrl: "https://github.com/acme/docs",
      repoBranch: "main",
      repoPath: "/docs",
      settings: {
        githubSource: {
          repoFullName: "acme/docs-private",
          owner: "acme",
          repo: "docs-private",
          installationId: "inst_123",
          branch: "develop",
          path: "/guides",
          sourceType: "connected_repo",
        },
      },
    });

    expect(result.githubSource).toEqual({
      repoFullName: "acme/docs-private",
      owner: "acme",
      repo: "docs-private",
      installationId: "inst_123",
      branch: "main",
      path: "/docs",
      sourceType: "connected_repo",
    });
  });
});
