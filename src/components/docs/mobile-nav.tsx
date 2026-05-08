"use client";

import type { DocsNavEntry } from "@/lib/mdx-renderer";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DocsSidebar } from "./docs-sidebar";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => element.tabIndex >= 0)
    .filter((element) => element.getAttribute("aria-hidden") !== "true");
}

export function MobileMenuButton() {
  return (
    <button
      type="button"
      data-testid="mobile-menu-btn"
      className="docs-mobile-menu-btn"
      onClick={() => {
        document.dispatchEvent(new CustomEvent("toggle-mobile-sidebar"));
      }}
      aria-label="Open navigation menu"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <title>Menu</title>
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
}

interface MobileSidebarProps {
  nav: DocsNavEntry[];
  activePath: string;
  subdomain: string;
  projectName: string;
}

export function MobileSidebar({
  nav,
  activePath,
  subdomain,
  projectName,
}: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const overlayRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    function handleToggle() {
      setIsOpen((prev) => !prev);
    }
    document.addEventListener("toggle-mobile-sidebar", handleToggle);
    return () =>
      document.removeEventListener("toggle-mobile-sidebar", handleToggle);
  }, []);

  // Close on navigation (activePath change)
  // biome-ignore lint/correctness/useExhaustiveDependencies: activePath change should close sidebar
  useEffect(() => {
    setIsOpen(false);
  }, [activePath]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    overlayRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
      if (event.key === "Tab" && overlayRef.current) {
        const focusableElements = getFocusableElements(overlayRef.current);
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (!firstFocusable || !lastFocusable) {
          event.preventDefault();
          overlayRef.current.focus();
          return;
        }

        const activeElement = document.activeElement;
        if (
          !(activeElement instanceof HTMLElement) ||
          !overlayRef.current.contains(activeElement)
        ) {
          event.preventDefault();
          firstFocusable.focus();
          return;
        }

        if (event.shiftKey && activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
          return;
        }

        if (!event.shiftKey && activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={overlayRef}
      data-testid="mobile-sidebar"
      open
      aria-modal="true"
      aria-label={`${projectName} navigation`}
      className="mobile-sidebar-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setIsOpen(false);
      }}
      onCancel={(e) => {
        e.preventDefault();
        setIsOpen(false);
      }}
    >
      <div className="mobile-sidebar-panel">
        <div className="mobile-sidebar-header">
          <span className="mobile-sidebar-title">{projectName}</span>
          <button
            type="button"
            className="mobile-sidebar-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <DocsSidebar
          nav={nav}
          activePath={activePath}
          subdomain={subdomain}
          projectName={projectName}
        />
      </div>
    </dialog>
  );
}
