/**
 * docs-config.ts — Types, defaults, validation, and helpers for the
 * Configurations panel (visual GUI editor for docs.json).
 *
 * Stored at project.settings.docsConfig (JSONB).
 */

import { isValidHexColor } from "./appearance";

// ── Section IDs ──────────────────────────────────────────────────────────

export const CONFIG_SECTION_IDS = [
  "overview",
  "visual-branding",
  "typography",
  "header-topbar",
  "footer",
  "content-features",
  "assistant-search",
  "integrations",
  "api-docs",
  "advanced",
] as const;

export type ConfigSectionId = (typeof CONFIG_SECTION_IDS)[number];

// ── Section metadata ─────────────────────────────────────────────────────

export interface ConfigSection {
  id: ConfigSectionId;
  label: string;
  description: string;
}

export const CONFIG_SECTIONS: ConfigSection[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Project name, description, and base URL",
  },
  {
    id: "visual-branding",
    label: "Visual Branding",
    description: "Theme, colors, and logos",
  },
  {
    id: "typography",
    label: "Typography",
    description: "Font families for headings and body",
  },
  {
    id: "header-topbar",
    label: "Header & Topbar",
    description: "Top navigation bar links and logo",
  },
  {
    id: "footer",
    label: "Footer",
    description: "Footer links and social accounts",
  },
  {
    id: "content-features",
    label: "Content Features",
    description: "Thumbnails, code theme, LaTeX, and icons",
  },
  {
    id: "assistant-search",
    label: "Assistant & Search",
    description: "AI assistant and search configuration",
  },
  {
    id: "integrations",
    label: "Integrations",
    description: "Analytics, support, and third-party tools",
  },
  {
    id: "api-docs",
    label: "API Documentation",
    description: "OpenAPI spec URL and API playground settings",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Redirects, metadata, and custom settings",
  },
];

// ── Data shapes per section ──────────────────────────────────────────────

export interface OverviewConfig {
  name: string;
  description: string;
  baseUrl: string;
}

export interface VisualBrandingConfig {
  theme: "light" | "dark" | "system";
  primaryColor: string;
  lightColor: string;
  darkColor: string;
  logoLightPath: string;
  logoDarkPath: string;
  logoLink: string;
}

export interface TypographyConfig {
  headingFont: string;
  bodyFont: string;
}

export interface TopbarLink {
  label: string;
  url: string;
}

export interface HeaderTopbarConfig {
  logoPath: string;
  topbarLinks: TopbarLink[];
}

export interface FooterSocialLink {
  type: "x" | "github" | "linkedin" | "discord" | "slack" | "website";
  url: string;
}

export interface FooterConfig {
  brandName: string;
  brandUrl: string;
  socialLinks: FooterSocialLink[];
}

export interface ContentFeaturesConfig {
  thumbnails: boolean;
  codeBlockTheme: "github-dark" | "monokai" | "dracula" | "one-dark" | "nord";
  latex: boolean;
  iconLibrary: "lucide" | "fontawesome" | "heroicons" | "none";
}

export interface AssistantSearchConfig {
  assistantEnabled: boolean;
  searchEnabled: boolean;
  searchPrompt: string;
}

export interface IntegrationEntry {
  name: string;
  value: string;
}

export interface IntegrationsConfig {
  ga4MeasurementId: string;
  intercomAppId: string;
  custom: IntegrationEntry[];
}

export interface ApiDocsConfig {
  openApiSpecUrl: string;
  playgroundEnabled: boolean;
  baseApiUrl: string;
}

export interface RedirectEntry {
  source: string;
  destination: string;
}

export interface AdvancedConfig {
  seoTitle: string;
  seoDescription: string;
  customHead: string;
  customCSS: string;
  customJS: string;
  redirects: RedirectEntry[];
}

export interface DocsConfig {
  overview: OverviewConfig;
  visualBranding: VisualBrandingConfig;
  typography: TypographyConfig;
  headerTopbar: HeaderTopbarConfig;
  footer: FooterConfig;
  contentFeatures: ContentFeaturesConfig;
  assistantSearch: AssistantSearchConfig;
  integrations: IntegrationsConfig;
  apiDocs: ApiDocsConfig;
  advanced: AdvancedConfig;
}

// ── Defaults ─────────────────────────────────────────────────────────────

export const DEFAULT_OVERVIEW: OverviewConfig = {
  name: "",
  description: "",
  baseUrl: "",
};

export const DEFAULT_VISUAL_BRANDING: VisualBrandingConfig = {
  theme: "dark",
  primaryColor: "#16A34A",
  lightColor: "#FFFFFF",
  darkColor: "#0F0F0F",
  logoLightPath: "",
  logoDarkPath: "",
  logoLink: "/",
};

