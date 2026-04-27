import { describe, expect, it, vi } from "vitest";

describe("importPublicGitHubDocs", () => {
  it("extracts markdown pages from a public repo tree", async () => {
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
          text: async () => `
<div align="center">
  <h1 align="center">Namuh Send</h1>
  <p>Some subtitle</p>
</div>

# This is a subtitle actually
`,
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
          path: "introduction",
          title: "Namuh Send",
          content: expect.stringContaining("Namuh Send"),
        },
      ]);
    }
  });

  it("extracts title from frontmatter", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/git/trees/")) {
        return {
          ok: true,
          json: async () => ({ tree: [{ path: "doc.md", type: "blob" }] }),
        };
      }
      return {
        ok: true,
        text: async () => "---\ntitle: Custom Title\n---\n# Real Title",
      };
    });
    const { importPublicGitHubDocs } = await import("@/lib/github-docs-import");
    const result = await importPublicGitHubDocs({
      repoUrl: "https://github.com/acme/docs",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    if (result.ok) {
      expect(result.pages[0].title).toBe("Custom Title");
    }
  });

  it("ignores H1 headings inside code blocks for title extraction", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/git/trees/")) {
        return {
          ok: true,
          json: async () => ({ tree: [{ path: "code.md", type: "blob" }] }),
        };
      }
      return {
        ok: true,
        text: async () => "```bash\n# Comment\n```\n# Real Title",
      };
    });
    const { importPublicGitHubDocs } = await import("@/lib/github-docs-import");
    const result = await importPublicGitHubDocs({
      repoUrl: "https://github.com/acme/docs",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    if (result.ok) {
      expect(result.pages[0].title).toBe("Real Title");
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

  it("passes custom headers through to GitHub requests for future authenticated imports", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/git/trees/")) {
        return {
          ok: true,
          json: async () => ({ tree: [{ path: "README.md", type: "blob" }] }),
        };
      }

      return {
        ok: true,
        text: async () => "# Welcome\n\nHello world",
      };
    });

    const { importGitHubDocs } = await import("@/lib/github-docs-import");
    const result = await importGitHubDocs({
      repoUrl: "https://github.com/acme/docs",
      headers: { Authorization: "Bearer secret-token" },
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/git/trees/"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer secret-token",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("raw.githubusercontent.com"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer secret-token",
        }),
      }),
    );
  });

  it("rewrites relative images and markdown links to GitHub raw and doc routes", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/git/trees/")) {
        return {
          ok: true,
          json: async () => ({
            tree: [
              { path: "README.md", type: "blob" },
              { path: "docs/guide.md", type: "blob" },
            ],
          }),
        };
      }
      if (url.includes("README.md")) {
        return {
          ok: true,
          text: async () => `
# Welcome
![Logo](assets/logo.png)
[Guide](./docs/guide.md)
[License](LICENSE)
`,
        };
      }
      return {
        ok: true,
        text: async () => "# Guide",
      };
    });

    const { importGitHubDocs } = await import("@/lib/github-docs-import");
    const result = await importGitHubDocs({
      repoUrl: "https://github.com/acme/docs",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const readme = result.pages.find((p) => p.path === "introduction");
      expect(readme?.content).toContain(
        "![Logo](https://raw.githubusercontent.com/acme/docs/main/assets/logo.png)",
      );
      expect(readme?.content).toContain("[Guide](../docs/guide)");
      // Note: we only rewrite .md links for now
      expect(readme?.content).toContain("[License](LICENSE)");
    }
  });

  it("handles relative links with titles", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/git/trees/")) {
        return {
          ok: true,
          json: async () => ({
            tree: [{ path: "README.md", type: "blob" }],
          }),
        };
      }
      return {
        ok: true,
        text: async () => `
![Dashboard](docs/assets/dashboard.png "Optional Title")
[Guide](docs/guide.md "Another Title")
`,
      };
    });

    const { importGitHubDocs } = await import("@/lib/github-docs-import");
    const result = await importGitHubDocs({
      repoUrl: "https://github.com/acme/docs",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pages[0].content).toContain(
        '![Dashboard](https://raw.githubusercontent.com/acme/docs/main/docs/assets/dashboard.png "Optional Title")',
      );
      // Fallback to GitHub URL because docs/guide.md is not in the imported pages list for this test
      expect(result.pages[0].content).toContain(
        '[Guide](https://github.com/acme/docs/blob/main/docs/guide.md "Another Title")',
      );
    }
  });

  it("excludes internal agent and repo files", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/git/trees/")) {
        return {
          ok: true,
          json: async () => ({
            tree: [
              { path: "README.md", type: "blob" },
              { path: "AGENTS.md", type: "blob" },
              { path: "CLAUDE.md", type: "blob" },
              { path: "agent_docs/notes.md", type: "blob" },
              { path: ".github/workflows/ci.yml", type: "blob" },
            ],
          }),
        };
      }
      return {
        ok: true,
        text: async () => "# README",
      };
    });

    const { importGitHubDocs } = await import("@/lib/github-docs-import");
    const result = await importGitHubDocs({
      repoUrl: "https://github.com/acme/docs",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].path).toBe("introduction");
    }
  });

  it("handles relative images inside nested docs folders", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/git/trees/")) {
        return {
          ok: true,
          json: async () => ({
            tree: [
              { path: "README.md", type: "blob" },
              { path: "docs/index.md", type: "blob" },
            ],
          }),
        };
      }
      return {
        ok: true,
        text: async () => "![Dashboard](docs/assets/dashboard.png)",
      };
    });

    const { importGitHubDocs } = await import("@/lib/github-docs-import");
    const result = await importGitHubDocs({
      repoUrl: "https://github.com/acme/docs",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const doc = result.pages.find((p) => p.path === "introduction");
      expect(doc?.content).toContain(
        "![Dashboard](https://raw.githubusercontent.com/acme/docs/main/docs/assets/dashboard.png)",
      );
    }
  });
});
