"use client";

import { clsx } from "clsx";
import { Check, FileText, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Suggestion } from "@/lib/collaboration";
import { formatCommentDate, parseSuggestionDiff } from "@/lib/collaboration";

interface SuggestionsPanelProps {
  pageId: string | null;
  onClose: () => void;
  onAccept?: (suggestion: Suggestion) => void;
}

export function SuggestionsPanel({
  pageId,
  onClose,
  onAccept,
}: SuggestionsPanelProps) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const fetchSuggestions = useCallback(async () => {
    if (!pageId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pages/${pageId}/suggestions`);
      const data = await res.json();
      if (data.suggestions) {
        setItems(data.suggestions);
      }
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const filtered = items.filter((s) => {
    if (filter === "pending") return s.status === "pending";
    return true;
  });

  async function handleAction(
    suggestionId: string,
    status: "accepted" | "rejected",
  ) {
    if (!pageId) return;
    const res = await fetch(`/api/pages/${pageId}/suggestions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestionId, status }),
    });
    if (res.ok) {
      if (status === "accepted") {
        const suggestion = items.find((s) => s.id === suggestionId);
        if (suggestion) onAccept?.(suggestion);
      }
      fetchSuggestions();
    }
  }

  return (
    <div
      className="w-80 border-l border-white/[0.08] bg-[#0f0f0f] flex flex-col shrink-0"
      data-testid="suggestions-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-white">Suggestions</span>
          <span className="text-xs text-gray-500">
            ({items.filter((s) => s.status === "pending").length} pending)
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Close suggestions"
        >
          <X size={14} />
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-1 px-4 py-2 border-b border-white/[0.08]">
        {(["pending", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={clsx(
              "px-2 py-1 text-xs rounded transition-colors capitalize",
              filter === f
                ? "bg-white/[0.08] text-white"
                : "text-gray-500 hover:text-gray-300",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-600">
            Loading suggestions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <FileText size={24} className="mx-auto mb-2 text-gray-700" />
            <p className="text-sm text-gray-500">No suggestions</p>
            <p className="text-xs text-gray-600 mt-1">
              Suggestions let reviewers propose text changes
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((suggestion) => {
              const diff = parseSuggestionDiff(suggestion.diff);
              return (
                <div
                  key={suggestion.id}
                  className="px-4 py-3"
                  data-testid={`suggestion-${suggestion.id}`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">
                      {formatCommentDate(suggestion.createdAt)}
                    </span>
                    <span
                      className={clsx(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        suggestion.status === "pending" &&
                          "bg-[var(--od-gold-soft,#f4ecd2)] text-[var(--od-gold,#c9a649)]",
                        suggestion.status === "accepted" &&
                          "bg-[var(--od-sage-soft)] text-[var(--od-success)]",
                        suggestion.status === "rejected" &&
                          "bg-red-600/20 text-red-400",
                      )}
                    >
                      {suggestion.status}
                    </span>
                  </div>

                  {/* Diff view */}
                  <div className="rounded-md border border-white/[0.06] overflow-hidden text-xs font-mono mb-2">
                    {diff.originalText && (
                      <div className="bg-red-950/30 px-3 py-1.5 text-red-300 border-b border-white/[0.04]">
                        <span className="text-red-500 mr-1">-</span>
                        {diff.originalText}
                      </div>
                    )}
                    <div className="bg-[var(--od-sage-soft)] px-3 py-1.5 text-[var(--od-success)]">
                      <span className="text-[var(--od-success)] mr-1">+</span>
                      {diff.suggestedText}
                    </div>
                  </div>

                  {/* Actions */}
                  {suggestion.status === "pending" && (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAction(suggestion.id, "accepted")}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--od-success)] hover:bg-[var(--od-sage-soft)] rounded transition-colors"
                        data-testid={`accept-suggestion-${suggestion.id}`}
                      >
                        <Check size={12} />
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(suggestion.id, "rejected")}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:bg-red-600/10 rounded transition-colors"
                        data-testid={`reject-suggestion-${suggestion.id}`}
                      >
                        <X size={12} />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
