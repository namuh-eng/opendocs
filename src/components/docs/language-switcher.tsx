"use client";

import { getLanguageInfo } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

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
        ref={triggerRef}
        type="button"
        className="lang-switcher-btn"
        onClick={toggleDropdown}
        aria-label={`Select docs language, current language ${currentInfo?.name ?? currentLocale}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? dropdownId : undefined}
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
          id={dropdownId}
          className="lang-switcher-dropdown"
          aria-label="Language selection"
          data-testid="language-switcher-dropdown"
        >
          {availableLocales.map((locale, index) => {
            const info = getLanguageInfo(locale);
            const isActive = locale === currentLocale;
            return (
              <button
                key={locale}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                aria-label={`Switch to ${info?.name ?? locale}`}
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
