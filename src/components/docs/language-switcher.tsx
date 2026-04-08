"use client";

import { getLanguageInfo } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface LanguageSwitcherProps {
  currentLocale: string;
  availableLocales: string[];
  subdomain: string;
  pagePath: string;
  defaultLanguage: string;
}

export function LanguageSwitcher({
  currentLocale,
  availableLocales,
  subdomain,
  pagePath,
  defaultLanguage,
}: LanguageSwitcherProps) {
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

  if (availableLocales.length <= 1) return null;

  const currentInfo = getLanguageInfo(currentLocale);

  function handleSelect(locale: string) {
    setOpen(false);
    const base = `/docs/${subdomain}`;
    const url =
      locale === defaultLanguage
        ? pagePath
          ? `${base}/${pagePath}`
          : base
        : pagePath
          ? `${base}/${locale}/${pagePath}`
          : `${base}/${locale}`;
    router.push(url);
  }

  return (
    <div className="lang-switcher" ref={ref} data-testid="language-switcher">
      <button
        type="button"
        className="lang-switcher-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        data-testid="language-switcher-btn"
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
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span className="lang-switcher-label">
          {currentInfo?.code.toUpperCase() ?? currentLocale.toUpperCase()}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
          className={`lang-switcher-chevron ${open ? "lang-switcher-chevron-open" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <nav
          className="lang-switcher-dropdown"
          aria-label="Language selection"
          data-testid="language-switcher-dropdown"
        >
          {availableLocales.map((locale) => {
            const info = getLanguageInfo(locale);
            const isActive = locale === currentLocale;
            return (
              <button
                key={locale}
                type="button"
                aria-current={isActive ? "true" : undefined}
                className={`lang-switcher-option ${isActive ? "lang-switcher-option-active" : ""}`}
                onClick={() => handleSelect(locale)}
                data-testid={`lang-option-${locale}`}
              >
                <span className="lang-switcher-option-code">
                  {locale.toUpperCase()}
                </span>
                <span className="lang-switcher-option-name">
                  {info?.nativeName ?? locale}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
