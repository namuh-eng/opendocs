import { describe, expect, it, vi } from "vitest";

describe("importPublicGitHubDocs", () => {
  it("imports markdown pages from a public repo tree", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/git/trees/")) {
        return {
          ok: true,
          json: async () => ({
            tree: [
              { path: "README.md", type: "blob" },
              { path: "guides/getting-started.mdx", type: "blob" },
              { path: "assets/logo.png", type: "blob" },
            ],
          }),
        };
      }

      if (url.includes("README.md")) {
        return {
          ok: true,
          text: async () => "# Welcome\n\nHello world",
        };
      }

      return {
        ok: true,
        text: async () => "# Getting Started\n\nShip it",
      };
    });

    const { importPublicGitHubDocs } = await import("@/lib/github-docs-import");
    const result = await importPublicGitHubDocs({
      repoUrl: "https://github.com/acme/docs",
      repoBranch: "main",
      repoPath: "/",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result).toMatchObject({
      ok: true,
      status: "imported",
      source: {
        owner: "acme",
        repo: "docs",
        branch: "main",
        path: "/",
      },
    });

    if (result.ok) {
      expect(result.pages).toEqual([
        {
          path: "guides/getting-started",
          title: "Getting Started",
          content: "# Getting Started\n\nShip it",
        },
        {
          path: "readme",
          title: "Welcome",
          content: "# Welcome\n\nHello world",
        },
      ]);
    }
  });

  it("filters to the configured repo path", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/git/trees/")) {
        return {
          ok: true,
          json: async () => ({
            tree: [
              { path: "docs/index.md", type: "blob" },
              { path: "docs/api/auth.md", type: "blob" },
              { path: "blog/post.md", type: "blob" },
            ],
          }),
        };
      }

      if (url.includes("docs/index.md")) {
        return {
          ok: true,
          text: async () => "# Introduction\n\nWelcome",
        };
      }

      return {
        ok: true,
        text: async () => "# Auth\n\nUse a token",
      };
    });

    const { importPublicGitHubDocs } = await import("@/lib/github-docs-import");
    const result = await importPublicGitHubDocs({
      repoUrl: "https://github.com/acme/docs",
      repoBranch: "main",
      repoPath: "/docs",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pages.map((page) => page.path)).toEqual([
        "api/auth",
        "introduction",
      ]);
    }
  });

  it("returns no_markdown_found when the repo path has no markdown files", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ tree: [{ path: "assets/logo.png", type: "blob" }] }),
    }));

    const { importPublicGitHubDocs } = await import("@/lib/github-docs-import");
    const result = await importPublicGitHubDocs({
      repoUrl: "https://github.com/acme/docs",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result).toEqual({
      ok: false,
      status: "no_markdown_found",
      message: "No markdown files were found in the selected GitHub repository path",
    });
  });
});
