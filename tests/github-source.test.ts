import {
  buildGitHubSourceSelection,
  mergeProjectSettingsWithGitHubSource,
} from "@/lib/github-source";
import { describe, expect, it } from "vitest";

describe("github-source helpers", () => {
  it("builds connected repo source metadata", () => {
    expect(
      buildGitHubSourceSelection({
        repoUrl: "https://github.com/namuh-eng/opendocs",
        installationId: "inst_123",
        repoBranch: "main",
        repoPath: "/docs",
      }),
    ).toEqual({
      repoFullName: "namuh-eng/opendocs",
      owner: "namuh-eng",
      repo: "opendocs",
      installationId: "inst_123",
      branch: "main",
      path: "/docs",
      sourceType: "connected_repo",
    });
  });

  it("builds public repo source metadata without installation id", () => {
    expect(
      buildGitHubSourceSelection({
        repoUrl: "https://github.com/acme/docs",
      }),
    ).toEqual({
      repoFullName: "acme/docs",
      owner: "acme",
      repo: "docs",
      installationId: undefined,
      branch: undefined,
      path: undefined,
      sourceType: "public_repo",
    });
  });

  it("merges github source into settings", () => {
    expect(
      mergeProjectSettingsWithGitHubSource(
        { vcsProvider: "github" },
        buildGitHubSourceSelection({
          repoUrl: "https://github.com/acme/docs",
        }),
      ),
    ).toEqual({
      vcsProvider: "github",
      githubSource: {
        repoFullName: "acme/docs",
        owner: "acme",
        repo: "docs",
        installationId: undefined,
        branch: undefined,
        path: undefined,
        sourceType: "public_repo",
      },
    });
  });

  it("preserves incoming docs config settings while refreshing github source", () => {
    expect(
      mergeProjectSettingsWithGitHubSource(
        {
          githubSource: { repoFullName: "old/repo" },
          docsConfig: {
            visualBranding: { primaryColor: "#16A34A" },
          },
        },
        buildGitHubSourceSelection({
          repoUrl: "https://github.com/acme/docs",
          repoBranch: "main",
        }),
        {
          docsConfig: {
            visualBranding: { primaryColor: "#FF0000" },
          },
        },
      ),
    ).toMatchObject({
      docsConfig: {
        visualBranding: { primaryColor: "#FF0000" },
      },
      githubSource: {
        repoFullName: "acme/docs",
        branch: "main",
      },
    });
  });
});
