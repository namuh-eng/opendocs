/**
 * Navigation configuration — types, validation, defaults, and helpers
 * for the docs.json navigation structure editor.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface NavPage {
  type: "page";
  label: string;
  path: string;
  icon?: string;
}

export interface NavGroup {
  type: "group";
  label: string;
  icon?: string;
  pages: NavPage[];
}

export interface NavTab {
  type: "tab";
  label: string;
  href?: string;
  external?: boolean;
}

export interface NavAnchor {
  type: "anchor";
  label: string;
  href: string;
  icon?: string;
}

export type NavEntry = NavGroup | NavTab | NavAnchor;

export interface NavigationConfig {
  entries: NavEntry[];
}

// ── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_NAVIGATION: NavigationConfig = {
  entries: [
    {
      type: "tab",
      label: "Documentation",
      href: "/",
    },
    {
      type: "group",
      label: "Getting started",
      pages: [
        { type: "page", label: "Introduction", path: "introduction" },
        { type: "page", label: "Quickstart", path: "quickstart" },
        { type: "page", label: "Development", path: "development" },
      ],
    },
  ],
};

// ── Validation ───────────────────────────────────────────────────────────────

const MAX_LABEL_LENGTH = 100;
const MAX_PATH_LENGTH = 256;
const MAX_ENTRIES = 200;
const MAX_PAGES_PER_GROUP = 100;
const VALID_PATH_REGEX = /^[a-z0-9][a-z0-9\-/]*[a-z0-9]$|^[a-z0-9]$/;

export function isValidLabel(label: string): boolean {
  return (
    typeof label === "string" &&
    label.trim().length > 0 &&
    label.length <= MAX_LABEL_LENGTH
  );
}

export function isValidPath(path: string): boolean {
  return (
    typeof path === "string" &&
    path.length > 0 &&
    path.length <= MAX_PATH_LENGTH &&
    VALID_PATH_REGEX.test(path)
  );
}

export function isValidHref(href: string): boolean {
  return (
    typeof href === "string" &&
    href.length > 0 &&
    href.length <= MAX_PATH_LENGTH &&
    (href.startsWith("/") ||
      href.startsWith("http://") ||
      href.startsWith("https://"))
  );
}

export interface ValidationResult {
  valid: boolean;
  error: string;
}

export function validateNavPage(page: NavPage): ValidationResult {
  if (!isValidLabel(page.label)) {
    return {
      valid: false,
      error: `Page label "${page.label}" is invalid (1-${MAX_LABEL_LENGTH} chars)`,
    };
  }
  if (!isValidPath(page.path)) {
    return {
      valid: false,
      error: `Page path "${page.path}" is invalid (lowercase, hyphens, slashes only)`,
    };
  }
  return { valid: true, error: "" };
}

export function validateNavEntry(entry: NavEntry): ValidationResult {
  if (!isValidLabel(entry.label)) {
    return { valid: false, error: `Entry label "${entry.label}" is invalid` };
  }

  if (entry.type === "group") {
    if (!Array.isArray(entry.pages)) {
      return {
        valid: false,
        error: `Group "${entry.label}" must have a pages array`,
      };
    }
    if (entry.pages.length > MAX_PAGES_PER_GROUP) {
      return {
        valid: false,
        error: `Group "${entry.label}" exceeds ${MAX_PAGES_PER_GROUP} pages`,
      };
    }
    for (const page of entry.pages) {
      const result = validateNavPage(page);
      if (!result.valid) return result;
    }
  }

  if (entry.type === "tab" && entry.href && !isValidHref(entry.href)) {
    return { valid: false, error: `Tab "${entry.label}" has invalid href` };
  }

  if (entry.type === "anchor") {
    if (!isValidHref(entry.href)) {
      return {
        valid: false,
        error: `Anchor "${entry.label}" has invalid href`,
      };
    }
  }

  return { valid: true, error: "" };
}

export function validateNavigation(config: NavigationConfig): ValidationResult {
  if (!config || !Array.isArray(config.entries)) {
    return { valid: false, error: "Navigation must have an entries array" };
  }
  if (config.entries.length > MAX_ENTRIES) {
    return { valid: false, error: `Navigation exceeds ${MAX_ENTRIES} entries` };
  }
  for (const entry of config.entries) {
    const result = validateNavEntry(entry);
    if (!result.valid) return result;
  }
  return { valid: true, error: "" };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function mergeNavigation(
  partial: Partial<NavigationConfig> | undefined | null,
): NavigationConfig {
  if (
    !partial ||
    !Array.isArray(partial.entries) ||
    partial.entries.length === 0
  ) {
    return DEFAULT_NAVIGATION;
  }
  return { entries: partial.entries };
}

export function createGroup(label: string, icon?: string): NavGroup {
  return { type: "group", label, icon, pages: [] };
}

export function createPage(
  label: string,
  path: string,
  icon?: string,
): NavPage {
  return { type: "page", label, path, icon };
}

export function createTab(label: string, href?: string): NavTab {
  return { type: "tab", label, href };
}

export function createAnchor(
  label: string,
  href: string,
  icon?: string,
): NavAnchor {
  return { type: "anchor", label, href, icon };
}

/** Move an item in an array from one index to another */
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) {
    return arr;
  }
  const result = [...arr];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

/** Count total pages across all groups */
export function countPages(config: NavigationConfig): number {
  return config.entries.reduce((total, entry) => {
    if (entry.type === "group") {
      return total + entry.pages.length;
    }
    return total;
  }, 0);
}

/** Get a flat list of all page paths for duplicate detection */
export function getAllPaths(config: NavigationConfig): string[] {
  const paths: string[] = [];
  for (const entry of config.entries) {
    if (entry.type === "group") {
      for (const page of entry.pages) {
        paths.push(page.path);
      }
    }
  }
  return paths;
}

/** Check for duplicate paths */
export function findDuplicatePaths(config: NavigationConfig): string[] {
  const paths = getAllPaths(config);
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const path of paths) {
    if (seen.has(path)) {
      duplicates.push(path);
    }
    seen.add(path);
  }
  return duplicates;
}

/** Slugify a label to generate a path */
export function labelToPath(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
