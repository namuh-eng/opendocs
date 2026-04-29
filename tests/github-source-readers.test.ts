import { resolveGitHubSource } from "@/lib/github-source";
import { describe, expect, it } from "vitest";

describe("github-source readers", () => {
  it("prefers settings.githubSource over reparsing repoUrl", () => {
    expect(
      resolveGitHubSource({
        repoUrl: "https://github.com/example/wrong-repo",
        repoBranch: "develop",
        repoPath: "/guides",
        settings: {
          githubSource: {
            repoFullName: "namuh-eng/opendocs",
            owner: "namuh-eng",
            repo: "opendocs",
            installationId: "inst_123",
            branch: "main",
            path: "/docs",
            sourceType: "connected_repo",
          },
        },
      }),
    ).toEqual({
      repoFullName: "namuh-eng/opendocs",
      owner: "namuh-eng",
      repo: "opendocs",
      installationId: "inst_123",
      branch: "develop",
      path: "/guides",
      sourceType: "connected_repo",
    });
  });

  it("falls back to repoUrl when githubSource is missing", () => {
    expect(
      resolveGitHubSource({
        repoUrl: "https://github.com/acme/docs",
        repoBranch: "main",
        repoPath: "/",
        settings: {},
      }),
    ).toEqual({
      repoFullName: "acme/docs",
      owner: "acme",
      repo: "docs",
      installationId: undefined,
      branch: "main",
      path: "/",
      sourceType: "public_repo",
    });
  });
});
