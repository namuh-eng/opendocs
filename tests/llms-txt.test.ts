import { describe, expect, it } from "vitest";
import {
  buildProjectBaseUrl,
  generateLlmsFullTxt,
  generateLlmsTxt,
} from "@/lib/llms-txt";

describe("buildProjectBaseUrl", () => {
  it("uses customDomain when available", () => {
    expect(
      buildProjectBaseUrl({
        customDomain: "docs.example.com",
        subdomain: "my-project.mintlify.dev",
        slug: "my-project",
      }),
    ).toBe("https://docs.example.com");
  });

  it("uses subdomain when no customDomain", () => {
    expect(
      buildProjectBaseUrl({
        customDomain: null,
        subdomain: "my-project.mintlify.dev",
        slug: "my-project",
      }),
    ).toBe("https://my-project.mintlify.dev");
  });

  it("falls back to docsSiteUrl(slug)", () => {
    expect(
      buildProjectBaseUrl({
        customDomain: null,
        subdomain: null,
        slug: "my-project",
      }),
    ).toBe("http://localhost:3015/docs/my-project");
  });
});

describe("generateLlmsTxt", () => {
  const pages = [
    { path: "/introduction", title: "Introduction", content: "Hello world" },
    {
      path: "/getting-started",
      title: "Getting Started",
      content: "Start here",
    },
    {
      path: "/api-reference/overview",
      title: "API Reference",
      content: "API docs",
    },
  ];

  it("generates header with project name", () => {
    const result = generateLlmsTxt(
      "My Docs",
      "https://docs.example.com",
      pages,
    );
    expect(result).toContain("# My Docs");
  });

  it("generates one line per page with markdown link", () => {
    const result = generateLlmsTxt(
      "My Docs",
      "https://docs.example.com",
      pages,
    );
    expect(result).toContain(
      "- [Introduction](https://docs.example.com/introduction)",
    );
    expect(result).toContain(
      "- [Getting Started](https://docs.example.com/getting-started)",
    );
    expect(result).toContain(
      "- [API Reference](https://docs.example.com/api-reference/overview)",
    );
  });

  it("handles empty pages list", () => {
    const result = generateLlmsTxt("My Docs", "https://docs.example.com", []);
    expect(result).toContain("No published pages.");
  });

  it("handles paths without leading slash", () => {
    const result = generateLlmsTxt("My Docs", "https://docs.example.com", [
      { path: "no-slash", title: "No Slash", content: "" },
    ]);
    expect(result).toContain("- [No Slash](https://docs.example.com/no-slash)");
  });
});

describe("generateLlmsFullTxt", () => {
  const pages = [
    {
      path: "/introduction",
      title: "Introduction",
      content: "# Welcome\n\nThis is the intro.",
    },
    {
      path: "/getting-started",
      title: "Getting Started",
      content: "## Step 1\n\nDo this first.",
    },
  ];

  it("generates header with project name", () => {
    const result = generateLlmsFullTxt(
      "My Docs",
      "https://docs.example.com",
      pages,
    );
    expect(result).toContain("# My Docs — Full Documentation");
  });

  it("includes full content of each page", () => {
    const result = generateLlmsFullTxt(
      "My Docs",
      "https://docs.example.com",
      pages,
    );
    expect(result).toContain("# Welcome\n\nThis is the intro.");
    expect(result).toContain("## Step 1\n\nDo this first.");
  });

  it("includes page title as section header", () => {
    const result = generateLlmsFullTxt(
      "My Docs",
      "https://docs.example.com",
      pages,
    );
    expect(result).toContain("## Introduction");
    expect(result).toContain("## Getting Started");
  });

  it("includes source URL for each page", () => {
    const result = generateLlmsFullTxt(
      "My Docs",
      "https://docs.example.com",
      pages,
    );
    expect(result).toContain("Source: https://docs.example.com/introduction");
    expect(result).toContain(
      "Source: https://docs.example.com/getting-started",
    );
  });

  it("separates pages with horizontal rules", () => {
    const result = generateLlmsFullTxt(
      "My Docs",
      "https://docs.example.com",
      pages,
    );
    expect(result).toContain("---");
  });

  it("handles empty pages list", () => {
    const result = generateLlmsFullTxt(
      "My Docs",
      "https://docs.example.com",
      [],
    );
    expect(result).toContain("No published pages.");
  });

  it("handles null content with placeholder", () => {
    const result = generateLlmsFullTxt("My Docs", "https://docs.example.com", [
      { path: "/empty", title: "Empty", content: null },
    ]);
    expect(result).toContain("*(empty page)*");
  });
});
