/**
 * Multi-version documentation — types, validation, URL helpers,
 * and page filtering for version-specific navigation trees.
 *
 * Version is encoded as a URL prefix: default version has no prefix,
 * other versions use their tag (e.g. "v2/getting-started").
 * When combined with i18n, version comes first: "v2/fr/getting-started".
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface VersionEntry {
  tag: string; // e.g. "v1", "v2", "2024.1"
  name: string; // Display name, e.g. "Version 2.0"
  isDefault: boolean;
}

export interface VersionsConfig {
  enabled: boolean;
  versions: VersionEntry[];
}

export const DEFAULT_VERSIONS_CONFIG: VersionsConfig = {
  enabled: false,
  versions: [],
};

// ── Validation ──────────────────────────────────────────────────────────────

const MAX_VERSIONS = 50;
const MAX_TAG_LENGTH = 30;
const MAX_NAME_LENGTH = 100;
const VALID_TAG_REGEX = /^[a-z0-9][a-z0-9.\-]*[a-z0-9]$|^[a-z0-9]$/;

export function isValidVersionTag(tag: string): boolean {
  return (
    typeof tag === "string" &&
    tag.length > 0 &&
    tag.length <= MAX_TAG_LENGTH &&
    VALID_TAG_REGEX.test(tag)
  );
}

export function validateVersionsConfig(
  config: VersionsConfig,
): { valid: true } | { valid: false; error: string } {
  if (!config.enabled) return { valid: true };

  if (!Array.isArray(config.versions) || config.versions.length === 0) {
    return { valid: false, error: "Versions must be a non-empty array" };
  }

  if (config.versions.length > MAX_VERSIONS) {
    return {
      valid: false,
      error: `Too many versions (max ${MAX_VERSIONS})`,
    };
  }

  const tags = new Set<string>();
  let defaultCount = 0;

  for (const v of config.versions) {
    if (!isValidVersionTag(v.tag)) {
      return {
        valid: false,
        error: `Invalid version tag: "${v.tag}" (lowercase alphanumeric, hyphens, dots)`,
      };
    }
    if (
      typeof v.name !== "string" ||
      v.name.trim().length === 0 ||
      v.name.length > MAX_NAME_LENGTH
    ) {
      return {
        valid: false,
        error: `Invalid version name for tag "${v.tag}" (1-${MAX_NAME_LENGTH} chars)`,
      };
    }
    if (tags.has(v.tag)) {
      return { valid: false, error: `Duplicate version tag: "${v.tag}"` };
    }
    tags.add(v.tag);
    if (v.isDefault) defaultCount++;
  }

  if (defaultCount !== 1) {
    return {
      valid: false,
      error: "Exactly one version must be marked as default",
    };
  }

  return { valid: true };
}

// ── Config helpers ──────────────────────────────────────────────────────────

export function mergeVersionsConfig(
  partial: Partial<VersionsConfig> | undefined | null,
): VersionsConfig {
  if (!partial) return { ...DEFAULT_VERSIONS_CONFIG };
  return {
    enabled: partial.enabled ?? DEFAULT_VERSIONS_CONFIG.enabled,
    versions: Array.isArray(partial.versions)
      ? partial.versions
      : DEFAULT_VERSIONS_CONFIG.versions,
  };
}

export function getDefaultVersion(
  config: VersionsConfig,
): VersionEntry | undefined {
  return config.versions.find((v) => v.isDefault);
}

export function getVersionByTag(
  config: VersionsConfig,
  tag: string,
): VersionEntry | undefined {
  return config.versions.find((v) => v.tag === tag);
}

// ── URL / path helpers ──────────────────────────────────────────────────────

/**
 * Parse a version tag from the start of a slug array.
 * If the first segment matches a known version tag (and is not the default),
 * it is consumed as the version prefix.
 *
 * Returns the resolved version tag and the remaining slug segments.
 *
 * Examples (default = "v2", versions = ["v1", "v2", "v3"]):
 *   ["getting-started"]        → { version: "v2", rest: ["getting-started"] }
 *   ["v1", "getting-started"]  → { version: "v1", rest: ["getting-started"] }
 *   ["v3", "api", "overview"]  → { version: "v3", rest: ["api", "overview"] }
 *   ["unknown", "page"]        → { version: "v2", rest: ["unknown", "page"] }
 */
