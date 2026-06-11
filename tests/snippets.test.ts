/**
 * Tests for feature-026: Reusable snippets with variables
 * - Variable resolution: {{variableName}} syntax
 * - Snippet component: <Snippet file="snippets/path" />
 * - Snippet pages excluded from navigation
 */
import { describe, expect, it } from "vitest";
import {
  buildDocsNav,
  extractComponentBlocks,
  renderMdxContent,
} from "@/lib/mdx-renderer";
import {
  isSnippetPage,
  resolveSnippets,
  resolveVariables,
} from "@/lib/snippets";

// ── Variable Resolution ──────────────────────────────────────────────────────

describe("resolveVariables", () => {
  it("replaces {{variable}} with value from variables map", () => {
    const content = "Install with {{packageManager}} install {{packageName}}";
    const vars = { packageManager: "npm", packageName: "my-sdk" };
    expect(resolveVariables(content, vars)).toBe(
      "Install with npm install my-sdk",
    );
  });

  it("handles variables with whitespace in braces", () => {
    const content = "Hello {{ name }}!";
    const vars = { name: "World" };
    expect(resolveVariables(content, vars)).toBe("Hello World!");
  });

  it("leaves unresolved variables as-is", () => {
    const content = "Hello {{name}}, your API key is {{apiKey}}";
    const vars = { name: "Alice" };
    expect(resolveVariables(content, vars)).toBe(
      "Hello Alice, your API key is {{apiKey}}",
    );
  });

  it("handles empty variables map", () => {
    const content = "No {{vars}} here";
    expect(resolveVariables(content, {})).toBe("No {{vars}} here");
  });

  it("handles content with no variables", () => {
    const content = "Plain text with no variables";
    expect(resolveVariables(content, { foo: "bar" })).toBe(
      "Plain text with no variables",
    );
  });

  it("resolves variables inside MDX component content", () => {
    const content = "<Note>\nBase URL: {{baseUrl}}/api/v1\n</Note>";
    const vars = { baseUrl: "https://api.example.com" };
    expect(resolveVariables(content, vars)).toBe(
      "<Note>\nBase URL: https://api.example.com/api/v1\n</Note>",
    );
  });

  it("handles multiple occurrences of same variable", () => {
    const content = "{{host}}:{{port}} or {{host}}:8080";
    const vars = { host: "localhost", port: "3000" };
    expect(resolveVariables(content, vars)).toBe(
      "localhost:3000 or localhost:8080",
    );
  });

  it("does not resolve variables inside code blocks", () => {
    const content = "Use `{{variable}}` in your config";
    const vars = { variable: "replaced" };
    // Inline code should still resolve — only fenced code blocks are protected
    expect(resolveVariables(content, vars)).toBe(
      "Use `replaced` in your config",
    );
  });

  it("preserves fenced code blocks from variable resolution", () => {
    const content = "Before\n```\n{{doNotReplace}}\n```\nAfter {{replace}}";
    const vars = { doNotReplace: "BAD", replace: "GOOD" };
    const result = resolveVariables(content, vars);
    expect(result).toContain("{{doNotReplace}}");
    expect(result).toContain("GOOD");
  });
});

// ── Snippet Resolution ───────────────────────────────────────────────────────

