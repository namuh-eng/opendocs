/**
 * docs-config.ts — Types, defaults, validation, and helpers for the
 * Configurations panel (visual GUI editor for docs.json).
 *
 * Stored at project.settings.docsConfig (JSONB).
 */

import { isValidHexColor } from "./appearance";
import {
  type ContextualAiMenuConfig,
  DEFAULT_CONTEXTUAL_AI_MENU,
} from "./contextual-ai-menu";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };
export type JsonObject = Record<string, JsonValue>;

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

export interface NavigationItem {
  label: string;
  path?: string;
  href?: string;
  pages?: string[];
  groups?: NavigationItem[];
}

export interface NavigationConfig {
  tabs: NavigationItem[];
  groups: NavigationItem[];
  anchors: TopbarLink[];
}

export interface ApiSpecConfig {
  name: string;
  url?: string;
  file?: string;
  navigation?: string;
  version?: string;
}

export interface DocsAuthConfig {
  mode: "public" | "password" | "org" | "groups" | "sso";
  groups: string[];
  ssoProvider?: string;
}

export interface DocsSeoConfig {
  title: string;
  description: string;
  robots: string;
  noindex: boolean;
}

export interface DocsLocalizationConfig {
  languages: string[];
  defaultLanguage: string;
  versions: string[];
  defaultVersion: string;
}

export interface ErrorPagesConfig {
  notFoundPath: string;
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
  navigation: NavigationConfig;
  apiSpecs: ApiSpecConfig[];
  auth: DocsAuthConfig;
  seo: DocsSeoConfig;
  localization: DocsLocalizationConfig;
  errorPages: ErrorPagesConfig;
  contextualAiMenu: ContextualAiMenuConfig;
  /** Unknown top-level fields from imported docs.json-like files, preserved for round-trip compatibility. */
  unknownFields: JsonObject;
}

// ── Defaults ─────────────────────────────────────────────────────────────

export const DEFAULT_OVERVIEW: OverviewConfig = {
  name: "",
  description: "",
  baseUrl: "",
};

export const DEFAULT_VISUAL_BRANDING: VisualBrandingConfig = {
  theme: "dark",
  primaryColor: "#7B8FDE",
  lightColor: "#F8F9FC",
  darkColor: "#0E0F18",
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

export const DEFAULT_NAVIGATION: NavigationConfig = {
  tabs: [],
  groups: [],
  anchors: [],
};

export const DEFAULT_AUTH: DocsAuthConfig = {
  mode: "public",
  groups: [],
};

export const DEFAULT_SEO: DocsSeoConfig = {
  title: "",
  description: "",
  robots: "index,follow",
  noindex: false,
};

export const DEFAULT_LOCALIZATION: DocsLocalizationConfig = {
  languages: [],
  defaultLanguage: "",
  versions: [],
  defaultVersion: "",
};

export const DEFAULT_ERROR_PAGES: ErrorPagesConfig = {
  notFoundPath: "",
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
  navigation: DEFAULT_NAVIGATION,
  apiSpecs: [],
  auth: DEFAULT_AUTH,
  seo: DEFAULT_SEO,
  localization: DEFAULT_LOCALIZATION,
  errorPages: DEFAULT_ERROR_PAGES,
  contextualAiMenu: DEFAULT_CONTEXTUAL_AI_MENU,
  unknownFields: {},
};

// ── Merge helper ─────────────────────────────────────────────────────────

const KNOWN_IMPORT_KEYS = new Set([
  ...Object.keys(DEFAULT_DOCS_CONFIG),
  "name",
  "description",
  "baseUrl",
  "colors",
  "logo",
  "navbar",
  "topbar",
  "navigation",
  "tabs",
  "anchors",
  "api",
  "apis",
  "openapi",
  "redirects",
  "seo",
  "auth",
  "authentication",
  "languages",
  "versions",
  "errors",
  "errorPages",
]);

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function normalizeTopbarLinks(value: unknown): TopbarLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const link = asRecord(entry);
    const label = asString(link.label) ?? asString(link.name);
    const url = asString(link.url) ?? asString(link.href);
    return label && url ? [{ label, url }] : [];
  });
}

