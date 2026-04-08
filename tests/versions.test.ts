import {
  type VersionsConfig,
  buildVersionPagePath,
  buildVersionedPath,
  filterPagesByVersion,
  getAvailableVersionsForPage,
  getDefaultVersion,
  getVersionByTag,
  isValidVersionTag,
  mergeVersionsConfig,
  parseVersionFromSlug,
  validateVersionsConfig,
} from "@/lib/versions";
import { describe, expect, it } from "vitest";

// ── Fixtures ────────────────────────────────────────────────────────────────

const threeVersionConfig: VersionsConfig = {
  enabled: true,
  versions: [
    { tag: "v1", name: "Version 1.0", isDefault: false },
    { tag: "v2", name: "Version 2.0", isDefault: true },
    { tag: "v3", name: "Version 3.0 (Beta)", isDefault: false },
  ],
};

const disabledConfig: VersionsConfig = {
  enabled: false,
  versions: [{ tag: "v1", name: "Version 1", isDefault: true }],
};

// ── isValidVersionTag ───────────────────────────────────────────────────────

describe("isValidVersionTag", () => {
  it("accepts simple tags", () => {
    expect(isValidVersionTag("v1")).toBe(true);
    expect(isValidVersionTag("v2")).toBe(true);
    expect(isValidVersionTag("1")).toBe(true);
  });

  it("accepts tags with dots and hyphens", () => {
    expect(isValidVersionTag("v1.0")).toBe(true);
    expect(isValidVersionTag("2024.1")).toBe(true);
    expect(isValidVersionTag("v2-beta")).toBe(true);
  });

  it("rejects invalid tags", () => {
    expect(isValidVersionTag("")).toBe(false);
    expect(isValidVersionTag("V1")).toBe(false); // uppercase
    expect(isValidVersionTag("v1 beta")).toBe(false); // space
    expect(isValidVersionTag("-v1")).toBe(false); // starts with hyphen
    expect(isValidVersionTag("v1-")).toBe(false); // ends with hyphen
    expect(isValidVersionTag("a".repeat(31))).toBe(false); // too long
  });
});

// ── validateVersionsConfig ──────────────────────────────────────────────────

