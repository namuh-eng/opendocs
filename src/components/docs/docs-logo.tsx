import { mergeDocsConfig } from "@/lib/docs-config";

export interface DocsLogoSettings {
  logoUrl?: string;
  logoDarkUrl?: string;
}

export function getConfiguredDocsLogo(
  settings: DocsLogoSettings | Record<string, unknown> | undefined,
): { path: string; href: string } | null {
  const raw = (settings || {}) as Record<string, unknown>;
  const rawDocsConfig = raw.docsConfig;

  if (!rawDocsConfig || typeof rawDocsConfig !== "object") {
    const legacyLogo =
      typeof raw.logoUrl === "string"
        ? raw.logoUrl
        : typeof raw.logoDarkUrl === "string"
          ? raw.logoDarkUrl
          : "";
    return legacyLogo ? { path: legacyLogo, href: "" } : null;
  }

  const docsConfig = mergeDocsConfig(
    rawDocsConfig as Partial<Record<string, unknown>>,
  );
  const path =
    docsConfig.headerTopbar.logoPath ||
    docsConfig.visualBranding.logoDarkPath ||
    docsConfig.visualBranding.logoLightPath;

  if (!path) return null;

  return { path, href: docsConfig.visualBranding.logoLink || "/" };
}

export function DocsLogoMark({
  size = 24,
  className = "docs-logo-mark",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Logo"
      className={className}
    >
      <title>Logo</title>
      <path d="M12 2L2 7l10 5 10-5-10-5Z" fill="currentColor" opacity="0.86" />
      <path
        d="M2 17l10 5 10-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 12l10 5 10-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