function normalizeNavigationItems(value: unknown): NavigationItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap<NavigationItem>((entry) => {
    if (typeof entry === "string") return [{ label: entry, path: entry }];
    const item = asRecord(entry);
    const label =
      asString(item.label) ?? asString(item.name) ?? asString(item.group);
    if (!label) return [];
    return [
      {
        label,
        path: asString(item.path),
        href: asString(item.href),
        pages: asStringArray(item.pages),
        groups: normalizeNavigationItems(item.groups),
      },
    ];
  });
}

function normalizeRedirects(value: unknown): RedirectEntry[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      const redirect = asRecord(entry);
      const source = asString(redirect.source) ?? asString(redirect.from);
      const destination =
        asString(redirect.destination) ??
        asString(redirect.to) ??
        asString(redirect.target);
      return source && destination ? [{ source, destination }] : [];
    });
  }
  return Object.entries(asRecord(value)).flatMap(([source, destination]) =>
    typeof destination === "string" ? [{ source, destination }] : [],
  );
}

function normalizeApiSpecs(value: unknown): ApiSpecConfig[] {
  if (typeof value === "string") return [{ name: "API", url: value }];
  if (!Array.isArray(value)) return [];
  return value.flatMap<ApiSpecConfig>((entry, index) => {
    if (typeof entry === "string")
      return [{ name: `API ${index + 1}`, url: entry }];
    const spec = asRecord(entry);
    const url =
      asString(spec.url) ?? asString(spec.spec) ?? asString(spec.path);
    const file = asString(spec.file);
    if (!url && !file) return [];
    return [
      {
        name: asString(spec.name) ?? asString(spec.label) ?? `API ${index + 1}`,
        url,
        file,
        navigation: asString(spec.navigation),
        version: asString(spec.version),
      },
    ];
  });
}

function normalizeUnknownFields(partial: Record<string, unknown>): JsonObject {
  const unknownFields = asRecord(partial.unknownFields) as JsonObject;
  const preserved: JsonObject = { ...unknownFields };
  for (const [key, value] of Object.entries(partial)) {
    if (!KNOWN_IMPORT_KEYS.has(key)) preserved[key] = value as JsonValue;
  }
  return preserved;
}

