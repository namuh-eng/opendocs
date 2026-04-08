import {
  type LanguagesConfig,
  buildLocalePagePath,
  buildLocalizedPath,
  filterPagesByLocale,
  generateHreflangTags,
  getAvailableLocalesForPage,
  getLanguageInfo,
  isValidLocale,
  mergeLanguagesConfig,
  parseLocaleFromSlug,
  validateLanguagesConfig,
} from "@/lib/i18n";
import { describe, expect, it } from "vitest";

// ── isValidLocale ───────────────────────────────────────────────────────────

describe("isValidLocale", () => {
  it("returns true for supported ISO 639-1 codes", () => {
    expect(isValidLocale("en")).toBe(true);
    expect(isValidLocale("fr")).toBe(true);
    expect(isValidLocale("ja")).toBe(true);
    expect(isValidLocale("ar")).toBe(true);
  });

  it("returns false for unsupported codes", () => {
    expect(isValidLocale("xx")).toBe(false);
    expect(isValidLocale("")).toBe(false);
    expect(isValidLocale("english")).toBe(false);
    expect(isValidLocale("EN")).toBe(false);
  });
});

// ── getLanguageInfo ─────────────────────────────────────────────────────────

describe("getLanguageInfo", () => {
  it("returns language info for known code", () => {
    const info = getLanguageInfo("fr");
    expect(info).toBeDefined();
    expect(info?.name).toBe("French");
    expect(info?.nativeName).toBe("Français");
    expect(info?.direction).toBe("ltr");
  });

  it("returns RTL direction for Arabic", () => {
    const info = getLanguageInfo("ar");
    expect(info?.direction).toBe("rtl");
  });

  it("returns undefined for unknown code", () => {
    expect(getLanguageInfo("xx")).toBeUndefined();
  });
});

// ── mergeLanguagesConfig ────────────────────────────────────────────────────

describe("mergeLanguagesConfig", () => {
  it("returns defaults for null/undefined", () => {
    const config = mergeLanguagesConfig(null);
    expect(config.enabled).toBe(false);
    expect(config.defaultLanguage).toBe("en");
    expect(config.supportedLanguages).toEqual(["en"]);
  });

  it("merges partial config with defaults", () => {
    const config = mergeLanguagesConfig({
      enabled: true,
      supportedLanguages: ["en", "fr", "es"],
    });
    expect(config.enabled).toBe(true);
    expect(config.defaultLanguage).toBe("en");
    expect(config.supportedLanguages).toEqual(["en", "fr", "es"]);
  });
});

// ── validateLanguagesConfig ─────────────────────────────────────────────────