export const DEFAULT_TYPOGRAPHY: TypographyConfig = {
  headingFont: "Inter",
  bodyFont: "Inter",
};

export const DEFAULT_HEADER_TOPBAR: HeaderTopbarConfig = {
  logoPath: "",
  topbarLinks: [],
};

export const DEFAULT_FOOTER: FooterConfig = {
  brandName: "",
  brandUrl: "",
  socialLinks: [],
};

export const DEFAULT_CONTENT_FEATURES: ContentFeaturesConfig = {
  thumbnails: false,
  codeBlockTheme: "github-dark",
  latex: false,
  iconLibrary: "lucide",
};

export const DEFAULT_ASSISTANT_SEARCH: AssistantSearchConfig = {
  assistantEnabled: true,
  searchEnabled: true,
  searchPrompt: "Ask anything...",
};

export const DEFAULT_INTEGRATIONS: IntegrationsConfig = {
  ga4MeasurementId: "",
  intercomAppId: "",
  custom: [],
};

export const DEFAULT_API_DOCS: ApiDocsConfig = {
  openApiSpecUrl: "",
  playgroundEnabled: true,
  baseApiUrl: "",
};

export const DEFAULT_ADVANCED: AdvancedConfig = {
  seoTitle: "",
  seoDescription: "",
  customHead: "",
  customCSS: "",
  customJS: "",
  redirects: [],
};

export const DEFAULT_DOCS_CONFIG: DocsConfig = {
  overview: DEFAULT_OVERVIEW,
  visualBranding: DEFAULT_VISUAL_BRANDING,
  typography: DEFAULT_TYPOGRAPHY,
  headerTopbar: DEFAULT_HEADER_TOPBAR,
  footer: DEFAULT_FOOTER,
  contentFeatures: DEFAULT_CONTENT_FEATURES,
  assistantSearch: DEFAULT_ASSISTANT_SEARCH,
  integrations: DEFAULT_INTEGRATIONS,
  apiDocs: DEFAULT_API_DOCS,
  advanced: DEFAULT_ADVANCED,
};

// ── Merge helper ─────────────────────────────────────────────────────────

/** Deep-merge a partial config with defaults (one level deep per section). */
export function mergeDocsConfig(
  partial: Partial<Record<string, unknown>> | undefined,
): DocsConfig {
  if (!partial) return { ...DEFAULT_DOCS_CONFIG };
  return {
    overview: { ...DEFAULT_OVERVIEW, ...((partial.overview as object) ?? {}) },
    visualBranding: {
      ...DEFAULT_VISUAL_BRANDING,
      ...((partial.visualBranding as object) ?? {}),
    },
    typography: {
      ...DEFAULT_TYPOGRAPHY,
      ...((partial.typography as object) ?? {}),
    },
    headerTopbar: {
      ...DEFAULT_HEADER_TOPBAR,
      ...((partial.headerTopbar as object) ?? {}),
      topbarLinks: Array.isArray(
        (partial.headerTopbar as HeaderTopbarConfig)?.topbarLinks,
      )
        ? (partial.headerTopbar as HeaderTopbarConfig).topbarLinks
        : DEFAULT_HEADER_TOPBAR.topbarLinks,
    },
    footer: {
      ...DEFAULT_FOOTER,
      ...((partial.footer as object) ?? {}),
      socialLinks: Array.isArray((partial.footer as FooterConfig)?.socialLinks)
        ? (partial.footer as FooterConfig).socialLinks
        : DEFAULT_FOOTER.socialLinks,
    },
    contentFeatures: {
      ...DEFAULT_CONTENT_FEATURES,
      ...((partial.contentFeatures as object) ?? {}),
    },
    assistantSearch: {
      ...DEFAULT_ASSISTANT_SEARCH,
      ...((partial.assistantSearch as object) ?? {}),
    },
    integrations: {
      ...DEFAULT_INTEGRATIONS,
      ...((partial.integrations as object) ?? {}),
      custom: Array.isArray(
        (partial.integrations as IntegrationsConfig)?.custom,
      )
        ? (partial.integrations as IntegrationsConfig).custom
        : DEFAULT_INTEGRATIONS.custom,
    },
    apiDocs: {
      ...DEFAULT_API_DOCS,
      ...((partial.apiDocs as object) ?? {}),
    },
    advanced: {
      ...DEFAULT_ADVANCED,
      ...((partial.advanced as object) ?? {}),
      redirects: Array.isArray((partial.advanced as AdvancedConfig)?.redirects)
        ? (partial.advanced as AdvancedConfig).redirects
        : DEFAULT_ADVANCED.redirects,
    },
  };
}