/** Deep-merge a partial config with defaults and normalize docs.json-like keys. */
export function mergeDocsConfig(
  partial: Partial<Record<string, unknown>> | undefined,
): DocsConfig {
  if (!partial) return { ...DEFAULT_DOCS_CONFIG };
  const colors = asRecord(partial.colors);
  const logo = asRecord(partial.logo);
  const navbar = asRecord(partial.navbar ?? partial.topbar);
  const footerConfig = asRecord(partial.footer);
  const navigation = asRecord(partial.navigation);
  const api = asRecord(partial.api ?? partial.openapi);
  const seo = asRecord(partial.seo);
  const auth = asRecord(partial.auth ?? partial.authentication);
  const errors = asRecord(partial.errors ?? partial.errorPages);
  const localization = asRecord(partial.localization);
  return {
    overview: {
      ...DEFAULT_OVERVIEW,
      ...((partial.overview as object) ?? {}),
      name:
        asString(partial.name) ??
        (partial.overview as OverviewConfig)?.name ??
        DEFAULT_OVERVIEW.name,
      description:
        asString(partial.description) ??
        (partial.overview as OverviewConfig)?.description ??
        DEFAULT_OVERVIEW.description,
      baseUrl:
        asString(partial.baseUrl) ??
        (partial.overview as OverviewConfig)?.baseUrl ??
        DEFAULT_OVERVIEW.baseUrl,
    },
    visualBranding: {
      ...DEFAULT_VISUAL_BRANDING,
      ...((partial.visualBranding as object) ?? {}),
      primaryColor:
        asString(colors.primary) ??
        asString(colors.primaryColor) ??
        (partial.visualBranding as VisualBrandingConfig)?.primaryColor ??
        DEFAULT_VISUAL_BRANDING.primaryColor,
      lightColor:
        asString(colors.light) ??
        (partial.visualBranding as VisualBrandingConfig)?.lightColor ??
        DEFAULT_VISUAL_BRANDING.lightColor,
      darkColor:
        asString(colors.dark) ??
        (partial.visualBranding as VisualBrandingConfig)?.darkColor ??
        DEFAULT_VISUAL_BRANDING.darkColor,
      logoLightPath:
        asString(logo.light) ??
        (partial.visualBranding as VisualBrandingConfig)?.logoLightPath ??
        DEFAULT_VISUAL_BRANDING.logoLightPath,
      logoDarkPath:
        asString(logo.dark) ??
        (partial.visualBranding as VisualBrandingConfig)?.logoDarkPath ??
        DEFAULT_VISUAL_BRANDING.logoDarkPath,
    },
    typography: {
      ...DEFAULT_TYPOGRAPHY,
      ...((partial.typography as object) ?? {}),
    },
    headerTopbar: {
      ...DEFAULT_HEADER_TOPBAR,
      ...((partial.headerTopbar as object) ?? {}),
      logoPath:
        asString(navbar.logo) ??
        (partial.headerTopbar as HeaderTopbarConfig)?.logoPath ??
        DEFAULT_HEADER_TOPBAR.logoPath,
      topbarLinks:
        normalizeTopbarLinks(navbar.links).length > 0
          ? normalizeTopbarLinks(navbar.links)
          : Array.isArray(
                (partial.headerTopbar as HeaderTopbarConfig)?.topbarLinks,
              )
            ? (partial.headerTopbar as HeaderTopbarConfig).topbarLinks
            : DEFAULT_HEADER_TOPBAR.topbarLinks,
    },
    footer: {
      ...DEFAULT_FOOTER,
      ...((partial.footer as object) ?? {}),
      brandName:
        asString(footerConfig.brandName) ??
        asString(footerConfig.name) ??
        (partial.footer as FooterConfig)?.brandName ??
        DEFAULT_FOOTER.brandName,
      brandUrl:
        asString(footerConfig.brandUrl) ??
        asString(footerConfig.url) ??
        (partial.footer as FooterConfig)?.brandUrl ??
        DEFAULT_FOOTER.brandUrl,
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
      openApiSpecUrl:
        asString(api.url) ??
        asString(api.spec) ??
        asString(partial.openapi) ??
        (partial.apiDocs as ApiDocsConfig)?.openApiSpecUrl ??
        DEFAULT_API_DOCS.openApiSpecUrl,
    },
    advanced: {
      ...DEFAULT_ADVANCED,
      ...((partial.advanced as object) ?? {}),
      seoTitle:
        asString(seo.title) ??
        (partial.advanced as AdvancedConfig)?.seoTitle ??
        DEFAULT_ADVANCED.seoTitle,
      seoDescription:
        asString(seo.description) ??
        (partial.advanced as AdvancedConfig)?.seoDescription ??
        DEFAULT_ADVANCED.seoDescription,
      redirects:
        normalizeRedirects(partial.redirects).length > 0
          ? normalizeRedirects(partial.redirects)
          : Array.isArray((partial.advanced as AdvancedConfig)?.redirects)
            ? (partial.advanced as AdvancedConfig).redirects
            : DEFAULT_ADVANCED.redirects,
    },
    navigation: {
      ...DEFAULT_NAVIGATION,
      ...((partial.navigation as object) ?? {}),
      tabs:
        normalizeNavigationItems(navigation.tabs).length > 0
          ? normalizeNavigationItems(navigation.tabs)
          : Array.isArray((partial.navigation as NavigationConfig)?.tabs)
            ? (partial.navigation as NavigationConfig).tabs
            : normalizeNavigationItems(partial.tabs),
      groups:
        normalizeNavigationItems(navigation.groups).length > 0
          ? normalizeNavigationItems(navigation.groups)
          : Array.isArray((partial.navigation as NavigationConfig)?.groups)
            ? (partial.navigation as NavigationConfig).groups
            : normalizeNavigationItems(partial.navigation),
      anchors:
        normalizeTopbarLinks(navigation.anchors).length > 0
          ? normalizeTopbarLinks(navigation.anchors)
          : Array.isArray((partial.navigation as NavigationConfig)?.anchors)
            ? (partial.navigation as NavigationConfig).anchors
            : normalizeTopbarLinks(partial.anchors),
    },
    apiSpecs:
      normalizeApiSpecs(partial.apis).length > 0
        ? normalizeApiSpecs(partial.apis)
        : Array.isArray(partial.apiSpecs)
          ? (partial.apiSpecs as ApiSpecConfig[])
          : normalizeApiSpecs(api.specs),
    auth: {
      ...DEFAULT_AUTH,
      ...((partial.auth as object) ?? {}),
      mode:
        (asString(auth.mode) as DocsAuthConfig["mode"] | undefined) ??
        (asString(auth.type) as DocsAuthConfig["mode"] | undefined) ??
        (partial.auth as DocsAuthConfig)?.mode ??
        DEFAULT_AUTH.mode,
      groups:
        asStringArray(auth.groups).length > 0
          ? asStringArray(auth.groups)
          : Array.isArray((partial.auth as DocsAuthConfig)?.groups)
            ? (partial.auth as DocsAuthConfig).groups
            : DEFAULT_AUTH.groups,
      ssoProvider:
        asString(auth.ssoProvider) ??
        (partial.auth as DocsAuthConfig)?.ssoProvider,
    },
    seo: {
      ...DEFAULT_SEO,
      ...((partial.seo as object) ?? {}),
      title:
        asString(seo.title) ??
        (partial.seo as DocsSeoConfig)?.title ??
        DEFAULT_SEO.title,
      description:
        asString(seo.description) ??
        (partial.seo as DocsSeoConfig)?.description ??
        DEFAULT_SEO.description,
      noindex:
        typeof seo.noindex === "boolean"
          ? seo.noindex
          : ((partial.seo as DocsSeoConfig)?.noindex ?? DEFAULT_SEO.noindex),
    },
    localization: {
      ...DEFAULT_LOCALIZATION,
      ...localization,
      languages:
        asStringArray(partial.languages).length > 0
          ? asStringArray(partial.languages)
          : asStringArray(localization.languages).length > 0
            ? asStringArray(localization.languages)
            : Array.isArray(
                  (partial.localization as DocsLocalizationConfig)?.languages,
                )
              ? (partial.localization as DocsLocalizationConfig).languages
              : DEFAULT_LOCALIZATION.languages,
      versions:
        asStringArray(partial.versions).length > 0
          ? asStringArray(partial.versions)
          : asStringArray(localization.versions).length > 0
            ? asStringArray(localization.versions)
            : Array.isArray(
                  (partial.localization as DocsLocalizationConfig)?.versions,
                )
              ? (partial.localization as DocsLocalizationConfig).versions
              : DEFAULT_LOCALIZATION.versions,
    },
    errorPages: {
      ...DEFAULT_ERROR_PAGES,
      ...((partial.errorPages as object) ?? {}),
      notFoundPath:
        asString(errors.notFoundPath) ??
        asString(errors["404"]) ??
        (partial.errorPages as ErrorPagesConfig)?.notFoundPath ??
        DEFAULT_ERROR_PAGES.notFoundPath,
    },
    contextualAiMenu: {
      ...DEFAULT_CONTEXTUAL_AI_MENU,
      ...((partial.contextualAiMenu as object) ?? {}),
      tools: Array.isArray(
        (partial.contextualAiMenu as ContextualAiMenuConfig)?.tools,
      )
        ? (partial.contextualAiMenu as ContextualAiMenuConfig).tools
        : DEFAULT_CONTEXTUAL_AI_MENU.tools,
    },
    unknownFields: normalizeUnknownFields(partial),
  };
}

