import {
  CONFIG_SECTIONS,
  CONFIG_SECTION_IDS,
  DEFAULT_DOCS_CONFIG,
  type DocsConfig,
  exportDocsConfigJson,
  getDocsThemeCssVars,
  importDocsConfigJson,
  mergeDocsConfig,
  sectionIdToConfigKey,
  validateDocsConfig,
} from "@/lib/docs-config";
import { describe, expect, it } from "vitest";

// ── CONFIG_SECTIONS metadata ─────────────────────────────────────────────

describe("CONFIG_SECTIONS", () => {
  it("has exactly 10 sections", () => {
    expect(CONFIG_SECTIONS).toHaveLength(10);
  });

  it("each section has id, label, and description", () => {
    for (const s of CONFIG_SECTIONS) {
      expect(s.id).toBeTruthy();
      expect(s.label).toBeTruthy();
      expect(s.description).toBeTruthy();
    }
  });

  it("section IDs match CONFIG_SECTION_IDS array", () => {
    expect(CONFIG_SECTIONS.map((s) => s.id)).toEqual([...CONFIG_SECTION_IDS]);
  });
});

// ── mergeDocsConfig ──────────────────────────────────────────────────────

describe("mergeDocsConfig", () => {
  it("returns defaults when given undefined", () => {
    const result = mergeDocsConfig(undefined);
    expect(result).toEqual(DEFAULT_DOCS_CONFIG);
  });

  it("returns defaults when given empty object", () => {
    const result = mergeDocsConfig({});
    expect(result).toEqual(DEFAULT_DOCS_CONFIG);
  });

  it("merges partial overview fields", () => {
    const result = mergeDocsConfig({ overview: { name: "My Docs" } });
    expect(result.overview.name).toBe("My Docs");
    expect(result.overview.description).toBe(""); // default
    expect(result.overview.baseUrl).toBe(""); // default
  });

  it("merges partial visualBranding", () => {
    const result = mergeDocsConfig({
      visualBranding: { primaryColor: "#FF0000" },
    });
    expect(result.visualBranding.primaryColor).toBe("#FF0000");
    expect(result.visualBranding.theme).toBe("dark"); // default
  });

  it("exports CSS variables for applying the primary color to docs chrome", () => {
    const config = mergeDocsConfig({
      visualBranding: { primaryColor: "#FF0000" },
    });
    expect(getDocsThemeCssVars(config)).toEqual({
      "--docs-primary": "#FF0000",
      "--docs-logo-color": "#FF0000",
      "--docs-primary-soft": "#FF000022",
      "--docs-light-bg": "#F8F9FC",
      "--docs-dark-bg": "#0E0F18",
      "--docs-bg": "#0E0F18",
      "--docs-bg-deep": "#0E0F18",
      "--docs-card": "color-mix(in srgb, #0E0F18 86%, white)",
    });
  });

  it("preserves topbarLinks array when provided", () => {
    const links = [{ label: "Blog", url: "/blog" }];
    const result = mergeDocsConfig({
      headerTopbar: { topbarLinks: links, logoPath: "/logo.svg" },
    });
    expect(result.headerTopbar.topbarLinks).toEqual(links);
    expect(result.headerTopbar.logoPath).toBe("/logo.svg");
  });

  it("uses default empty array for topbarLinks when not provided", () => {
    const result = mergeDocsConfig({ headerTopbar: { logoPath: "/x.svg" } });
    expect(result.headerTopbar.topbarLinks).toEqual([]);
  });

  it("preserves socialLinks array when provided", () => {
    const links = [{ type: "github" as const, url: "https://github.com/test" }];
    const result = mergeDocsConfig({ footer: { socialLinks: links } });
    expect(result.footer.socialLinks).toEqual(links);
  });

  it("preserves custom integrations array when provided", () => {
    const custom = [{ name: "Posthog", value: "key123" }];
    const result = mergeDocsConfig({ integrations: { custom } });
    expect(result.integrations.custom).toEqual(custom);
  });

  it("merges advanced config", () => {
    const result = mergeDocsConfig({
      advanced: { seoTitle: "My Title" },
    });
    expect(result.advanced.seoTitle).toBe("My Title");
    expect(result.advanced.seoDescription).toBe(""); // default
  });
});

// ── validateDocsConfig ───────────────────────────────────────────────────