// ── Validation ───────────────────────────────────────────────────────────

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateDocsConfig(config: DocsConfig): ValidationResult {
  // Visual branding colors
  for (const key of ["primaryColor", "lightColor", "darkColor"] as const) {
    if (
      config.visualBranding[key] &&
      !isValidHexColor(config.visualBranding[key])
    ) {
      return { valid: false, error: `Invalid hex color for ${key}` };
    }
  }

  // Theme
  if (!["light", "dark", "system"].includes(config.visualBranding.theme)) {
    return { valid: false, error: "Theme must be light, dark, or system" };
  }

  // Code block theme
  const validCodeThemes = [
    "github-dark",
    "monokai",
    "dracula",
    "one-dark",
    "nord",
  ];
  if (!validCodeThemes.includes(config.contentFeatures.codeBlockTheme)) {
    return { valid: false, error: "Invalid code block theme" };
  }

  // Icon library
  const validIconLibs = ["lucide", "fontawesome", "heroicons", "none"];
  if (!validIconLibs.includes(config.contentFeatures.iconLibrary)) {
    return { valid: false, error: "Invalid icon library" };
  }

  // Topbar links
  for (const link of config.headerTopbar.topbarLinks) {
    if (!link.label.trim()) {
      return { valid: false, error: "Topbar link label cannot be empty" };
    }
    if (!link.url.trim()) {
      return { valid: false, error: "Topbar link URL cannot be empty" };
    }
  }

  // Footer social links
  const validSocialTypes = [
    "x",
    "github",
    "linkedin",
    "discord",
    "slack",
    "website",
  ];
  for (const link of config.footer.socialLinks) {
    if (!validSocialTypes.includes(link.type)) {
      return { valid: false, error: `Invalid social link type: ${link.type}` };
    }
    if (!link.url.trim()) {
      return { valid: false, error: "Social link URL cannot be empty" };
    }
  }

  // Redirects
  for (const r of config.advanced.redirects) {
    if (!r.source.trim()) {
      return { valid: false, error: "Redirect source path cannot be empty" };
    }
    if (!r.destination.trim()) {
      return {
        valid: false,
        error: "Redirect destination path cannot be empty",
      };
    }
    if (r.source === r.destination) {
      return {
        valid: false,
        error: `Redirect source and destination cannot be the same: ${r.source}`,
      };
    }
  }

  return { valid: true };
}

// ── Export / Import helpers ──────────────────────────────────────────────

/** Serialize the config to a JSON string for export. */
export function exportDocsConfigJson(config: DocsConfig): string {
  return JSON.stringify(config, null, 2);
}

/** Parse a JSON string into a DocsConfig, merging with defaults. */
export function importDocsConfigJson(
  json: string,
): { ok: true; config: DocsConfig } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(json);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return { ok: false, error: "Invalid JSON: expected an object" };
    }
    return { ok: true, config: mergeDocsConfig(parsed) };
  } catch {
    return { ok: false, error: "Failed to parse JSON" };
  }
}

/** Map section id to its key in DocsConfig. */
export function sectionIdToConfigKey(id: ConfigSectionId): keyof DocsConfig {
  const map: Record<ConfigSectionId, keyof DocsConfig> = {
    overview: "overview",
    "visual-branding": "visualBranding",
    typography: "typography",
    "header-topbar": "headerTopbar",
    footer: "footer",
    "content-features": "contentFeatures",
    "assistant-search": "assistantSearch",
    integrations: "integrations",
    "api-docs": "apiDocs",
    advanced: "advanced",
  };
  return map[id];
}

export const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

export const CODE_THEME_OPTIONS = [
  { value: "github-dark", label: "GitHub Dark" },
  { value: "monokai", label: "Monokai" },
  { value: "dracula", label: "Dracula" },
  { value: "one-dark", label: "One Dark" },
  { value: "nord", label: "Nord" },
] as const;

export const ICON_LIBRARY_OPTIONS = [
  { value: "lucide", label: "Lucide" },
  { value: "fontawesome", label: "Font Awesome" },
  { value: "heroicons", label: "Heroicons" },
  { value: "none", label: "None" },
] as const;

// ── Redirect matching ───────────────────────────────────────────────────

/** Normalize a path: strip leading/trailing slashes and lowercase. */
function normalizePath(p: string): string {
  return p.replace(/^\/+|\/+$/g, "").toLowerCase();
}

/**
 * Find a matching redirect for a given path.
 * Returns the destination path or null if no match.
 */
export function findRedirect(
  redirects: RedirectEntry[],
  path: string,
): string | null {
  const normalized = normalizePath(path);
  for (const r of redirects) {
    if (normalizePath(r.source) === normalized) {
      return r.destination;
    }
  }
  return null;
}

export const SOCIAL_LINK_TYPES = [
  { value: "x", label: "X / Twitter" },
  { value: "github", label: "GitHub" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "discord", label: "Discord" },
  { value: "slack", label: "Slack" },
  { value: "website", label: "Website" },
] as const;
