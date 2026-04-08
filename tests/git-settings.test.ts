import {
  DEFAULT_GIT_SETTINGS,
  buildCloneUrl,
  buildZipDownloadUrl,
  getRepoDisplayName,
  isValidBranchName,
  isValidRepoPath,
  parseGitHubUrl,
} from "@/lib/git-settings";
import { validateUpdateProjectRequest } from "@/lib/projects";
import { describe, expect, it } from "vitest";

describe("git-settings", () => {
  describe("parseGitHubUrl", () => {
    it("parses standard GitHub URL", () => {
      expect(parseGitHubUrl("https://github.com/acme/docs")).toEqual({
        owner: "acme",
        repo: "docs",
      });
    });

    it("parses GitHub URL with www", () => {
      expect(parseGitHubUrl("https://www.github.com/acme/docs")).toEqual({
        owner: "acme",
        repo: "docs",
      });
    });

    it("strips .git suffix from repo name", () => {
      const result = parseGitHubUrl("https://github.com/acme/docs.git");
      expect(result).toEqual({ owner: "acme", repo: "docs" });
    });

    it("returns null for non-GitHub URL", () => {
      expect(parseGitHubUrl("https://gitlab.com/acme/docs")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(parseGitHubUrl("")).toBeNull();
    });

    it("returns null for malformed URL", () => {
      expect(parseGitHubUrl("not-a-url")).toBeNull();
    });
  });

  describe("buildCloneUrl", () => {
    it("builds correct clone URL", () => {
      expect(buildCloneUrl("acme", "docs")).toBe(
        "https://github.com/acme/docs.git",
      );
    });
  });

  describe("buildZipDownloadUrl", () => {
    it("builds correct ZIP URL with branch", () => {
      expect(buildZipDownloadUrl("acme", "docs", "main")).toBe(
        "https://github.com/acme/docs/archive/refs/heads/main.zip",
      );
    });

    it("handles custom branch names", () => {
      expect(buildZipDownloadUrl("acme", "docs", "develop")).toBe(
        "https://github.com/acme/docs/archive/refs/heads/develop.zip",
      );
    });
  });

  describe("isValidBranchName", () => {
    it("accepts standard branch names", () => {
      expect(isValidBranchName("main")).toBe(true);
      expect(isValidBranchName("develop")).toBe(true);
      expect(isValidBranchName("feature/new-thing")).toBe(true);
      expect(isValidBranchName("release-1.0")).toBe(true);
      expect(isValidBranchName("v2.3.4")).toBe(true);
    });

    it("rejects empty string", () => {
      expect(isValidBranchName("")).toBe(false);
    });

    it("rejects branches with spaces", () => {
      expect(isValidBranchName("my branch")).toBe(false);
    });

    it("rejects branches with ..", () => {
      expect(isValidBranchName("main..dev")).toBe(false);
    });

    it("rejects branches starting with dot", () => {
      expect(isValidBranchName(".hidden")).toBe(false);
    });

    it("rejects branches ending with dot", () => {
      expect(isValidBranchName("branch.")).toBe(false);
    });

    it("rejects branches with double slashes", () => {
      expect(isValidBranchName("feature//thing")).toBe(false);
    });

    it("rejects branches starting or ending with slash", () => {
      expect(isValidBranchName("/feature")).toBe(false);
      expect(isValidBranchName("feature/")).toBe(false);
    });

    it("rejects very long branch names", () => {
      expect(isValidBranchName("a".repeat(257))).toBe(false);
    });
  });

  describe("isValidRepoPath", () => {
    it("accepts root path", () => {
      expect(isValidRepoPath("/")).toBe(true);
    });

    it("accepts nested paths", () => {
      expect(isValidRepoPath("/docs")).toBe(true);
      expect(isValidRepoPath("/src/docs")).toBe(true);
    });

    it("rejects paths not starting with /", () => {
      expect(isValidRepoPath("docs")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(isValidRepoPath("")).toBe(false);
    });

    it("rejects paths with .. traversal", () => {
      expect(isValidRepoPath("/../etc")).toBe(false);
    });

    it("rejects very long paths", () => {
      expect(isValidRepoPath(`/${"a".repeat(512)}`)).toBe(false);
    });
  });

  describe("getRepoDisplayName", () => {
    it("returns owner/repo for GitHub URL", () => {
      expect(getRepoDisplayName("https://github.com/acme/docs")).toBe(
        "acme/docs",
      );
    });

    it("returns Not configured for null", () => {
      expect(getRepoDisplayName(null)).toBe("Not configured");
    });

    it("returns URL as-is for non-GitHub URL", () => {
      expect(getRepoDisplayName("https://gitlab.com/acme/docs")).toBe(
        "https://gitlab.com/acme/docs",
      );
    });
  });

  describe("DEFAULT_GIT_SETTINGS", () => {
    it("has correct defaults", () => {
      expect(DEFAULT_GIT_SETTINGS).toEqual({
        repoUrl: null,
        repoBranch: "main",
        repoPath: "/",
        vcsProvider: "github",
      });
    });
  });
});

describe("validateUpdateProjectRequest — git fields", () => {
  it("accepts valid repoBranch", () => {
    const result = validateUpdateProjectRequest({ repoBranch: "develop" });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.fields.repoBranch).toBe("develop");
    }
  });

  it("rejects non-string repoBranch", () => {
    const result = validateUpdateProjectRequest({ repoBranch: 123 });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid repoBranch", () => {
    const result = validateUpdateProjectRequest({
      repoBranch: "bad branch name",
    });
    expect(result.valid).toBe(false);
  });

  it("accepts valid repoPath", () => {
    const result = validateUpdateProjectRequest({ repoPath: "/docs" });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.fields.repoPath).toBe("/docs");
    }
  });

  it("rejects non-string repoPath", () => {
    const result = validateUpdateProjectRequest({ repoPath: 42 });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid repoPath (no leading slash)", () => {
    const result = validateUpdateProjectRequest({ repoPath: "docs" });
    expect(result.valid).toBe(false);
  });
});
