"use client";

import type { TocEntry } from "@/lib/editor";
import { useCallback, useEffect, useRef, useState } from "react";

interface DocsTocProps {
  entries: TocEntry[];
}

export function DocsToc({ entries }: DocsTocProps) {
  // Filter to H2 and H3 only for display
  const displayEntries = entries.filter((e) => e.level >= 2 && e.level <= 3);
  const [activeId, setActiveId] = useState<string>(displayEntries[0]?.id ?? "");
  const manuallySelectedIdRef = useRef<string | null>(null);
  const manualSelectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    setActiveId((current) => current || displayEntries[0]?.id || "");
  }, [displayEntries]);

  useEffect(() => {
    if (displayEntries.length === 0) return;

    const observer = new IntersectionObserver(
      (observerEntries) => {
        if (manuallySelectedIdRef.current) return;

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
    return () => {
      if (manualSelectionTimerRef.current) {
        clearTimeout(manualSelectionTimerRef.current);
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
