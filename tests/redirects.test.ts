import {
  DEFAULT_DOCS_CONFIG,
  type DocsConfig,
  type RedirectEntry,
  findRedirect,
  mergeDocsConfig,
  validateDocsConfig,
} from "@/lib/docs-config";
import { describe, expect, it } from "vitest";

// ── findRedirect ────────────────────────────────────────────────────────

describe("findRedirect", () => {
  const redirects: RedirectEntry[] = [
    { source: "/old-page", destination: "/new-page" },
    { source: "guides/setup", destination: "getting-started/quickstart" },
    { source: "/API/Reference", destination: "/api-reference/overview" },
  ];

  it("returns destination when source matches exactly", () => {
    expect(findRedirect(redirects, "/old-page")).toBe("/new-page");
  });

  it("matches case-insensitively", () => {
    expect(findRedirect(redirects, "/OLD-PAGE")).toBe("/new-page");
    expect(findRedirect(redirects, "/api/reference")).toBe(
      "/api-reference/overview",
    );
  });

  it("strips leading/trailing slashes for matching", () => {
    expect(findRedirect(redirects, "old-page")).toBe("/new-page");
    expect(findRedirect(redirects, "/old-page/")).toBe("/new-page");
    expect(findRedirect(redirects, "///old-page///")).toBe("/new-page");
  });

  it("matches paths without leading slash", () => {
    expect(findRedirect(redirects, "guides/setup")).toBe(
      "getting-started/quickstart",
    );
    expect(findRedirect(redirects, "/guides/setup")).toBe(
      "getting-started/quickstart",
    );
  });

  it("returns null when no redirect matches", () => {
    expect(findRedirect(redirects, "/nonexistent")).toBeNull();
  });

  it("returns null for empty redirects array", () => {
    expect(findRedirect([], "/old-page")).toBeNull();
  });

  it("returns first match when multiple redirects have same source", () => {
    const dupes: RedirectEntry[] = [
      { source: "/foo", destination: "/bar" },
      { source: "/foo", destination: "/baz" },
    ];
    expect(findRedirect(dupes, "/foo")).toBe("/bar");
  });
});

// ── validateDocsConfig — redirect validation ────────────────────────────

describe("validateDocsConfig redirects", () => {
  function configWith(redirects: RedirectEntry[]): DocsConfig {
    return {
      ...DEFAULT_DOCS_CONFIG,
      advanced: { ...DEFAULT_DOCS_CONFIG.advanced, redirects },
    };
  }

  it("passes with empty redirects", () => {
    expect(validateDocsConfig(configWith([])).valid).toBe(true);
  });

  it("passes with valid redirects", () => {
    const result = validateDocsConfig(
      configWith([{ source: "/old", destination: "/new" }]),
    );
    expect(result.valid).toBe(true);
  });

  it("fails when source is empty", () => {
    const result = validateDocsConfig(
      configWith([{ source: "", destination: "/new" }]),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("source");
    }
  });

  it("fails when destination is empty", () => {
    const result = validateDocsConfig(
      configWith([{ source: "/old", destination: "" }]),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("destination");
    }
  });

  it("fails when source equals destination", () => {
    const result = validateDocsConfig(
      configWith([{ source: "/same", destination: "/same" }]),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("same");
    }
  });

  it("validates multiple redirects", () => {
    const result = validateDocsConfig(
      configWith([
        { source: "/a", destination: "/b" },
        { source: "/c", destination: "/d" },
      ]),
    );
    expect(result.valid).toBe(true);
  });
});

// ── mergeDocsConfig — redirects array preservation ──────────────────────

describe("mergeDocsConfig redirects", () => {
  it("defaults to empty redirects array", () => {
    const config = mergeDocsConfig(undefined);
    expect(config.advanced.redirects).toEqual([]);
  });

  it("preserves existing redirects array", () => {
    const redirects = [{ source: "/old", destination: "/new" }];
    const config = mergeDocsConfig({
      advanced: { redirects } as Record<string, unknown>,
    });
    expect(config.advanced.redirects).toEqual(redirects);
  });

  it("falls back to empty array when redirects is not an array", () => {
    const config = mergeDocsConfig({
      advanced: { redirects: "invalid" } as unknown as Record<string, unknown>,
    });
    expect(config.advanced.redirects).toEqual([]);
  });
});
