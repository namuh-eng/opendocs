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
      <div className="px-4 py-8 text-center text-sm text-gray-600">
        No headings found
      </div>
    );
  }

  return (
    <nav className="px-3 py-3" aria-label="Table of contents">
      <h4 className="text-[10px] font-medium text-gray-600 uppercase tracking-wider mb-2 px-1">
        On this page
      </h4>
      <ul className="space-y-0.5">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className={clsx(
                "block text-xs py-1 rounded transition-colors",
                entry.level === 1 && "pl-1",
                entry.level === 2 && "pl-3",
                entry.level === 3 && "pl-5",
                entry.level >= 4 && "pl-7",
                activeId === entry.id
                  ? "text-emerald-400"
                  : "text-gray-500 hover:text-gray-300",
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
