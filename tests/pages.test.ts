import { describe, expect, it } from "vitest";

// ── Path normalization ───────────────────────────────────────────────────

describe("normalizePath", () => {
  async function getNormalizePath() {
    const mod = await import("@/lib/pages");
    return mod.normalizePath;
  }

  it("converts to lowercase and trims slashes", async () => {
    const normalize = await getNormalizePath();
    expect(normalize("/Getting-Started/")).toBe("getting-started");
  });

  it("collapses multiple slashes", async () => {
    const normalize = await getNormalizePath();
    expect(normalize("docs///intro")).toBe("docs/intro");
  });

  it("converts backslashes to forward slashes", async () => {
    const normalize = await getNormalizePath();
    expect(normalize("docs\\intro\\setup")).toBe("docs/intro/setup");
  });

  it("trims whitespace", async () => {
    const normalize = await getNormalizePath();
    expect(normalize("  hello  ")).toBe("hello");
  });
});

// ── Title from path ──────────────────────────────────────────────────────

describe("titleFromPath", () => {
  async function getTitleFromPath() {
    const mod = await import("@/lib/pages");
    return mod.titleFromPath;
  }

  it("converts kebab-case to title case", async () => {
    const title = await getTitleFromPath();
    expect(title("getting-started")).toBe("Getting Started");
  });

  it("uses last segment of multi-segment path", async () => {
    const title = await getTitleFromPath();
    expect(title("guides/quick-start")).toBe("Quick Start");
  });

  it("handles single word", async () => {
    const title = await getTitleFromPath();
    expect(title("introduction")).toBe("Introduction");
  });
});

// ── Page path validation ─────────────────────────────────────────────────

describe("validatePagePath", () => {
  async function getValidate() {
    const mod = await import("@/lib/pages");
    return mod.validatePagePath;
  }

  it("accepts valid paths", async () => {
    const validate = await getValidate();
    expect(validate("introduction")).toBeNull();
    expect(validate("guides/quickstart")).toBeNull();
    expect(validate("api-reference/endpoints")).toBeNull();
    expect(validate("v2/getting_started")).toBeNull();
  });

  it("rejects empty path", async () => {
    const validate = await getValidate();
    expect(validate("")).toBe("Page path is required");
    expect(validate("   ")).toBe("Page path is required");
  });

  it("rejects path with special characters", async () => {
    const validate = await getValidate();
    expect(validate("hello world!")).not.toBeNull();
  });

  it("rejects paths with '..'", async () => {
    const validate = await getValidate();
    expect(validate("docs/../secret")).toBe("Path must not contain '..'");
  });

  it("rejects overly long paths", async () => {
    const validate = await getValidate();
    expect(validate("a".repeat(513))).toBe(
      "Path must be at most 512 characters",
    );
  });
});

// ── Page title validation ────────────────────────────────────────────────

describe("validatePageTitle", () => {
  async function getValidate() {
    const mod = await import("@/lib/pages");
    return mod.validatePageTitle;
  }

  it("accepts valid titles", async () => {
    const validate = await getValidate();
    expect(validate("Introduction")).toBeNull();
    expect(validate("Getting Started Guide")).toBeNull();
  });

  it("rejects empty titles", async () => {
    const validate = await getValidate();
    expect(validate("")).toBe("Page title is required");
    expect(validate("   ")).toBe("Page title is required");
  });

  it("rejects titles over 256 characters", async () => {
    const validate = await getValidate();
    expect(validate("a".repeat(257))).toBe(
      "Title must be at most 256 characters",
    );
  });
});

// ── Create page request validation ───────────────────────────────────────

