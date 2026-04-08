"use client";

import {
  getMethodBadge,
  getWebhookBadge,
  isWebhook,
} from "@/lib/api-reference";
import type { DocsNavEntry } from "@/lib/mdx-renderer";
import { ChevronDown, FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface DocsSidebarProps {
  nav: DocsNavEntry[];
  activePath: string;
  subdomain: string;
  projectName: string;
}

export function DocsSidebar({
  nav,
  activePath,
  subdomain,
  projectName,
}: DocsSidebarProps) {
  return (
    <aside className="docs-sidebar">
      <div className="docs-sidebar-header">
        <Link href={`/docs/${subdomain}`} className="docs-logo">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Logo"
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
  const isGroupActive = entry.items.some((item) => item.path === activePath);
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="docs-nav-group">
      <button
        type="button"
        className="docs-nav-group-label"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{entry.label}</span>
        <ChevronDown
          size={14}
          className={`docs-nav-chevron ${isOpen ? "open" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="docs-nav-group-items">
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
