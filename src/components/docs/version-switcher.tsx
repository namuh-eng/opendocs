"use client";

import {
  type VersionsConfig,
  buildVersionedPath,
  getDefaultVersion,
  getVersionByTag,
} from "@/lib/versions";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  const router = useRouter();

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

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
        type="button"
        className="version-switcher-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
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
          className="version-switcher-dropdown"
          aria-label="Version selection"
          data-testid="version-switcher-dropdown"
        >
          {availableVersions.map((tag) => {
            const info = getVersionByTag(versionsConfig, tag);
            const isActive = tag === currentVersion;
            const isDefault = tag === defaultTag;
            return (
              <button
                key={tag}
                type="button"
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
