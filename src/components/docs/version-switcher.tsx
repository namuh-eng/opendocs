"use client";

import {
  type VersionsConfig,
  buildVersionedPath,
  getDefaultVersion,
  getVersionByTag,
} from "@/lib/versions";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

interface VersionSwitcherProps {
  currentVersion: string;
  availableVersions: string[];
  versionsConfig: VersionsConfig;
  subdomain: string;
  pagePath: string;
  locale?: string;
  defaultLanguage?: string;
}

export function VersionSwitcher({
  currentVersion,
  availableVersions,
  versionsConfig,
  subdomain,
  pagePath,
  locale,
  defaultLanguage,
}: VersionSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dropdownId = useId();
  const router = useRouter();

  const closeDropdown = useCallback(
    ({ restoreFocus }: { restoreFocus: boolean }) => {
      setOpen(false);
      if (restoreFocus) {
        triggerRef.current?.focus();
      }
    },
    [],
  );

  const toggleDropdown = useCallback(() => {
    triggerRef.current?.focus();
    setOpen((value) => !value);
  }, []);

  // Close on click outside or Escape
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeDropdown({ restoreFocus: false });
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDropdown({ restoreFocus: true });
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const options = optionRefs.current.filter(Boolean);
        if (options.length === 0) return;

        e.preventDefault();
        const activeIndex = options.findIndex(
          (option) => option === document.activeElement,
        );
        const nextIndex =
          e.key === "ArrowDown"
            ? activeIndex === -1
              ? 0
              : (activeIndex + 1) % options.length
            : activeIndex === -1
              ? options.length - 1
              : (activeIndex - 1 + options.length) % options.length;

        options[nextIndex]?.focus();
      }
    }

    document.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [closeDropdown, open]);

  if (availableVersions.length <= 1) return null;

  const defaultTag = getDefaultVersion(versionsConfig)?.tag ?? "";
  const currentInfo = getVersionByTag(versionsConfig, currentVersion);

  function handleSelect(version: string) {
    setOpen(false);
    const url = buildVersionedPath(
      subdomain,
      pagePath,
      version,
      defaultTag,
      locale,
      defaultLanguage,
    );
    router.push(url);
  }

  return (
    <div className="version-switcher" ref={ref} data-testid="version-switcher">
      <button
        ref={triggerRef}
        type="button"
        className="version-switcher-btn"
        onClick={toggleDropdown}
        aria-label={`Select docs version, current version ${currentInfo?.name ?? currentVersion}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? dropdownId : undefined}
        data-testid="version-switcher-btn"
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
          <path d="M12 20h9" />
          <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
        </svg>
        <span className="version-switcher-label">
          {currentInfo?.name ?? currentVersion}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
          className={`version-switcher-chevron ${open ? "version-switcher-chevron-open" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <nav
          id={dropdownId}
          className="version-switcher-dropdown"
          aria-label="Version selection"
          data-testid="version-switcher-dropdown"
        >
          {availableVersions.map((tag, index) => {
            const info = getVersionByTag(versionsConfig, tag);
            const isActive = tag === currentVersion;
            const isDefault = tag === defaultTag;
            return (
              <button
                key={tag}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                aria-label={`Switch to docs version ${info?.name ?? tag}${isDefault ? " (default)" : ""}`}
                aria-current={isActive ? "true" : undefined}
                className={`version-switcher-option ${isActive ? "version-switcher-option-active" : ""}`}
                onClick={() => handleSelect(tag)}
                data-testid={`version-option-${tag}`}
              >
                <span className="version-switcher-option-name">
                  {info?.name ?? tag}
                </span>
                {isDefault && (
                  <span className="version-switcher-default-badge">
                    Default
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