export function getDocsThemeCssVars(
  config: DocsConfig,
): Record<string, string> {
  return {
    "--docs-primary": config.visualBranding.primaryColor,
    "--docs-logo-color": config.visualBranding.primaryColor,
    "--docs-primary-soft": `${config.visualBranding.primaryColor}22`,
    "--docs-light-bg": config.visualBranding.lightColor,
    "--docs-dark-bg": config.visualBranding.darkColor,
    "--docs-bg": config.visualBranding.darkColor,
    "--docs-bg-deep": config.visualBranding.darkColor,
    "--docs-card": `color-mix(in srgb, ${config.visualBranding.darkColor} 86%, white)`,
  };
}

// ── Validation ───────────────────────────────────────────────────────────

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string; errors: ValidationIssue[] };

function invalid(errors: ValidationIssue[]): ValidationResult {
  return {
    valid: false,
    error: errors[0]?.message ?? "Invalid config",
    errors,
  };
}

export function validateDocsConfig(config: DocsConfig): ValidationResult {
  const errors: ValidationIssue[] = [];
  const addIssue = (path: string, message: string) =>
    errors.push({ path, message });

  for (const key of ["primaryColor", "lightColor", "darkColor"] as const) {
    if (
      config.visualBranding[key] &&
      !isValidHexColor(config.visualBranding[key])
    ) {
      addIssue(`visualBranding.${key}`, `Invalid hex color for ${key}`);
    }
  }

  if (
    !config.visualBranding.logoLightPath &&
    !config.visualBranding.logoDarkPath
  ) {
    // Logos are optional, but keeping this as non-blocking avoids noisy imports.
  }

  if (!["light", "dark", "system"].includes(config.visualBranding.theme)) {
    addIssue("visualBranding.theme", "Theme must be light, dark, or system");
  }

  const validCodeThemes = [
    "github-dark",
    "monokai",
    "dracula",
    "one-dark",
    "nord",
  ];
  if (!validCodeThemes.includes(config.contentFeatures.codeBlockTheme)) {
    addIssue("contentFeatures.codeBlockTheme", "Invalid code block theme");
  }

  const validIconLibs = ["lucide", "fontawesome", "heroicons", "none"];
  if (!validIconLibs.includes(config.contentFeatures.iconLibrary)) {
    addIssue("contentFeatures.iconLibrary", "Invalid icon library");
  }

  config.headerTopbar.topbarLinks.forEach((link, index) => {
    if (!link.label.trim()) {
      addIssue(
        `headerTopbar.topbarLinks.${index}.label`,
        "Topbar link label cannot be empty",
      );
    }
    if (!link.url.trim()) {
      addIssue(
        `headerTopbar.topbarLinks.${index}.url`,
        "Topbar link URL cannot be empty",
      );
    }
  });

  const validSocialTypes = [
    "x",
    "github",
    "linkedin",
    "discord",
    "slack",
    "website",
  ];
  config.footer.socialLinks.forEach((link, index) => {
    if (!validSocialTypes.includes(link.type)) {
      addIssue(
        `footer.socialLinks.${index}.type`,
        `Invalid social link type: ${link.type}`,
      );
    }
    if (!link.url.trim()) {
      addIssue(
        `footer.socialLinks.${index}.url`,
        "Social link URL cannot be empty",
      );
    }
  });

  config.advanced.redirects.forEach((redirect, index) => {
    if (!redirect.source.trim()) {
      addIssue(
        `advanced.redirects.${index}.source`,
        "Redirect source path cannot be empty",
      );
    }
    if (!redirect.destination.trim()) {
      addIssue(
        `advanced.redirects.${index}.destination`,
        "Redirect destination path cannot be empty",
      );
    }
    if (redirect.source === redirect.destination) {
      addIssue(
        `advanced.redirects.${index}`,
        `Redirect source and destination cannot be the same: ${redirect.source}`,
      );
    }
  });

  config.apiSpecs.forEach((spec, index) => {
    if (!spec.name.trim()) {
      addIssue(`apiSpecs.${index}.name`, "API spec name cannot be empty");
    }
    if (!spec.url?.trim() && !spec.file?.trim()) {
      addIssue(`apiSpecs.${index}`, "API spec must include a URL or file path");
    }
  });

  if (
    !["public", "password", "org", "groups", "sso"].includes(config.auth.mode)
  ) {
    addIssue(
      "auth.mode",
      "Auth mode must be public, password, org, groups, or sso",
    );
  }
  if (config.auth.mode === "groups" && config.auth.groups.length === 0) {
    addIssue(
      "auth.groups",
      "Group-restricted auth requires at least one group",
    );
  }

  return errors.length > 0 ? invalid(errors) : { valid: true };
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
