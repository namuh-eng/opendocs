import {
  DEFAULT_NAVIGATION,
  type NavAnchor,
  type NavGroup,
  type NavPage,
  type NavTab,
  type NavigationConfig,
  countPages,
  createAnchor,
  createGroup,
  createPage,
  createTab,
  findDuplicatePaths,
  getAllPaths,
  isValidHref,
  isValidLabel,
  isValidPath,
  labelToPath,
  mergeNavigation,
  moveItem,
  validateNavEntry,
  validateNavPage,
  validateNavigation,
} from "@/lib/navigation";
import { describe, expect, it } from "vitest";

// ── isValidLabel ─────────────────────────────────────────────────────────────

describe("isValidLabel", () => {
  it("accepts normal labels", () => {
    expect(isValidLabel("Getting started")).toBe(true);
    expect(isValidLabel("API reference")).toBe(true);
    expect(isValidLabel("A")).toBe(true);
  });

  it("rejects empty or whitespace-only labels", () => {
    expect(isValidLabel("")).toBe(false);
    expect(isValidLabel("   ")).toBe(false);
  });

  it("rejects labels exceeding 100 characters", () => {
    expect(isValidLabel("a".repeat(101))).toBe(false);
    expect(isValidLabel("a".repeat(100))).toBe(true);
  });
});

// ── isValidPath ──────────────────────────────────────────────────────────────

describe("isValidPath", () => {
  it("accepts valid paths", () => {
    expect(isValidPath("introduction")).toBe(true);
    expect(isValidPath("getting-started")).toBe(true);
    expect(isValidPath("api/users")).toBe(true);
    expect(isValidPath("a")).toBe(true);
  });

  it("rejects paths with uppercase or spaces", () => {
    expect(isValidPath("Getting Started")).toBe(false);
    expect(isValidPath("UPPER")).toBe(false);
  });

  it("rejects paths starting/ending with hyphens", () => {
    expect(isValidPath("-invalid")).toBe(false);
    expect(isValidPath("invalid-")).toBe(false);
  });

  it("rejects empty paths", () => {
    expect(isValidPath("")).toBe(false);
  });
});

// ── isValidHref ──────────────────────────────────────────────────────────────

describe("isValidHref", () => {
  it("accepts absolute paths and URLs", () => {
    expect(isValidHref("/docs")).toBe(true);
    expect(isValidHref("https://example.com")).toBe(true);
    expect(isValidHref("http://localhost:3015")).toBe(true);
  });

  it("rejects relative paths and empty strings", () => {
    expect(isValidHref("")).toBe(false);
    expect(isValidHref("relative/path")).toBe(false);
  });
});

// ── validateNavPage ──────────────────────────────────────────────────────────

describe("validateNavPage", () => {
  it("validates a correct page", () => {
    const page: NavPage = {
      type: "page",
      label: "Quickstart",
      path: "quickstart",
    };
    expect(validateNavPage(page)).toEqual({ valid: true, error: "" });
  });

  it("rejects page with invalid label", () => {
    const page: NavPage = { type: "page", label: "", path: "quickstart" };
    const result = validateNavPage(page);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("label");
  });

  it("rejects page with invalid path", () => {
    const page: NavPage = {
      type: "page",
      label: "Intro",
      path: "Invalid Path",
    };
    const result = validateNavPage(page);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("path");
  });
});

// ── validateNavEntry ─────────────────────────────────────────────────────────

describe("validateNavEntry", () => {
  it("validates a group with pages", () => {
    const group: NavGroup = {
      type: "group",
      label: "Guides",
      pages: [{ type: "page", label: "Intro", path: "intro" }],
    };
    expect(validateNavEntry(group)).toEqual({ valid: true, error: "" });
  });

  it("rejects group with invalid label", () => {
    const group: NavGroup = { type: "group", label: "", pages: [] };
    expect(validateNavEntry(group).valid).toBe(false);
  });

  it("rejects group with invalid page inside", () => {
    const group: NavGroup = {
      type: "group",
      label: "Guides",
      pages: [{ type: "page", label: "Bad", path: "UPPER CASE" }],
    };
    expect(validateNavEntry(group).valid).toBe(false);
  });

  it("validates a tab entry", () => {
    const tab: NavTab = { type: "tab", label: "Docs", href: "/" };
    expect(validateNavEntry(tab)).toEqual({ valid: true, error: "" });
  });

  it("rejects tab with invalid href", () => {
    const tab: NavTab = { type: "tab", label: "Docs", href: "not-a-url" };
    expect(validateNavEntry(tab).valid).toBe(false);
  });

  it("validates an anchor entry", () => {
    const anchor: NavAnchor = {
      type: "anchor",
      label: "Blog",
      href: "https://blog.example.com",
    };
    expect(validateNavEntry(anchor)).toEqual({ valid: true, error: "" });
  });

  it("rejects anchor with invalid href", () => {
    const anchor: NavAnchor = { type: "anchor", label: "Blog", href: "" };
    expect(validateNavEntry(anchor).valid).toBe(false);
  });
});

// ── validateNavigation ───────────────────────────────────────────────────────