describe("validateCreatePageRequest", () => {
  async function getValidate() {
    const mod = await import("@/lib/pages");
    return mod.validateCreatePageRequest;
  }

  it("validates a valid request", async () => {
    const validate = await getValidate();
    expect(validate({ path: "introduction", title: "Introduction" })).toEqual({
      valid: true,
      path: "introduction",
      title: "Introduction",
    });
  });

  it("normalizes path in result", async () => {
    const validate = await getValidate();
    const result = validate({
      path: "/Getting-Started/",
      title: "Getting Started",
    });
    expect(result).toEqual({
      valid: true,
      path: "getting-started",
      title: "Getting Started",
    });
  });

  it("includes optional content and description", async () => {
    const validate = await getValidate();
    expect(
      validate({
        path: "intro",
        title: "Intro",
        content: "# Hello",
        description: "My page",
      }),
    ).toEqual({
      valid: true,
      path: "intro",
      title: "Intro",
      content: "# Hello",
      description: "My page",
    });
  });

  it("rejects missing path", async () => {
    const validate = await getValidate();
    expect(validate({ title: "Hello" })).toEqual({
      valid: false,
      error: "Page path is required",
    });
  });

  it("rejects missing title", async () => {
    const validate = await getValidate();
    expect(validate({ path: "intro" })).toEqual({
      valid: false,
      error: "Page title is required",
    });
  });

  it("rejects null body", async () => {
    const validate = await getValidate();
    expect(validate(null)).toEqual({
      valid: false,
      error: "Request body is required",
    });
  });
});

// ── Update page request validation ───────────────────────────────────────

describe("validateUpdatePageRequest", () => {
  async function getValidate() {
    const mod = await import("@/lib/pages");
    return mod.validateUpdatePageRequest;
  }

  it("accepts title update", async () => {
    const validate = await getValidate();
    expect(validate({ title: "New Title" })).toEqual({
      valid: true,
      fields: { title: "New Title" },
    });
  });

  it("accepts content update", async () => {
    const validate = await getValidate();
    expect(validate({ content: "# Updated content" })).toEqual({
      valid: true,
      fields: { content: "# Updated content" },
    });
  });

  it("accepts isPublished update", async () => {
    const validate = await getValidate();
    expect(validate({ isPublished: true })).toEqual({
      valid: true,
      fields: { isPublished: true },
    });
  });

  it("rejects empty body", async () => {
    const validate = await getValidate();
    expect(validate({})).toEqual({
      valid: false,
      error: "No fields to update",
    });
  });

  it("rejects non-boolean isPublished", async () => {
    const validate = await getValidate();
    expect(validate({ isPublished: "yes" })).toEqual({
      valid: false,
      error: "isPublished must be a boolean",
    });
  });
});

// ── Page tree building ───────────────────────────────────────────────────

describe("buildPageTree", () => {
  async function getBuildPageTree() {
    const mod = await import("@/lib/pages");
    return mod.buildPageTree;
  }

  it("builds a flat tree from single-segment paths", async () => {
    const buildTree = await getBuildPageTree();
    const tree = buildTree([
      { id: "1", path: "introduction", title: "Introduction" },
      { id: "2", path: "quickstart", title: "Quickstart" },
    ]);
    expect(tree).toHaveLength(2);
    expect(tree[0].name).toBe("introduction");
    expect(tree[0].type).toBe("file");
    expect(tree[0].pageId).toBe("1");
    expect(tree[1].name).toBe("quickstart");
  });

  it("builds nested tree from multi-segment paths", async () => {
    const buildTree = await getBuildPageTree();
    const tree = buildTree([
      { id: "1", path: "guides/quickstart", title: "Quickstart" },
      { id: "2", path: "guides/advanced", title: "Advanced" },
      { id: "3", path: "api/endpoints", title: "Endpoints" },
    ]);
    // folders first (api, guides), then files
    expect(tree).toHaveLength(2);
    expect(tree[0].name).toBe("api");
    expect(tree[0].type).toBe("folder");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[1].name).toBe("guides");
    expect(tree[1].children).toHaveLength(2);
  });

  it("sorts folders before files", async () => {
    const buildTree = await getBuildPageTree();
    const tree = buildTree([
      { id: "1", path: "zebra", title: "Zebra" },
      { id: "2", path: "alpha/page", title: "Page" },
    ]);
    expect(tree[0].name).toBe("alpha");
    expect(tree[0].type).toBe("folder");
    expect(tree[1].name).toBe("zebra");
    expect(tree[1].type).toBe("file");
  });

  it("returns empty array for no pages", async () => {
    const buildTree = await getBuildPageTree();
    expect(buildTree([])).toEqual([]);
  });
});
