"use client";

import Link from "next/link";
import { LanguageSwitcher } from "./language-switcher";
import { MobileMenuButton } from "./mobile-nav";
import { ThemeToggle } from "./theme-provider";

interface DocsTopbarSettings {
  githubUrl?: string;
  supportEmail?: string;
  logoUrl?: string;
  logoDarkUrl?: string;
}

interface I18nProps {
  currentLocale: string;
  availableLocales: string[];
  defaultLanguage: string;
  pagePath: string;
}

interface DocsTopbarProps {
  projectName: string;
  subdomain: string;
  settings?: DocsTopbarSettings | Record<string, unknown>;
  i18n?: I18nProps;
}

/** Build a dashboard URL */
export function buildDashboardUrl(_subdomain: string): string {
  return "/dashboard";
}

/** Build a mailto href for support */
export function buildSupportHref(email: string | undefined): string {
  return `mailto:${email || "support@example.com"}`;
}

/** Get link props for GitHub icon, or null if no URL */
export function getGithubLinkProps(
  url: string | undefined,
): { href: string; target: string; rel: string } | null {
  if (!url) return null;
  return { href: url, target: "_blank", rel: "noopener noreferrer" };
}

/** Ask AI button — dispatches toggle-ask-ai custom event */
export function AskAiButton() {
  return (
    <button
      type="button"
      data-testid="ask-ai-btn"
      className="docs-topbar-ask-ai"
      onClick={() => {
        document.dispatchEvent(new CustomEvent("toggle-ask-ai"));
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
        <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
      </svg>
      <span className="docs-topbar-ask-ai-text">Ask AI</span>
    </button>
  );
}

export function DocsTopbar({
  projectName,
  subdomain,
  settings,
  i18n,
}: DocsTopbarProps) {
  const s = (settings || {}) as DocsTopbarSettings;
  const githubProps = getGithubLinkProps(s.githubUrl);
  const supportHref = buildSupportHref(s.supportEmail);
  const dashboardUrl = buildDashboardUrl(subdomain);

  return (
    <div className="docs-topbar">
      <div className="docs-topbar-left">
        <MobileMenuButton />
        <Link href={`/docs/${subdomain}`} className="docs-topbar-logo">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Logo"
            className="docs-topbar-logo-icon"
          >
            <title>Logo</title>
            <path d="M12 2L2 7l10 5 10-5-10-5Z" fill="#16A34A" opacity="0.8" />
            <path
              d="M2 17l10 5 10-5"
              stroke="#16A34A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12l10 5 10-5"
              stroke="#16A34A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="docs-topbar-title">{projectName}</span>
        </Link>
      </div>

      <div className="docs-topbar-center">
        <button
          type="button"
          className="docs-search-btn"
          onClick={() => {
            document.dispatchEvent(new CustomEvent("open-search"));
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-label="Search"
          >
            <title>Search</title>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span className="docs-search-text">Search...</span>
          <kbd>&#8984;K</kbd>
        </button>
        <AskAiButton />
      </div>

      <div className="docs-topbar-right">
        <a
          data-testid="topbar-support-link"
          href={supportHref}
          className="docs-topbar-link"
        >
          Support
        </a>

        {githubProps && (
          <a
            data-testid="topbar-github-link"
            href={githubProps.href}
            target={githubProps.target}
            rel={githubProps.rel}
            className="docs-topbar-icon-link"
            aria-label="GitHub repository"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span className="sr-only">GitHub</span>
          </a>
        )}

        <Link
          data-testid="topbar-dashboard-link"
          href={dashboardUrl}
          className="docs-topbar-dashboard-btn"
        >
          Dashboard
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M7 17L17 7" />
            <path d="M7 7h10v10" />
          </svg>
        </Link>

        {i18n && i18n.availableLocales.length > 1 && (
          <LanguageSwitcher
            currentLocale={i18n.currentLocale}
            availableLocales={i18n.availableLocales}
            subdomain={subdomain}
            pagePath={i18n.pagePath}
            defaultLanguage={i18n.defaultLanguage}
          />
        )}

        <ThemeToggle />
      </div>
    </div>
  );
}