describe("validateDocsConfig", () => {
  it("accepts valid default config", () => {
    expect(validateDocsConfig(DEFAULT_DOCS_CONFIG)).toEqual({ valid: true });
  });

  it("rejects invalid primaryColor hex", () => {
    const config: DocsConfig = {
      ...DEFAULT_DOCS_CONFIG,
      visualBranding: {
        ...DEFAULT_DOCS_CONFIG.visualBranding,
        primaryColor: "not-a-color",
      },
    };
    const result = validateDocsConfig(config);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("primaryColor");
  });

  it("rejects invalid lightColor hex", () => {
    const config: DocsConfig = {
      ...DEFAULT_DOCS_CONFIG,
      visualBranding: {
        ...DEFAULT_DOCS_CONFIG.visualBranding,
        lightColor: "#GGG",
      },
    };
    expect(validateDocsConfig(config).valid).toBe(false);
  });

  it("rejects invalid theme value", () => {
    const config: DocsConfig = {
      ...DEFAULT_DOCS_CONFIG,
      visualBranding: {
        ...DEFAULT_DOCS_CONFIG.visualBranding,
        theme: "nope" as "light",
      },
    };
    expect(validateDocsConfig(config).valid).toBe(false);
  });

  it("rejects invalid code block theme", () => {
    const config: DocsConfig = {
      ...DEFAULT_DOCS_CONFIG,
      contentFeatures: {
        ...DEFAULT_DOCS_CONFIG.contentFeatures,
        codeBlockTheme: "bad" as "monokai",
      },
    };
    expect(validateDocsConfig(config).valid).toBe(false);
  });

  it("rejects invalid icon library", () => {
    const config: DocsConfig = {
      ...DEFAULT_DOCS_CONFIG,
      contentFeatures: {
        ...DEFAULT_DOCS_CONFIG.contentFeatures,
        iconLibrary: "bad" as "lucide",
      },
    };
    expect(validateDocsConfig(config).valid).toBe(false);
  });

  it("rejects topbar link with empty label", () => {
    const config: DocsConfig = {
      ...DEFAULT_DOCS_CONFIG,
      headerTopbar: {
        ...DEFAULT_DOCS_CONFIG.headerTopbar,
        topbarLinks: [{ label: "", url: "/blog" }],
      },
    };
    const r = validateDocsConfig(config);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toContain("label");
  });

  it("rejects topbar link with empty URL", () => {
    const config: DocsConfig = {
      ...DEFAULT_DOCS_CONFIG,
      headerTopbar: {
        ...DEFAULT_DOCS_CONFIG.headerTopbar,
        topbarLinks: [{ label: "Blog", url: "" }],
      },
    };
    const r = validateDocsConfig(config);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toContain("URL");
  });

  it("rejects invalid social link type", () => {
    const config: DocsConfig = {
      ...DEFAULT_DOCS_CONFIG,
      footer: {
        ...DEFAULT_DOCS_CONFIG.footer,
        socialLinks: [{ type: "tiktok" as "github", url: "https://t.co" }],
      },
    };
    expect(validateDocsConfig(config).valid).toBe(false);
  });

  it("rejects social link with empty URL", () => {
    const config: DocsConfig = {
      ...DEFAULT_DOCS_CONFIG,
      footer: {
        ...DEFAULT_DOCS_CONFIG.footer,
        socialLinks: [{ type: "github", url: "  " }],
      },
    };
    expect(validateDocsConfig(config).valid).toBe(false);
  });

  it("accepts config with all valid data", () => {
    const config: DocsConfig = {
      ...DEFAULT_DOCS_CONFIG,
      overview: { name: "Test", description: "Desc", baseUrl: "https://x.com" },
      visualBranding: {
        ...DEFAULT_DOCS_CONFIG.visualBranding,
        primaryColor: "#FF0000",
      },
      headerTopbar: {
        logoPath: "/logo.svg",
        topbarLinks: [{ label: "Blog", url: "/blog" }],
      },
      footer: {
        brandName: "Acme",
        brandUrl: "https://acme.com",
        socialLinks: [{ type: "github", url: "https://github.com/acme" }],
      },
    };
    expect(validateDocsConfig(config)).toEqual({ valid: true });
  });
});

// ── export / import ──────────────────────────────────────────────────────

describe("exportDocsConfigJson", () => {
  it("serialises the config as pretty JSON", () => {
    const json = exportDocsConfigJson(DEFAULT_DOCS_CONFIG);
    const parsed = JSON.parse(json);
    expect(parsed.overview).toEqual(DEFAULT_DOCS_CONFIG.overview);
    expect(parsed.visualBranding).toEqual(DEFAULT_DOCS_CONFIG.visualBranding);
  });
});

describe("importDocsConfigJson", () => {
  it("round-trips via export → import", () => {
    const json = exportDocsConfigJson(DEFAULT_DOCS_CONFIG);
    const result = importDocsConfigJson(json);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.config).toEqual(DEFAULT_DOCS_CONFIG);
  });

  it("returns error for invalid JSON string", () => {
    const result = importDocsConfigJson("{broken");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("parse");
  });

  it("returns error for non-object JSON", () => {
    const result = importDocsConfigJson('"hello"');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("object");
  });

  it("returns error for array JSON", () => {
    const result = importDocsConfigJson("[1,2,3]");
    expect(result.ok).toBe(false);
  });

  it("merges partial import with defaults", () => {
    const result = importDocsConfigJson(
      JSON.stringify({ overview: { name: "Imported" } }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.overview.name).toBe("Imported");
      expect(result.config.overview.baseUrl).toBe(""); // default
    }
  });
});

// ── sectionIdToConfigKey ─────────────────────────────────────────────────

describe("sectionIdToConfigKey", () => {
  it("maps overview to overview", () => {
    expect(sectionIdToConfigKey("overview")).toBe("overview");
  });

  it("maps visual-branding to visualBranding", () => {
    expect(sectionIdToConfigKey("visual-branding")).toBe("visualBranding");
  });

  it("maps header-topbar to headerTopbar", () => {
    expect(sectionIdToConfigKey("header-topbar")).toBe("headerTopbar");
  });

  it("maps content-features to contentFeatures", () => {
    expect(sectionIdToConfigKey("content-features")).toBe("contentFeatures");
  });

  it("maps assistant-search to assistantSearch", () => {
    expect(sectionIdToConfigKey("assistant-search")).toBe("assistantSearch");
  });

  it("maps api-docs to apiDocs", () => {
    expect(sectionIdToConfigKey("api-docs")).toBe("apiDocs");
  });
});