describe("validateNavigation", () => {
  it("validates the default navigation", () => {
    expect(validateNavigation(DEFAULT_NAVIGATION)).toEqual({
      valid: true,
      error: "",
    });
  });

  it("rejects null config", () => {
    expect(validateNavigation(null as unknown as NavigationConfig).valid).toBe(
      false,
    );
  });

  it("rejects config without entries array", () => {
    expect(validateNavigation({} as NavigationConfig).valid).toBe(false);
  });

  it("rejects config exceeding 200 entries", () => {
    const entries = Array.from({ length: 201 }, (_, i) => ({
      type: "tab" as const,
      label: `Tab ${i}`,
    }));
    expect(validateNavigation({ entries }).valid).toBe(false);
  });
});

// ── mergeNavigation ──────────────────────────────────────────────────────────

describe("mergeNavigation", () => {
  it("returns default for null/undefined", () => {
    expect(mergeNavigation(null)).toEqual(DEFAULT_NAVIGATION);
    expect(mergeNavigation(undefined)).toEqual(DEFAULT_NAVIGATION);
  });

  it("returns default for empty entries", () => {
    expect(mergeNavigation({ entries: [] })).toEqual(DEFAULT_NAVIGATION);
  });

  it("returns provided config when entries exist", () => {
    const config = { entries: [{ type: "tab" as const, label: "Custom" }] };
    expect(mergeNavigation(config)).toEqual(config);
  });
});

// ── Factory helpers ──────────────────────────────────────────────────────────

describe("factory helpers", () => {
  it("createGroup returns a group with empty pages", () => {
    const group = createGroup("Guides", "book");
    expect(group).toEqual({
      type: "group",
      label: "Guides",
      icon: "book",
      pages: [],
    });
  });

  it("createPage returns a page", () => {
    const page = createPage("Intro", "intro", "file");
    expect(page).toEqual({
      type: "page",
      label: "Intro",
      path: "intro",
      icon: "file",
    });
  });

  it("createTab returns a tab", () => {
    const tab = createTab("Docs", "/");
    expect(tab).toEqual({ type: "tab", label: "Docs", href: "/" });
  });

  it("createAnchor returns an anchor", () => {
    const anchor = createAnchor("Blog", "https://blog.com", "link");
    expect(anchor).toEqual({
      type: "anchor",
      label: "Blog",
      href: "https://blog.com",
      icon: "link",
    });
  });
});

// ── moveItem ─────────────────────────────────────────────────────────────────

describe("moveItem", () => {
  it("moves an item forward", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("moves an item backward", () => {
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("returns same array for out-of-bounds indices", () => {
    expect(moveItem(["a", "b"], -1, 0)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });

  it("no-ops when from === to", () => {
    expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "b", "c"]);
  });
});

// ── countPages ───────────────────────────────────────────────────────────────

describe("countPages", () => {
  it("counts pages across groups", () => {
    const config: NavigationConfig = {
      entries: [
        { type: "tab", label: "Docs" },
        {
          type: "group",
          label: "G1",
          pages: [{ type: "page", label: "P1", path: "p1" }],
        },
        {
          type: "group",
          label: "G2",
          pages: [
            { type: "page", label: "P2", path: "p2" },
            { type: "page", label: "P3", path: "p3" },
          ],
        },
      ],
    };
    expect(countPages(config)).toBe(3);
  });

  it("returns 0 for tabs/anchors only", () => {
    const config: NavigationConfig = {
      entries: [{ type: "tab", label: "Docs" }],
    };
    expect(countPages(config)).toBe(0);
  });
});

// ── getAllPaths / findDuplicatePaths ──────────────────────────────────────────

describe("getAllPaths", () => {
  it("returns all page paths", () => {
    const config: NavigationConfig = {
      entries: [
        {
          type: "group",
          label: "G1",
          pages: [
            { type: "page", label: "A", path: "a" },
            { type: "page", label: "B", path: "b" },
          ],
        },
      ],
    };
    expect(getAllPaths(config)).toEqual(["a", "b"]);
  });
});

describe("findDuplicatePaths", () => {
  it("finds duplicates", () => {
    const config: NavigationConfig = {
      entries: [
        {
          type: "group",
          label: "G1",
          pages: [
            { type: "page", label: "A", path: "intro" },
            { type: "page", label: "B", path: "intro" },
          ],
        },
      ],
    };
    expect(findDuplicatePaths(config)).toEqual(["intro"]);
  });

  it("returns empty for unique paths", () => {
    expect(findDuplicatePaths(DEFAULT_NAVIGATION)).toEqual([]);
  });
});

// ── labelToPath ──────────────────────────────────────────────────────────────

describe("labelToPath", () => {
  it("converts labels to slugified paths", () => {
    expect(labelToPath("Getting Started")).toBe("getting-started");
    expect(labelToPath("API Reference")).toBe("api-reference");
    expect(labelToPath("Hello World!")).toBe("hello-world");
  });

  it("handles special characters", () => {
    expect(labelToPath("What's New?")).toBe("whats-new");
    expect(labelToPath("C++ Guide")).toBe("c-guide");
  });

  it("collapses multiple hyphens", () => {
    expect(labelToPath("foo   bar")).toBe("foo-bar");
  });
});
