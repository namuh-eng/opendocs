"use client";

import type { TocEntry } from "@/lib/editor";
import { useCallback, useEffect, useRef, useState } from "react";

interface DocsTocProps {
  entries: TocEntry[];
}

export function DocsToc({ entries }: DocsTocProps) {
  // Filter to H2 and H3 only for display
  const displayEntries = entries.filter((e) => e.level >= 2 && e.level <= 3);
  const [activeId, setActiveId] = useState<string>("");
  const manuallySelectedIdRef = useRef<string | null>(null);
  const suppressObserverRef = useRef(false);
  const entryIdsRef = useRef<Set<string>>(new Set());
  const manualSelectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const observerSuppressionTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    entryIdsRef.current = new Set(displayEntries.map((entry) => entry.id));
    setActiveId((current) =>
      current && entryIdsRef.current.has(current) ? current : "",
    );
  }, [displayEntries]);

  useEffect(() => {
    if (displayEntries.length === 0) return;

    const observer = new IntersectionObserver(
      (observerEntries) => {
        if (manuallySelectedIdRef.current || suppressObserverRef.current)
          return;

        for (const entry of observerEntries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0% -80% 0%" },
    );

    for (const tocEntry of displayEntries) {
      const element = document.getElementById(tocEntry.id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [displayEntries]);

  useEffect(() => {
    const suppressExternalHashNavigation = () => {
      if (manuallySelectedIdRef.current) return;
      if (observerSuppressionTimerRef.current) {
        clearTimeout(observerSuppressionTimerRef.current);
      }
      suppressObserverRef.current = true;
      setActiveId("");
      observerSuppressionTimerRef.current = setTimeout(() => {
        suppressObserverRef.current = false;
        observerSuppressionTimerRef.current = null;
      }, 1500);
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!anchor || anchor.closest(".docs-toc")) return;
      const href = anchor.getAttribute("href") || "";
      const hash = href.startsWith("#")
        ? href.slice(1)
        : new URL(anchor.href).hash.slice(1);
      if (hash && entryIdsRef.current.has(hash)) {
        suppressExternalHashNavigation();
      }
    };

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && entryIdsRef.current.has(hash)) {
        suppressExternalHashNavigation();
      }
    };

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("hashchange", handleHashChange);
      if (manualSelectionTimerRef.current) {
        clearTimeout(manualSelectionTimerRef.current);
      }
      if (observerSuppressionTimerRef.current) {
        clearTimeout(observerSuppressionTimerRef.current);
      }
    };
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      const target = document.getElementById(id);
      if (target) {
        if (manualSelectionTimerRef.current) {
          clearTimeout(manualSelectionTimerRef.current);
        }
        manuallySelectedIdRef.current = id;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        // Update URL hash without jumping
        window.history.pushState(null, "", `#${id}`);
        setActiveId(id);
        manualSelectionTimerRef.current = setTimeout(() => {
          manuallySelectedIdRef.current = null;
          manualSelectionTimerRef.current = null;
        }, 1500);
      }
    },
    [],
  );

  if (displayEntries.length === 0) return null;

  return (
    <aside className="docs-toc" data-testid="docs-toc">
      <h4 className="docs-toc-title">On this page</h4>
      <nav>
        {displayEntries.map((entry) => (
          <a
            key={entry.id}
            href={`#${entry.id}`}
            className={`docs-toc-link ${activeId === entry.id ? "active" : ""}`}
            style={{ paddingLeft: `${(entry.level - 2) * 12 + 8}px` }}
            onClick={(e) => handleClick(e, entry.id)}
            data-testid={`toc-link-${entry.id}`}
          >
            {entry.text}
          </a>
        ))}
      </nav>
    </aside>
  );
}
