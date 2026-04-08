/**
 * Docs site footer utilities — social links, branding, and configuration.
 */

export interface FooterSocialLink {
  type: "x" | "github" | "linkedin";
  url: string;
}

export interface FooterSettings {
  socialLinks?: FooterSocialLink[];
  brandName?: string;
  brandUrl?: string;
}

/** Default social link types with labels */
export const SOCIAL_LINK_TYPES: Record<
  FooterSocialLink["type"],
  { label: string; ariaLabel: string }
> = {
  x: { label: "X (Twitter)", ariaLabel: "Follow on X" },
  github: { label: "GitHub", ariaLabel: "View on GitHub" },
  linkedin: { label: "LinkedIn", ariaLabel: "Connect on LinkedIn" },
};

/** Extract footer settings from project settings */
export function getFooterSettings(
  settings: Record<string, unknown> | null | undefined,
): FooterSettings {
  if (!settings) return {};
  const footer = settings.footer as FooterSettings | undefined;
  return footer || {};
}

/** Get valid social links (non-empty URL, known type) */
export function getValidSocialLinks(
  footerSettings: FooterSettings,
): FooterSocialLink[] {
  if (!footerSettings.socialLinks) return [];
  return footerSettings.socialLinks.filter(
    (link) =>
      link.url &&
      typeof link.url === "string" &&
      link.url.trim().length > 0 &&
      link.type in SOCIAL_LINK_TYPES,
  );
}

/** Get the brand name, defaulting to project name or "Mintlify" */
export function getBrandName(
  footerSettings: FooterSettings,
  projectName?: string,
): string {
  return footerSettings.brandName || projectName || "Mintlify";
}

/** Get the brand URL, defaulting to "/" */
export function getBrandUrl(footerSettings: FooterSettings): string {
  return footerSettings.brandUrl || "/";
}

/** Build the powered-by tooltip text */
export function getPoweredByTooltip(brandName: string): string {
  return `This documentation is built and hosted on ${brandName}`;
}