describe("validateVersionsConfig", () => {
  it("passes for a valid config with one default", () => {
    const result = validateVersionsConfig(threeVersionConfig);
    expect(result.valid).toBe(true);
  });

  it("passes when disabled even with empty versions", () => {
    const result = validateVersionsConfig({ enabled: false, versions: [] });
    expect(result.valid).toBe(true);
  });

  it("fails when enabled with empty versions", () => {
    const result = validateVersionsConfig({ enabled: true, versions: [] });
    expect(result.valid).toBe(false);
  });

  it("fails when no default version is set", () => {
    const result = validateVersionsConfig({
      enabled: true,
      versions: [
        { tag: "v1", name: "V1", isDefault: false },
        { tag: "v2", name: "V2", isDefault: false },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result).toHaveProperty("error");
  });

  it("fails when multiple defaults are set", () => {
    const result = validateVersionsConfig({
      enabled: true,
      versions: [
        { tag: "v1", name: "V1", isDefault: true },
        { tag: "v2", name: "V2", isDefault: true },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it("fails for duplicate tags", () => {
    const result = validateVersionsConfig({
      enabled: true,
      versions: [
        { tag: "v1", name: "First", isDefault: true },
        { tag: "v1", name: "Duplicate", isDefault: false },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it("fails for invalid tag format", () => {
    const result = validateVersionsConfig({
      enabled: true,
      versions: [{ tag: "V1 BETA", name: "Bad", isDefault: true }],
    });
    expect(result.valid).toBe(false);
  });

  it("fails for empty version name", () => {
    const result = validateVersionsConfig({
      enabled: true,
      versions: [{ tag: "v1", name: "", isDefault: true }],
    });
    expect(result.valid).toBe(false);
  });
});

// ── mergeVersionsConfig ─────────────────────────────────────────────────────

describe("mergeVersionsConfig", () => {
  it("returns defaults for null/undefined", () => {
    expect(mergeVersionsConfig(null)).toEqual({
      enabled: false,
      versions: [],
    });
    expect(mergeVersionsConfig(undefined)).toEqual({
      enabled: false,
      versions: [],
    });
  });

  it("merges partial config", () => {
    const result = mergeVersionsConfig({ enabled: true });
    expect(result.enabled).toBe(true);
    expect(result.versions).toEqual([]);
  });

  it("preserves provided versions array", () => {
    const result = mergeVersionsConfig({
      enabled: true,
      versions: threeVersionConfig.versions,
    });
    expect(result.versions).toHaveLength(3);
  });
});

// ── getDefaultVersion / getVersionByTag ─────────────────────────────────────

describe("getDefaultVersion", () => {
  it("returns the default version", () => {
    const def = getDefaultVersion(threeVersionConfig);
    expect(def?.tag).toBe("v2");
  });

  it("returns undefined for empty versions", () => {
    expect(getDefaultVersion({ enabled: true, versions: [] })).toBeUndefined();
  });
});

describe("getVersionByTag", () => {
  it("finds a version by tag", () => {
    expect(getVersionByTag(threeVersionConfig, "v3")?.name).toBe(
      "Version 3.0 (Beta)",
    );
  });

  it("returns undefined for unknown tag", () => {
    expect(getVersionByTag(threeVersionConfig, "v99")).toBeUndefined();
  });
});

// ── parseVersionFromSlug ────────────────────────────────────────────────────

describe("parseVersionFromSlug", () => {
  it("returns default version when slug has no version prefix", () => {
    const result = parseVersionFromSlug(
      ["getting-started"],
      threeVersionConfig,
    );
    expect(result.version).toBe("v2");
    expect(result.rest).toEqual(["getting-started"]);
  });

  it("extracts non-default version from slug", () => {
    const result = parseVersionFromSlug(
      ["v1", "getting-started"],
      threeVersionConfig,
    );
    expect(result.version).toBe("v1");
    expect(result.rest).toEqual(["getting-started"]);
  });

  it("extracts version with multiple remaining segments", () => {
    const result = parseVersionFromSlug(
      ["v3", "api", "overview"],
      threeVersionConfig,
    );
    expect(result.version).toBe("v3");
    expect(result.rest).toEqual(["api", "overview"]);
  });

  it("does not consume default version tag from URL", () => {
    const result = parseVersionFromSlug(
      ["v2", "getting-started"],
      threeVersionConfig,
    );
    expect(result.version).toBe("v2");
    expect(result.rest).toEqual(["v2", "getting-started"]);
  });

  it("returns default when unknown segment leads", () => {
    const result = parseVersionFromSlug(
      ["unknown", "page"],
      threeVersionConfig,
    );
    expect(result.version).toBe("v2");
    expect(result.rest).toEqual(["unknown", "page"]);
  });

  it("returns default for empty slug", () => {
    const result = parseVersionFromSlug([], threeVersionConfig);
    expect(result.version).toBe("v2");
    expect(result.rest).toEqual([]);
  });

  it("returns default when config is disabled", () => {
    const result = parseVersionFromSlug(["v1", "page"], disabledConfig);
    expect(result.version).toBe("v1"); // default tag
    expect(result.rest).toEqual(["v1", "page"]);
  });
});

// ── buildVersionedPath ──────────────────────────────────────────────────────

describe("buildVersionedPath", () => {
  it("builds path without prefix for default version", () => {
    const result = buildVersionedPath("my-docs", "getting-started", "v2", "v2");
    expect(result).toBe("/docs/my-docs/getting-started");
  });

  it("builds path with version prefix for non-default", () => {
    const result = buildVersionedPath("my-docs", "getting-started", "v1", "v2");
    expect(result).toBe("/docs/my-docs/v1/getting-started");
  });

  it("builds path with both version and locale prefixes", () => {
    const result = buildVersionedPath(
      "my-docs",
      "getting-started",
      "v1",
      "v2",
      "fr",
      "en",
    );
    expect(result).toBe("/docs/my-docs/v1/fr/getting-started");
  });

  it("omits version prefix for default version even with locale", () => {
    const result = buildVersionedPath(
      "my-docs",
      "getting-started",
      "v2",
      "v2",
      "fr",
      "en",
    );
    expect(result).toBe("/docs/my-docs/fr/getting-started");
  });

  it("handles empty pagePath", () => {
    const result = buildVersionedPath("my-docs", "", "v1", "v2");
    expect(result).toBe("/docs/my-docs/v1");
  });
});

// ── buildVersionPagePath ────────────────────────────────────────────────────

describe("buildVersionPagePath", () => {
  it("returns plain path for default version", () => {
    expect(buildVersionPagePath("getting-started", "v2", "v2")).toBe(
      "getting-started",
    );
  });

  it("prepends version prefix for non-default", () => {
    expect(buildVersionPagePath("getting-started", "v1", "v2")).toBe(
      "v1/getting-started",
    );
  });

  it("returns just the tag for empty pagePath", () => {
    expect(buildVersionPagePath("", "v1", "v2")).toBe("v1");
  });
});

// ── filterPagesByVersion ────────────────────────────────────────────────────

describe("filterPagesByVersion", () => {
  const pages = [
    { path: "getting-started", title: "Getting Started (v2)" },
    { path: "quickstart", title: "Quickstart (v2)" },
    { path: "v1/getting-started", title: "Getting Started (v1)" },
    { path: "v1/quickstart", title: "Quickstart (v1)" },
    { path: "v3/getting-started", title: "Getting Started (v3)" },
  ];

  it("returns default-version pages (no version prefix)", () => {
    const result = filterPagesByVersion(pages, "v2", threeVersionConfig);
    expect(result).toHaveLength(2);
    expect(result[0].path).toBe("getting-started");
    expect(result[1].path).toBe("quickstart");
  });

  it("returns non-default version pages with prefix stripped", () => {
    const result = filterPagesByVersion(pages, "v1", threeVersionConfig);
    expect(result).toHaveLength(2);
    expect(result[0].path).toBe("getting-started");
    expect(result[0].originalPath).toBe("v1/getting-started");
  });

  it("returns pages for v3", () => {
    const result = filterPagesByVersion(pages, "v3", threeVersionConfig);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("getting-started");
  });

  it("returns empty array for version with no pages", () => {
    const config: VersionsConfig = {
      enabled: true,
      versions: [
        { tag: "v1", name: "V1", isDefault: false },
        { tag: "v2", name: "V2", isDefault: true },
        { tag: "v4", name: "V4", isDefault: false },
      ],
    };
    const result = filterPagesByVersion(pages, "v4", config);
    expect(result).toHaveLength(0);
  });
});

// ── getAvailableVersionsForPage ─────────────────────────────────────────────

describe("getAvailableVersionsForPage", () => {
  const pages = [
    { path: "getting-started" },
    { path: "quickstart" },
    { path: "v1/getting-started" },
    { path: "v3/getting-started" },
    { path: "v3/quickstart" },
  ];

  it("returns all versions that have the page", () => {
    const result = getAvailableVersionsForPage(
      pages,
      "getting-started",
      threeVersionConfig,
    );
    expect(result).toEqual(["v1", "v2", "v3"]);
  });

  it("returns only versions with the specific page", () => {
    const result = getAvailableVersionsForPage(
      pages,
      "quickstart",
      threeVersionConfig,
    );
    expect(result).toEqual(["v2", "v3"]);
  });

  it("returns empty array when disabled", () => {
    const result = getAvailableVersionsForPage(pages, "getting-started", {
      enabled: false,
      versions: [],
    });
    expect(result).toEqual([]);
  });

  it("returns empty for page that does not exist in any version", () => {
    const result = getAvailableVersionsForPage(
      pages,
      "nonexistent",
      threeVersionConfig,
    );
    expect(result).toEqual([]);
  });
});
