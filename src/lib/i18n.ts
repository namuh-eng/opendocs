/**
 * i18n utilities — locale validation, supported languages catalog,
 * URL helpers, and hreflang tag generation for multi-language docs.
 *
 * Locale is encoded in page paths: default language has no prefix,
 * other languages use ISO 639-1 prefix (e.g. "fr/getting-started").
 */

// ── Supported languages (ISO 639-1) ────────────────────────────────────────

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
}

/** 27+ supported language codes with metadata. */
export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English", nativeName: "English", direction: "ltr" },
  { code: "ar", name: "Arabic", nativeName: "العربية", direction: "rtl" },
  { code: "zh", name: "Chinese", nativeName: "中文", direction: "ltr" },
  { code: "cs", name: "Czech", nativeName: "Čeština", direction: "ltr" },
  { code: "da", name: "Danish", nativeName: "Dansk", direction: "ltr" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", direction: "ltr" },
  { code: "fi", name: "Finnish", nativeName: "Suomi", direction: "ltr" },
  { code: "fr", name: "French", nativeName: "Français", direction: "ltr" },
  { code: "de", name: "German", nativeName: "Deutsch", direction: "ltr" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", direction: "ltr" },
  { code: "he", name: "Hebrew", nativeName: "עברית", direction: "rtl" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", direction: "ltr" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar", direction: "ltr" },
  {
    code: "id",
    name: "Indonesian",
    nativeName: "Bahasa Indonesia",
    direction: "ltr",
  },
  { code: "it", name: "Italian", nativeName: "Italiano", direction: "ltr" },
  { code: "ja", name: "Japanese", nativeName: "日本語", direction: "ltr" },
  { code: "ko", name: "Korean", nativeName: "한국어", direction: "ltr" },
  { code: "no", name: "Norwegian", nativeName: "Norsk", direction: "ltr" },
  { code: "pl", name: "Polish", nativeName: "Polski", direction: "ltr" },
  { code: "pt", name: "Portuguese", nativeName: "Português", direction: "ltr" },
  { code: "ro", name: "Romanian", nativeName: "Română", direction: "ltr" },
  { code: "ru", name: "Russian", nativeName: "Русский", direction: "ltr" },
  { code: "es", name: "Spanish", nativeName: "Español", direction: "ltr" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", direction: "ltr" },
  { code: "th", name: "Thai", nativeName: "ไทย", direction: "ltr" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", direction: "ltr" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", direction: "ltr" },
  {
    code: "vi",
    name: "Vietnamese",
    nativeName: "Tiếng Việt",
    direction: "ltr",
  },
];

const SUPPORTED_CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

// ── Language config types ───────────────────────────────────────────────────

export interface LanguagesConfig {
  enabled: boolean;
  defaultLanguage: string;
  supportedLanguages: string[];
}

export const DEFAULT_LANGUAGES_CONFIG: LanguagesConfig = {
  enabled: false,
  defaultLanguage: "en",
  supportedLanguages: ["en"],
};

// ── Validation ──────────────────────────────────────────────────────────────

/** Check if a string is a valid ISO 639-1 language code we support. */
export function isValidLocale(code: string): boolean {
  return SUPPORTED_CODES.has(code);
}

/** Get language info by code. Returns undefined for unsupported codes. */
export function getLanguageInfo(code: string): LanguageInfo | undefined {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code);
}

/** Merge partial languages config with defaults. */
export function mergeLanguagesConfig(
  partial: Partial<LanguagesConfig> | undefined | null,
): LanguagesConfig {
  if (!partial) return { ...DEFAULT_LANGUAGES_CONFIG };
  return {
    enabled: partial.enabled ?? DEFAULT_LANGUAGES_CONFIG.enabled,
    defaultLanguage:
      partial.defaultLanguage ?? DEFAULT_LANGUAGES_CONFIG.defaultLanguage,
    supportedLanguages:
      Array.isArray(partial.supportedLanguages) &&
      partial.supportedLanguages.length > 0
        ? partial.supportedLanguages
        : DEFAULT_LANGUAGES_CONFIG.supportedLanguages,
  };
}

/** Validate a languages config. */
export function validateLanguagesConfig(
  config: LanguagesConfig,
): { valid: true } | { valid: false; error: string } {
  if (!isValidLocale(config.defaultLanguage)) {
    return {
      valid: false,
      error: `Invalid default language code: ${config.defaultLanguage}`,
    };
  }
  for (const code of config.supportedLanguages) {
    if (!isValidLocale(code)) {
      return { valid: false, error: `Unsupported language code: ${code}` };
    }
  }
  if (!config.supportedLanguages.includes(config.defaultLanguage)) {
    return {
      valid: false,
      error: "Default language must be in supported languages list",
    };
  }
  if (
    new Set(config.supportedLanguages).size !== config.supportedLanguages.length
  ) {
    return {
      valid: false,
      error: "Duplicate language codes in supported languages",
    };
  }
  return { valid: true };
}

// ── URL / path helpers ──────────────────────────────────────────────────────

/**
 * Parse a slug array into locale + page path.
 * If the first segment is a known locale (and not the default), it's treated
 * as the locale prefix. Otherwise, the default language is assumed.
 *
 * Examples (default = "en", supported = ["en", "fr", "es"]):
 *   ["getting-started"]        → { locale: "en", pagePath: "getting-started" }
 *   ["fr", "getting-started"]  → { locale: "fr", pagePath: "getting-started" }
 *   ["es", "api", "overview"]  → { locale: "es", pagePath: "api/overview" }
 *   ["unknown", "page"]        → { locale: "en", pagePath: "unknown/page" }
 */
export function parseLocaleFromSlug(
  slug: string[],
  config: LanguagesConfig,
): { locale: string; pagePath: string } {
  if (!config.enabled || slug.length === 0) {
    return { locale: config.defaultLanguage, pagePath: slug.join("/") };
  }

  const firstSegment = slug[0].toLowerCase();

  // Only treat as locale if it's a supported non-default language
  if (
    firstSegment !== config.defaultLanguage &&
    config.supportedLanguages.includes(firstSegment)
  ) {
    return {
      locale: firstSegment,
      pagePath: slug.slice(1).join("/"),
    };
  }

  return { locale: config.defaultLanguage, pagePath: slug.join("/") };
}

/**
 * Build a docs URL path for a given locale + page path.
 * Default language gets no prefix; others get /{locale}/ prefix.
 */
export function buildLocalizedPath(
  subdomain: string,
  pagePath: string,
  locale: string,
  defaultLanguage: string,
): string {
  const base = `/docs/${subdomain}`;
  if (locale === defaultLanguage) {
    return pagePath ? `${base}/${pagePath}` : base;
  }
  return pagePath ? `${base}/${locale}/${pagePath}` : `${base}/${locale}`;
}

/**
 * Build the page path with locale prefix as stored in the database.
 * Default language pages have no prefix; others are stored as "{locale}/{path}".
 */
export function buildLocalePagePath(
  pagePath: string,
  locale: string,
  defaultLanguage: string,
): string {
  if (locale === defaultLanguage) return pagePath;
  return pagePath ? `${locale}/${pagePath}` : locale;
}

// ── hreflang tag generation ─────────────────────────────────────────────────

export interface HreflangTag {
  hreflang: string;
  href: string;
}

/**
 * Generate hreflang link tags for SEO.
 * Produces one tag per supported language + an x-default pointing to the
 * default language version.
 */
export function generateHreflangTags(
  baseUrl: string,
  subdomain: string,
  pagePath: string,
  config: LanguagesConfig,
): HreflangTag[] {
  if (!config.enabled || config.supportedLanguages.length <= 1) {
    return [];
  }

  const base = baseUrl.replace(/\/+$/, "");
  const tags: HreflangTag[] = [];

  for (const lang of config.supportedLanguages) {
    const url = buildLocalizedPath(
      subdomain,
      pagePath,
      lang,
      config.defaultLanguage,
    );
    tags.push({ hreflang: lang, href: `${base}${url}` });
  }

  // x-default points to the default language version
  const defaultUrl = buildLocalizedPath(
    subdomain,
    pagePath,
    config.defaultLanguage,
    config.defaultLanguage,
  );
  tags.push({ hreflang: "x-default", href: `${base}${defaultUrl}` });

  return tags;
}

/**
 * Filter pages to only those matching a given locale.
 * Default-language pages have no locale prefix.
 * Other-language pages are stored with "{locale}/" prefix.
 *
 * Returns pages with the locale prefix stripped from path.
 */
export function filterPagesByLocale<T extends { path: string }>(
  allPages: T[],
  locale: string,
  defaultLanguage: string,
): (T & { originalPath: string })[] {
  if (locale === defaultLanguage) {
    // Default language: return pages that don't start with any known locale prefix
    return allPages
      .filter((p) => {
        const firstSeg = p.path.split("/")[0];
        return !SUPPORTED_CODES.has(firstSeg) || firstSeg === defaultLanguage;
      })
      .map((p) => ({ ...p, originalPath: p.path }));
  }

  // Non-default language: return pages starting with "{locale}/" prefix, strip it
  const prefix = `${locale}/`;
  return allPages
    .filter((p) => p.path.startsWith(prefix))
    .map((p) => ({
      ...p,
      path: p.path.slice(prefix.length),
      originalPath: p.path,
    }));
}

/**
 * Get all available locales for a given page path across all pages.
 * Useful for building the language switcher options.
 */
export function getAvailableLocalesForPage(
  allPages: { path: string }[],
  pagePath: string,
  config: LanguagesConfig,
): string[] {
  if (!config.enabled) return [config.defaultLanguage];

  const available: string[] = [];

  for (const lang of config.supportedLanguages) {
    const fullPath = buildLocalePagePath(
      pagePath,
      lang,
      config.defaultLanguage,
    );
    if (allPages.some((p) => p.path === fullPath)) {
      available.push(lang);
    }
  }

  return available;
}
