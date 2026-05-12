"use client";

import type { TocEntry } from "@/lib/editor";
import { clsx } from "clsx";

interface TocPanelProps {
  entries: TocEntry[];
  activeId?: string;
}

export function TocPanel({ entries, activeId }: TocPanelProps) {
  if (entries.length === 0) {
    return (
      <aside
        className="hidden w-60 shrink-0 border-l border-white/[0.08] bg-[#101010] px-5 py-8 text-center text-sm text-gray-600 lg:block"
        aria-label="Table of contents"
      >
        No headings found
      </aside>
    );
  }

  return (
    <nav
      className="hidden w-60 shrink-0 overflow-y-auto border-l border-white/[0.08] bg-[#101010] px-4 py-6 lg:block"
      aria-label="Table of contents"
    >
      <h4 className="text-[10px] font-medium text-gray-600 uppercase tracking-wider mb-2 px-1">
        On this page
      </h4>
      <ul className="space-y-0.5">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              title={entry.text}
              className={clsx(
                "block truncate rounded py-1.5 text-xs leading-5 transition-colors",
                entry.level === 1 && "pl-1",
                entry.level === 2 && "pl-3",
                entry.level === 3 && "pl-5",
                entry.level >= 4 && "pl-7",
                activeId === entry.id
                  ? "text-emerald-400"
                  : "text-gray-500 hover:text-gray-200",
              )}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