describe("validateLanguagesConfig", () => {
  const validConfig: LanguagesConfig = {
    enabled: true,
    defaultLanguage: "en",
    supportedLanguages: ["en", "fr", "es"],
  };

  it("accepts a valid config", () => {
    expect(validateLanguagesConfig(validConfig)).toEqual({ valid: true });
  });

  it("rejects invalid default language", () => {
    const result = validateLanguagesConfig({
      ...validConfig,
      defaultLanguage: "xx",
    });
    expect(result.valid).toBe(false);
  });

  it("rejects unsupported language in list", () => {
    const result = validateLanguagesConfig({
      ...validConfig,
      supportedLanguages: ["en", "xx"],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects default not in supported list", () => {
    const result = validateLanguagesConfig({
      ...validConfig,
      supportedLanguages: ["fr", "es"],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects duplicate codes", () => {
    const result = validateLanguagesConfig({
      ...validConfig,
      supportedLanguages: ["en", "fr", "fr"],
    });
    expect(result.valid).toBe(false);
  });
});

// ── parseLocaleFromSlug ─────────────────────────────────────────────────────

describe("parseLocaleFromSlug", () => {
  const config: LanguagesConfig = {
    enabled: true,
    defaultLanguage: "en",
    supportedLanguages: ["en", "fr", "es"],
  };

  it("returns default locale for page without locale prefix", () => {
    const result = parseLocaleFromSlug(["getting-started"], config);
    expect(result).toEqual({ locale: "en", pagePath: "getting-started" });
  });

  it("extracts locale from first slug segment", () => {
    const result = parseLocaleFromSlug(["fr", "getting-started"], config);
    expect(result).toEqual({ locale: "fr", pagePath: "getting-started" });
  });

  it("handles nested paths with locale", () => {
    const result = parseLocaleFromSlug(["es", "api", "overview"], config);
    expect(result).toEqual({ locale: "es", pagePath: "api/overview" });
  });

  it("treats unknown locale as part of path", () => {
    const result = parseLocaleFromSlug(["unknown", "page"], config);
    expect(result).toEqual({ locale: "en", pagePath: "unknown/page" });
  });

  it("does not strip default language from URL", () => {
    const result = parseLocaleFromSlug(["en", "getting-started"], config);
    expect(result).toEqual({ locale: "en", pagePath: "en/getting-started" });
  });

  it("returns full path when i18n is disabled", () => {
    const disabled = { ...config, enabled: false };
    const result = parseLocaleFromSlug(["fr", "getting-started"], disabled);
    expect(result).toEqual({ locale: "en", pagePath: "fr/getting-started" });
  });

  it("handles empty slug array", () => {
    const result = parseLocaleFromSlug([], config);
    expect(result).toEqual({ locale: "en", pagePath: "" });
  });
});

// ── buildLocalizedPath ──────────────────────────────────────────────────────

describe("buildLocalizedPath", () => {
  it("builds path without prefix for default language", () => {
    expect(buildLocalizedPath("my-proj", "getting-started", "en", "en")).toBe(
      "/docs/my-proj/getting-started",
    );
  });

  it("builds path with locale prefix for non-default language", () => {
    expect(buildLocalizedPath("my-proj", "getting-started", "fr", "en")).toBe(
      "/docs/my-proj/fr/getting-started",
    );
  });

  it("handles empty page path for default language", () => {
    expect(buildLocalizedPath("my-proj", "", "en", "en")).toBe("/docs/my-proj");
  });

  it("handles empty page path for non-default language", () => {
    expect(buildLocalizedPath("my-proj", "", "fr", "en")).toBe(
      "/docs/my-proj/fr",
    );
  });
});

// ── buildLocalePagePath ─────────────────────────────────────────────────────

describe("buildLocalePagePath", () => {
  it("returns path unchanged for default language", () => {
    expect(buildLocalePagePath("getting-started", "en", "en")).toBe(
      "getting-started",
    );
  });

  it("prefixes path with locale for non-default language", () => {
    expect(buildLocalePagePath("getting-started", "fr", "en")).toBe(
      "fr/getting-started",
    );
  });
});

// ── generateHreflangTags ────────────────────────────────────────────────────

describe("generateHreflangTags", () => {
  const config: LanguagesConfig = {
    enabled: true,
    defaultLanguage: "en",
    supportedLanguages: ["en", "fr", "es"],
  };

  it("generates tags for each language plus x-default", () => {
    const tags = generateHreflangTags(
      "https://example.com",
      "my-proj",
      "getting-started",
      config,
    );
    expect(tags).toHaveLength(4); // en, fr, es, x-default
    expect(tags[0]).toEqual({
      hreflang: "en",
      href: "https://example.com/docs/my-proj/getting-started",
    });
    expect(tags[1]).toEqual({
      hreflang: "fr",
      href: "https://example.com/docs/my-proj/fr/getting-started",
    });
    expect(tags[2]).toEqual({
      hreflang: "es",
      href: "https://example.com/docs/my-proj/es/getting-started",
    });
    expect(tags[3]).toEqual({
      hreflang: "x-default",
      href: "https://example.com/docs/my-proj/getting-started",
    });
  });

  it("returns empty array when i18n is disabled", () => {
    const disabled = { ...config, enabled: false };
    const tags = generateHreflangTags(
      "https://example.com",
      "proj",
      "page",
      disabled,
    );
    expect(tags).toEqual([]);
  });

  it("returns empty array for single language", () => {
    const single: LanguagesConfig = {
      enabled: true,
      defaultLanguage: "en",
      supportedLanguages: ["en"],
    };
    const tags = generateHreflangTags(
      "https://example.com",
      "proj",
      "page",
      single,
    );
    expect(tags).toEqual([]);
  });
});

// ── filterPagesByLocale ─────────────────────────────────────────────────────

describe("filterPagesByLocale", () => {
  const allPages = [
    { path: "getting-started", title: "Getting Started" },
    { path: "api/overview", title: "API Overview" },
    { path: "fr/getting-started", title: "Démarrage" },
    { path: "fr/api/overview", title: "Aperçu API" },
    { path: "es/getting-started", title: "Empezando" },
  ];

  it("returns default-language pages (no locale prefix)", () => {
    const filtered = filterPagesByLocale(allPages, "en", "en");
    expect(filtered.map((p) => p.path)).toEqual([
      "getting-started",
      "api/overview",
    ]);
  });

  it("returns locale-prefixed pages with prefix stripped", () => {
    const filtered = filterPagesByLocale(allPages, "fr", "en");
    expect(filtered.map((p) => p.path)).toEqual([
      "getting-started",
      "api/overview",
    ]);
    expect(filtered[0].title).toBe("Démarrage");
    expect(filtered[0].originalPath).toBe("fr/getting-started");
  });

  it("returns empty array for language with no pages", () => {
    const filtered = filterPagesByLocale(allPages, "ja", "en");
    expect(filtered).toEqual([]);
  });
});

// ── getAvailableLocalesForPage ──────────────────────────────────────────────

describe("getAvailableLocalesForPage", () => {
  const config: LanguagesConfig = {
    enabled: true,
    defaultLanguage: "en",
    supportedLanguages: ["en", "fr", "es"],
  };

  const allPages = [
    { path: "getting-started" },
    { path: "fr/getting-started" },
    { path: "es/getting-started" },
    { path: "api/overview" },
    { path: "fr/api/overview" },
  ];

  it("returns all locales that have the page", () => {
    const locales = getAvailableLocalesForPage(
      allPages,
      "getting-started",
      config,
    );
    expect(locales).toEqual(["en", "fr", "es"]);
  });

  it("returns partial locales when page is not translated", () => {
    const locales = getAvailableLocalesForPage(
      allPages,
      "api/overview",
      config,
    );
    expect(locales).toEqual(["en", "fr"]);
  });

  it("returns only default when i18n disabled", () => {
    const disabled = { ...config, enabled: false };
    const locales = getAvailableLocalesForPage(
      allPages,
      "getting-started",
      disabled,
    );
    expect(locales).toEqual(["en"]);
  });
});
