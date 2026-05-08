"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchablePage {
  path: string;
  title: string;
}

interface SearchResultItem {
  path: string;
  title: string;
  description: string | null;
  snippet: string;
  breadcrumb: string[];
}

interface SearchResultGroup {
  section: string;
  results: SearchResultItem[];
}

// ── Exported helpers (tested in unit tests) ───────────────────────────────────

/** Returns true if the shortcut should open the search modal */
export function handleSearchShortcut(event: KeyboardEvent): boolean {
  return event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
}

/** Filter pages by search query (case-insensitive, matches title or path) — client-side fallback */
export function filterPages(
  pages: SearchablePage[],
  query: string,
): SearchablePage[] {
  if (!query.trim()) return pages;
  const q = query.toLowerCase();
  return pages.filter(
    (p) =>
      p.title.toLowerCase().includes(q) || p.path.toLowerCase().includes(q),
  );
}

// ── Recent searches ───────────────────────────────────────────────────────────

const RECENT_KEY = "docs-recent-searches";
const MAX_RECENT = 5;
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

type DocsSearchWindow = Window & { __docsSearchRequested?: boolean };

function consumePendingSearchRequest(): boolean {
  if (typeof window === "undefined") return false;
  const docsWindow = window as DocsSearchWindow;
  if (!docsWindow.__docsSearchRequested) return false;
  docsWindow.__docsSearchRequested = false;
  return true;
}

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string): void {
  if (typeof window === "undefined") return;
  try {
    const recent = getRecentSearches().filter((q) => q !== query);
    recent.unshift(query);
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT)),
    );
  } catch {
    // localStorage unavailable
  }
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => element.tabIndex >= 0)
    .filter((element) => element.getAttribute("aria-hidden") !== "true");
}

// ── Group results by first breadcrumb segment ─────────────────────────────────

