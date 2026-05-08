"use client";

import type { ContextualAiMenuConfig } from "@/lib/contextual-ai-menu";
import { pageToMarkdown } from "@/lib/page-chrome";
import { Check, Copy, Link2, MoreVertical } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
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
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

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

  const handleToggleMenu = useCallback(() => {
    menuButtonRef.current?.focus();
    setMenuOpen((open) => !open);
  }, []);

  // Close menu on click outside or Escape.
  useEffect(() => {
    if (!menuOpen) return;

    function closeMenu({ restoreFocus }: { restoreFocus: boolean }) {
      setMenuOpen(false);
      if (restoreFocus) {
        menuButtonRef.current?.focus();
      }
    }

    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu({ restoreFocus: false });
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu({ restoreFocus: true });
      }
    }

    document.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
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
        className={`page-action-btn page-copy-btn${copied ? " copied" : ""}`}
        onClick={handleCopy}
        aria-label={copied ? "Copied page markdown" : "Copy page as markdown"}
        title={copied ? "Copied" : "Copy page as markdown"}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied && <span>Copied</span>}
      </button>

      <div className="page-actions-dropdown" ref={menuRef}>
        <button
          ref={menuButtonRef}
          type="button"
          data-testid="page-actions-btn"
          className="page-action-btn"
          onClick={handleToggleMenu}
          aria-label="More page actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? menuId : undefined}
          title="More actions"
        >
          <MoreVertical size={16} />
        </button>

        {menuOpen && (
          <div className="page-actions-menu" id={menuId} role="menu">
            <button
              type="button"
              className="page-actions-menu-item"
              role="menuitem"
              onClick={handleCopyLink}
            >
              <Link2 size={14} />
              Copy link
            </button>
            <button
              type="button"
              className="page-actions-menu-item"
              role="menuitem"
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