export function parseVersionFromSlug(
  slug: string[],
  config: VersionsConfig,
): { version: string; rest: string[] } {
  const defaultVersion = getDefaultVersion(config);
  const defaultTag = defaultVersion?.tag ?? "";

  if (!config.enabled || slug.length === 0 || config.versions.length === 0) {
    return { version: defaultTag, rest: slug };
  }

  const firstSegment = slug[0].toLowerCase();

  // Only treat as version if it matches a known non-default version tag
  if (
    firstSegment !== defaultTag &&
    config.versions.some((v) => v.tag === firstSegment)
  ) {
    return { version: firstSegment, rest: slug.slice(1) };
  }

  return { version: defaultTag, rest: slug };
}

/**
 * Build a docs URL path with version prefix.
 * Default version gets no prefix; others get /{version}/ prefix.
 */
export function buildVersionedPath(
  subdomain: string,
  pagePath: string,
  version: string,
  defaultVersion: string,
  locale?: string,
  defaultLanguage?: string,
): string {
  const base = `/docs/${subdomain}`;
  const parts: string[] = [];

  // Version prefix (non-default)
  if (version !== defaultVersion) {
    parts.push(version);
  }

  // Locale prefix (non-default)
  if (locale && defaultLanguage && locale !== defaultLanguage) {
    parts.push(locale);
  }

  if (pagePath) {
    parts.push(pagePath);
  }

  return parts.length > 0 ? `${base}/${parts.join("/")}` : base;
}

/**
 * Build the page path with version prefix as stored in the database.
 * Default version pages have no prefix; others are stored as "{version}/{path}".
 */
export function buildVersionPagePath(
  pagePath: string,
  version: string,
  defaultVersion: string,
): string {
  if (version === defaultVersion) return pagePath;
  return pagePath ? `${version}/${pagePath}` : version;
}

// ── Page filtering ──────────────────────────────────────────────────────────

/**
 * Filter pages to only those matching a given version.
 * Default-version pages have no version prefix.
 * Other-version pages are stored with "{version}/" prefix.
 *
 * Returns pages with the version prefix stripped from path.
 */
export function filterPagesByVersion<T extends { path: string }>(
  allPages: T[],
  version: string,
  config: VersionsConfig,
): (T & { originalPath: string })[] {
  const defaultVersion = getDefaultVersion(config);
  const defaultTag = defaultVersion?.tag ?? "";
  const allTags = new Set(config.versions.map((v) => v.tag));

  if (version === defaultTag) {
    // Default version: return pages that don't start with any known version prefix
    return allPages
      .filter((p) => {
        const firstSeg = p.path.split("/")[0];
        return !allTags.has(firstSeg) || firstSeg === defaultTag;
      })
      .map((p) => ({ ...p, originalPath: p.path }));
  }

  // Non-default version: return pages starting with "{version}/" prefix, strip it
  const prefix = `${version}/`;
  return allPages
    .filter((p) => p.path.startsWith(prefix))
    .map((p) => ({
      ...p,
      path: p.path.slice(prefix.length),
      originalPath: p.path,
    }));
}

/**
 * Get all available versions for a given page path across all pages.
 * Useful for building the version switcher options.
 */
export function getAvailableVersionsForPage(
  allPages: { path: string }[],
  pagePath: string,
  config: VersionsConfig,
): string[] {
  if (!config.enabled || config.versions.length === 0) return [];

  const defaultTag = getDefaultVersion(config)?.tag ?? "";
  const available: string[] = [];

  for (const v of config.versions) {
    const fullPath = buildVersionPagePath(pagePath, v.tag, defaultTag);
    if (allPages.some((p) => p.path === fullPath)) {
      available.push(v.tag);
    }
  }

  return available;
}