function groupResults(results: SearchResultItem[]): SearchResultGroup[] {
  if (results.length === 0) return [];
  const groups = new Map<string, SearchResultItem[]>();
  for (const r of results) {
    const section = r.breadcrumb[0] || "Pages";
    const existing = groups.get(section);
    if (existing) {
      existing.push(r);
    } else {
      groups.set(section, [r]);
    }
  }
  return Array.from(groups.entries()).map(([section, sectionResults]) => ({
    section,
    results: sectionResults,
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SearchModalProps {
  pages: SearchablePage[];
  subdomain: string;
}

export function SearchModal({ pages, subdomain }: SearchModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const listboxId = useId();
  const optionIdForIndex = useCallback(
    (index: number) => `${listboxId}-option-${index}`,
    [listboxId],
  );

  const open = useCallback(() => {
    const activeElement = document.activeElement;
    restoreFocusRef.current =
      activeElement instanceof HTMLElement ? activeElement : null;
    setIsOpen(true);
    setQuery("");
    setResults([]);
    setSelectedIdx(0);
    setRecentSearches(getRecentSearches());
  }, []);

  const close = useCallback(() => {
    const restoreFocusTarget = restoreFocusRef.current;
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setSelectedIdx(0);
    restoreFocusRef.current = null;

    if (restoreFocusTarget?.isConnected) {
      setTimeout(() => {
        restoreFocusTarget.focus();
      }, 0);
    }
  }, []);

  const trapTabFocus = useCallback((event: KeyboardEvent) => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableElements = getFocusableElements(dialog);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (!firstFocusable || !lastFocusable) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const activeElement = document.activeElement;
    if (
      !(activeElement instanceof HTMLElement) ||
      !dialog.contains(activeElement)
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
  }, []);

  // Fetch results from API with debounce
  const fetchResults = useCallback(
    (q: string) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      if (!q.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const controller = new AbortController();
      abortRef.current = controller;

      fetch(
        `/api/docs/${subdomain}/search?q=${encodeURIComponent(q)}&limit=20`,
        { signal: controller.signal },
      )
        .then((res) => {
          if (!res.ok) throw new Error("Search failed");
          return res.json();
        })
        .then((data: SearchResultItem[]) => {
          setResults(data);
          setSelectedIdx(0);
          setLoading(false);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          // Fallback to client-side search
          const filtered = filterPages(pages, q);
          setResults(
            filtered.map((p) => ({
              path: p.path,
              title: p.title,
              description: null,
              snippet: "",
              breadcrumb: p.path
                .split("/")
                .filter(Boolean)
                .map((s) =>
                  s
                    .split("-")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" "),
                ),
            })),
          );
          setSelectedIdx(0);
          setLoading(false);
        });
    },
    [subdomain, pages],
  );

  // Debounced query change handler
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (!isOpen) return;

    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, isOpen, fetchResults]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (handleSearchShortcut(e)) {
        e.preventDefault();
        open();
      }
      if (e.key === "Escape" && isOpen) {
        close();
      }
      if (e.key === "Tab" && isOpen) {
        trapTabFocus(e);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close, open, trapTabFocus]);

  // Auto-focus input
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Expose open via custom event and consume any shortcut pressed before hydration.
  useEffect(() => {
    if (consumePendingSearchRequest()) {
      open();
    }

    function handleOpenSearch() {
      consumePendingSearchRequest();
      open();
    }
    document.addEventListener("open-search", handleOpenSearch);
    return () => document.removeEventListener("open-search", handleOpenSearch);
  }, [open]);

  // Keyboard navigation within results
  const hasQuery = query.trim().length > 0;
  const showRecent = !hasQuery && recentSearches.length > 0;
  const defaultPages = !hasQuery && !showRecent ? pages.slice(0, 10) : [];
  const navigableCount = hasQuery
    ? results.length
    : showRecent
      ? recentSearches.length
      : defaultPages.length;
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (navigableCount > 0) {
        setSelectedIdx((prev) => Math.min(prev + 1, navigableCount - 1));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      const resultTarget = hasQuery ? results[selectedIdx] : undefined;
      const recentTarget = showRecent ? recentSearches[selectedIdx] : undefined;
      const defaultTarget =
        !hasQuery && !showRecent ? defaultPages[selectedIdx] : undefined;
      const target = resultTarget || defaultTarget;

      if (recentTarget) {
        e.preventDefault();
        setQuery(recentTarget);
        fetchResults(recentTarget);
        return;
      }

      if (!target) return;

      e.preventDefault();
      if (hasQuery) {
        saveRecentSearch(query);
      }
      window.location.href = `/docs/${subdomain}/${target.path}`;
    }
  };

  if (!isOpen) return null;

  const grouped = groupResults(results);
  const activeDescendant =
    navigableCount > 0 ? optionIdForIndex(selectedIdx) : undefined;
  const listboxProps = {
    role: "listbox",
    tabIndex: -1,
    "aria-label": "Search results",
  } as const;
  const optionProps = (selected: boolean) =>
    ({
      role: "option",
      "aria-selected": selected,
    }) as const;

  return (
    <div
      data-testid="search-modal"
      className="search-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <dialog
        ref={dialogRef}
        className="search-modal"
        open
        aria-label="Search docs"
        onKeyDown={handleModalKeyDown}
      >
        <div className="search-modal-header">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            data-testid="search-input"
            type="text"
            role="combobox"
            aria-label="Search documentation"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={activeDescendant}
            className="search-modal-input"
            placeholder="Search documentation..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="search-modal-esc">Esc</kbd>
        </div>

        <div
          id={listboxId}
          className="search-modal-results"
          data-testid="search-results"
          {...listboxProps}
        >
          {/* Loading indicator */}
          {loading && hasQuery && (
            <div className="search-modal-loading">Searching...</div>
          )}

          {/* Recent searches when empty */}
          {showRecent && (
            <div data-testid="recent-searches" className="search-modal-section">
              <div className="search-modal-section-title">Recent searches</div>
              {recentSearches.map((q, index) => {
                const selected = index === selectedIdx;
                return (
                  <button
                    key={q}
                    id={optionIdForIndex(index)}
                    type="button"
                    {...optionProps(selected)}
                    className={`search-modal-result search-modal-recent ${selected ? "search-modal-result-active" : ""}`}
                    onClick={() => {
                      setQuery(q);
                      fetchResults(q);
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{q}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* No results */}
          {!loading && hasQuery && results.length === 0 && (
            <div className="search-modal-empty">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Grouped results */}
          {!loading &&
            grouped.map((group) => (
              <div key={group.section} className="search-modal-section">
                <div className="search-modal-section-title">
                  {group.section}
                </div>
                {group.results.map((result) => {
                  const flatIdx = results.indexOf(result);
                  return (
                    <Link
                      key={result.path}
                      id={optionIdForIndex(flatIdx)}
                      href={`/docs/${subdomain}/${result.path}`}
                      {...optionProps(flatIdx === selectedIdx)}
                      className={`search-modal-result ${flatIdx === selectedIdx ? "search-modal-result-active" : ""}`}
                      onClick={() => {
                        saveRecentSearch(query);
                        close();
                      }}
                    >
                      <div className="search-modal-result-content">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <div className="search-modal-result-text">
                          <span className="search-modal-result-title">
                            {result.title}
                          </span>
                          {result.snippet && (
                            <span className="search-modal-result-snippet">
                              {result.snippet}
                            </span>
                          )}
                          <span className="search-modal-result-path">
                            {result.breadcrumb.join(" › ")}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}

          {/* Default: show all pages when no query */}
          {!hasQuery &&
            !showRecent &&
            defaultPages.map((page, index) => {
              const selected = index === selectedIdx;
              return (
                <Link
                  key={page.path}
                  id={optionIdForIndex(index)}
                  href={`/docs/${subdomain}/${page.path}`}
                  {...optionProps(selected)}
                  className={`search-modal-result ${selected ? "search-modal-result-active" : ""}`}
                  onClick={close}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span>{page.title}</span>
                  <span className="search-modal-result-path">{page.path}</span>
                </Link>
              );
            })}
        </div>

        {/* Footer with keyboard hints */}
        <div className="search-modal-footer">
          <span className="search-modal-hint">
            <kbd>&uarr;</kbd>
            <kbd>&darr;</kbd> Navigate
          </span>
          <span className="search-modal-hint">
            <kbd>&crarr;</kbd> Open
          </span>
          <span className="search-modal-hint">
            <kbd>Esc</kbd> Close
          </span>
        </div>
      </dialog>
    </div>
  );
}
