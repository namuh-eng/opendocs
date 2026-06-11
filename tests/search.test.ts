/**
 * Tests for docs site full-text search (feature-016)
 *
 * Covers:
 * - Search utility functions (snippet extraction, highlight, ranking)
 * - Public search API endpoint behavior
 * - Recent searches persistence logic
 */

import { describe, expect, it } from "vitest";

// ── Search utility functions ──────────────────────────────────────────────────

/**
 * Import search helpers once implemented.
 * These will live in src/lib/search.ts
 */
import {
  buildTsQuery,
  extractSnippet,
  getBreadcrumb,
  groupResultsBySection,
  highlightMatches,
  type SearchResult,
} from "@/lib/search";

describe("buildTsQuery", () => {
  it("converts a simple query to tsquery-compatible format", () => {
    const result = buildTsQuery("getting started");
    expect(result).toBe("getting & started:*");
  });

  it("handles single word", () => {
    expect(buildTsQuery("install")).toBe("install:*");
  });

  it("strips empty tokens", () => {
    expect(buildTsQuery("  hello   world  ")).toBe("hello & world:*");
  });

  it("escapes special characters", () => {
    const result = buildTsQuery("node.js & react");
    // & is stripped, last word gets prefix match
    expect(result).toBe("node.js & react:*");
  });

  it("returns empty string for empty input", () => {
    expect(buildTsQuery("")).toBe("");
  });

  it("handles prefix matching with :*", () => {
    const result = buildTsQuery("instal");
    // Single word gets prefix matching
    expect(result).toBe("instal:*");
  });

  it("applies prefix matching to last word only for multi-word queries", () => {
    const result = buildTsQuery("getting start");
    expect(result).toBe("getting & start:*");
  });
});

describe("extractSnippet", () => {
  const longContent =
    "This is the introduction to our documentation. It covers many topics including installation, configuration, and deployment. The installation process involves downloading the package and running the setup wizard.";

  it("returns content snippet around the matched query", () => {
    const snippet = extractSnippet(longContent, "installation");
    expect(snippet).toContain("installation");
    expect(snippet.length).toBeLessThanOrEqual(200);
  });

  it("returns beginning of content if no match found", () => {
    const snippet = extractSnippet(longContent, "nonexistent");
    expect(snippet).toBe(longContent.slice(0, 160));
  });

  it("handles empty content", () => {
    expect(extractSnippet("", "test")).toBe("");
  });

  it("handles null content", () => {
    expect(extractSnippet(null, "test")).toBe("");
  });

  it("strips markdown syntax from snippet", () => {
    const mdContent =
      "## Installation\n\nRun `npm install` to get **started** with the _project_.";
    const snippet = extractSnippet(mdContent, "install");
    expect(snippet).not.toContain("##");
    expect(snippet).not.toContain("**");
    expect(snippet).not.toContain("`");
    expect(snippet).not.toContain("_project_");
  });
});

describe("highlightMatches", () => {
  it("wraps matched text with <mark> tags", () => {
    const result = highlightMatches("Getting Started Guide", "started");
    expect(result).toBe("Getting <mark>Started</mark> Guide");
  });

  it("is case-insensitive", () => {
    const result = highlightMatches("Installation Guide", "installation");
    expect(result).toBe("<mark>Installation</mark> Guide");
  });

  it("highlights multiple occurrences", () => {
    const result = highlightMatches("test the test suite", "test");
    expect(result).toBe("<mark>test</mark> the <mark>test</mark> suite");
  });

  it("escapes HTML in the text before highlighting", () => {
    const result = highlightMatches("<script>alert('xss')</script>", "script");
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;");
  });

  it("returns original text when no match", () => {
    const result = highlightMatches("Hello World", "missing");
    expect(result).toBe("Hello World");
  });
});

describe("getBreadcrumb", () => {
  it("converts path to breadcrumb parts", () => {
    const result = getBreadcrumb("getting-started/installation");
    expect(result).toEqual(["Getting Started", "Installation"]);
  });

  it("handles single segment", () => {
    expect(getBreadcrumb("overview")).toEqual(["Overview"]);
  });

  it("handles deeply nested paths", () => {
    const result = getBreadcrumb("api/reference/endpoints/users");
    expect(result).toEqual(["Api", "Reference", "Endpoints", "Users"]);
  });

  it("handles hyphens by capitalizing each word", () => {
    const result = getBreadcrumb("quick-start");
    expect(result).toEqual(["Quick Start"]);
  });
});

describe("groupResultsBySection", () => {
  const results: SearchResult[] = [
    {
      path: "getting-started/install",
      title: "Install",
      description: null,
      snippet: "...",
      breadcrumb: ["Getting Started", "Install"],
    },
    {
      path: "getting-started/setup",
      title: "Setup",
      description: null,
      snippet: "...",
      breadcrumb: ["Getting Started", "Setup"],
    },
    {
      path: "api/overview",
      title: "API Overview",
      description: null,
      snippet: "...",
      breadcrumb: ["Api", "Overview"],
    },
    {
      path: "overview",
      title: "Overview",
      description: null,
      snippet: "...",
      breadcrumb: ["Overview"],
    },
  ];

  it("groups results by first breadcrumb segment", () => {
    const groups = groupResultsBySection(results);
    expect(groups).toHaveLength(3);
    expect(groups[0].section).toBe("Getting Started");
    expect(groups[0].results).toHaveLength(2);
    expect(groups[1].section).toBe("Api");
    expect(groups[1].results).toHaveLength(1);
  });

  it("returns empty array for empty results", () => {
    expect(groupResultsBySection([])).toEqual([]);
  });
});
