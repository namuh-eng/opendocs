"use client";

import {
  getMethodBadge,
  getWebhookBadge,
  isWebhook,
} from "@/lib/api-reference";
import type { DocsNavEntry } from "@/lib/mdx-renderer";
import { ChevronDown, FileText } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { DocsLogoMark, getConfiguredDocsLogo } from "./docs-logo";

interface DocsSidebarProps {
  nav: DocsNavEntry[];
  activePath: string;
  subdomain: string;
  projectName: string;
  settings?: Record<string, unknown>;
}

export function DocsSidebar({
  nav,
  activePath,
  subdomain,
  projectName,
  settings,
}: DocsSidebarProps) {
  const configuredLogo = getConfiguredDocsLogo(settings);
  const logoHref = configuredLogo?.href || `/docs/${subdomain}`;

  return (
    <aside className="docs-sidebar">
      <div className="docs-sidebar-header">
        <Link href={logoHref} className="docs-logo">
          {configuredLogo ? (
            <img
              src={configuredLogo.path}
              alt="Logo"
              className="docs-sidebar-logo-image"
            />
          ) : (
            <DocsLogoMark />
          )}
          <span className="docs-logo-text">{projectName}</span>
        </Link>
      </div>

      <nav className="docs-nav">
        {nav.map((entry) => {
          if (entry.type === "item") {
            return (
              <NavItem
                key={entry.pageId}
                entry={entry}
                activePath={activePath}
                subdomain={subdomain}
              />
            );
          }
          return (
            <NavGroup
              key={entry.label}
              entry={entry}
              activePath={activePath}
              subdomain={subdomain}
            />
          );
        })}
      </nav>
    </aside>
  );
}

function NavItem({
  entry,
  activePath,
  subdomain,
}: {
  entry: DocsNavEntry & { type: "item" };
  activePath: string;
  subdomain: string;
}) {
  const isActive = activePath === entry.path;
  const method = entry.apiMethod;

  // Show method badge for API reference endpoints
  if (method) {
    const badge = isWebhook(method)
      ? getWebhookBadge()
      : getMethodBadge(method);
    return (
      <Link
        href={`/docs/${subdomain}/${entry.path}`}
        className={`docs-nav-item ${isActive ? "active" : ""}`}
      >
        <span className={`api-ref-sidebar-badge ${badge.colorClass}`}>
          {badge.label}
        </span>
        <span>{entry.label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={`/docs/${subdomain}/${entry.path}`}
      className={`docs-nav-item ${isActive ? "active" : ""}`}
    >
      <FileText size={14} />
      <span>{entry.label}</span>
    </Link>
  );
}

function NavGroup({
  entry,
  activePath,
  subdomain,
}: {
  entry: DocsNavEntry & { type: "group" };
  activePath: string;
  subdomain: string;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const groupItemsId = useId();

  return (
    <div className="docs-nav-group">
      <button
        type="button"
        className="docs-nav-group-label"
        aria-label={`Toggle ${entry.label} section`}
        aria-expanded={isOpen}
        aria-controls={groupItemsId}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{entry.label}</span>
        <ChevronDown
          size={14}
          className={`docs-nav-chevron ${isOpen ? "open" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="docs-nav-group-items" id={groupItemsId}>
          {entry.items.map((item) => (
            <NavItem
              key={item.pageId}
              entry={item}
              activePath={activePath}
              subdomain={subdomain}
            />
          ))}
        </div>
      )}
    </div>
  );
}
