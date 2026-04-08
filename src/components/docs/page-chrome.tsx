"use client";

import type { ContextualAiMenuConfig } from "@/lib/contextual-ai-menu";
import { pageToMarkdown } from "@/lib/page-chrome";
import { Check, Copy, Link2, MoreVertical } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ContextualAiMenu } from "./contextual-ai-menu";

interface PageHeaderActionsProps {
  title: string;
  content: string;
  pageUrl: string;
  contextualAiMenu?: ContextualAiMenuConfig;
}

/** Copy page button + More actions kebab dropdown next to page H1 */
export function PageHeaderActions({
  title,
  content,
  pageUrl,
  contextualAiMenu,
}: PageHeaderActionsProps) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async () => {
    const md = pageToMarkdown(title, content);
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [title, content]);

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href);
    setMenuOpen(false);
  }, []);

  const handleViewSource = useCallback(() => {
    // Open raw markdown in new tab (via page URL)
    window.open(pageUrl, "_blank");
    setMenuOpen(false);
  }, [pageUrl]);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <div className="page-header-actions">
      {contextualAiMenu && (
        <ContextualAiMenu
          config={contextualAiMenu}
          title={title}
          content={content}
          pageUrl={pageUrl}
        />
      )}

      <button
        type="button"
        data-testid="copy-page-btn"
        className="page-action-btn"
        onClick={handleCopy}
        title="Copy page as markdown"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>

      <div className="page-actions-dropdown" ref={menuRef}>
        <button
          type="button"
          data-testid="page-actions-btn"
          className="page-action-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          title="More actions"
        >
          <MoreVertical size={16} />
        </button>

        {menuOpen && (
          <div className="page-actions-menu">
            <button
              type="button"
              className="page-actions-menu-item"
              onClick={handleCopyLink}
            >
              <Link2 size={14} />
              Copy link
            </button>
            <button
              type="button"
              className="page-actions-menu-item"
              onClick={handleViewSource}
            >
              <Copy size={14} />
              View source
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Client component to add anchor link icons to headings after mount */
export function HeadingAnchors() {
  useEffect(() => {
    const headings = document.querySelectorAll(".docs-content .heading-anchor");
    for (const anchor of headings) {
      // Skip if already has icon
      if (anchor.querySelector(".heading-anchor-icon")) continue;

      const icon = document.createElement("span");
      icon.className = "heading-anchor-icon";
      icon.setAttribute("aria-hidden", "true");
      // Insert icon before the text
      anchor.insertBefore(icon, anchor.firstChild);
    }

    // Handle click to update URL hash
    function handleAnchorClick(e: Event) {
      const target = e.currentTarget as HTMLAnchorElement;
      const href = target.getAttribute("href");
      if (href?.startsWith("#")) {
        e.preventDefault();
        const id = href.slice(1);
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          window.history.replaceState(null, "", href);
        }
      }
    }

    for (const anchor of headings) {
      anchor.addEventListener("click", handleAnchorClick);
    }

    return () => {
      for (const anchor of headings) {
        anchor.removeEventListener("click", handleAnchorClick);
      }
    };
  }, []);

  return null;
}