describe("resolveSnippets", () => {
  const snippetPages = [
    {
      path: "snippets/install",
      content: "Run `npm install {{packageName}}`",
    },
    {
      path: "snippets/api-base",
      content: "Base URL: `https://api.example.com/v1`",
    },
    {
      path: "snippets/nested/deep",
      content: "Deep nested snippet content",
    },
  ];

  it("resolves <Snippet /> with file prop", () => {
    const content = 'Before\n<Snippet file="snippets/install" />\nAfter';
    const result = resolveSnippets(content, snippetPages);
    expect(result).toContain("Run `npm install {{packageName}}`");
    expect(result).toContain("Before");
    expect(result).toContain("After");
    expect(result).not.toContain("<Snippet");
  });

  it("resolves self-closing Snippet tags", () => {
    const content = '<Snippet file="snippets/api-base" />';
    const result = resolveSnippets(content, snippetPages);
    expect(result).toContain("Base URL:");
  });

  it("resolves Snippet with nested path", () => {
    const content = '<Snippet file="snippets/nested/deep" />';
    const result = resolveSnippets(content, snippetPages);
    expect(result).toBe("Deep nested snippet content");
  });

  it("leaves Snippet tag if file not found and adds warning", () => {
    const content = '<Snippet file="snippets/nonexistent" />';
    const result = resolveSnippets(content, snippetPages);
    expect(result).toContain("Snippet not found");
  });

  it("resolves multiple Snippet tags in same content", () => {
    const content =
      '<Snippet file="snippets/install" />\n\n<Snippet file="snippets/api-base" />';
    const result = resolveSnippets(content, snippetPages);
    expect(result).toContain("npm install");
    expect(result).toContain("Base URL:");
  });

  it("handles Snippet with single quotes", () => {
    const content = "<Snippet file='snippets/install' />";
    const result = resolveSnippets(content, snippetPages);
    expect(result).toContain("npm install");
  });

  it("handles Snippet with .mdx extension in file prop", () => {
    const content = '<Snippet file="snippets/install.mdx" />';
    const result = resolveSnippets(content, snippetPages);
    expect(result).toContain("npm install");
  });
});

// ── Snippet Page Detection ───────────────────────────────────────────────────

describe("isSnippetPage", () => {
  it("returns true for pages in snippets/ directory", () => {
    expect(isSnippetPage("snippets/install")).toBe(true);
    expect(isSnippetPage("snippets/nested/deep")).toBe(true);
  });

  it("returns false for regular pages", () => {
    expect(isSnippetPage("getting-started")).toBe(false);
    expect(isSnippetPage("api-reference/users")).toBe(false);
  });

  it("returns false for pages with snippet in name but not in snippets dir", () => {
    expect(isSnippetPage("guides/code-snippets")).toBe(false);
  });
});

// ── Navigation Filtering ─────────────────────────────────────────────────────

describe("buildDocsNav excludes snippet pages", () => {
  it("does not include snippet pages in navigation", () => {
    const pageList = [
      {
        id: "1",
        path: "introduction",
        title: "Introduction",
        frontmatter: null,
      },
      {
        id: "2",
        path: "getting-started",
        title: "Getting Started",
        frontmatter: null,
      },
      {
        id: "3",
        path: "snippets/install",
        title: "Install Snippet",
        frontmatter: null,
      },
      {
        id: "4",
        path: "snippets/api-base",
        title: "API Base Snippet",
        frontmatter: null,
      },
    ];

    const nav = buildDocsNav(pageList);

    // Flatten all nav items
    const allPaths: string[] = [];
    for (const entry of nav) {
      if (entry.type === "item") allPaths.push(entry.path);
      if (entry.type === "group") {
        for (const item of entry.items) allPaths.push(item.path);
      }
    }

    expect(allPaths).toContain("introduction");
    expect(allPaths).toContain("getting-started");
    expect(allPaths).not.toContain("snippets/install");
    expect(allPaths).not.toContain("snippets/api-base");
  });
});

// ── End-to-end render with snippets + variables ──────────────────────────────

describe("renderMdxContent with snippets and variables", () => {
  it("renders content after snippet and variable resolution", () => {
    // Pre-resolve snippets and variables, then render
    const snippetPages = [
      { path: "snippets/greeting", content: "Hello **{{name}}**!" },
    ];
    const vars = { name: "Developer" };

    let content = '<Snippet file="snippets/greeting" />';
    content = resolveSnippets(content, snippetPages);
    content = resolveVariables(content, vars);

    const html = renderMdxContent(content);
    expect(html).toContain("Developer");
    expect(html).toContain("<strong>");
  });
});
