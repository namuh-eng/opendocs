"use client";

import {
  getDatePresets,
  parseDateParam,
  parseTrafficSource,
} from "@/lib/analytics";
import {
  type FeedbackEntry,
  type FeedbackStatus,
  type FeedbackSubTab,
  type RatingsByPage,
  downloadCsv,
  feedbackStatuses,
  feedbackSubTabs,
  feedbackToCsv,
  filterByStatus,
  filterBySubTab,
  formatFeedbackDate,
  ratingsToCsv,
  statusColors,
  statusLabels,
  truncateFeedback,
} from "@/lib/analytics-feedback";
import { Filter, MessageSquareWarning } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AnalyticsShell } from "../analytics-shell";

// ── Ratings by Page Table ───────────────────────────────────────────────────

function RatingsTable({ ratings }: { ratings: RatingsByPage[] }) {
  if (ratings.length === 0) return null;

  return (
    <div data-testid="ratings-table">
      <div className="border border-white/[0.08] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
              <th className="text-left px-4 py-2.5 text-gray-400 font-medium">
                Page
              </th>
              <th className="text-right px-4 py-2.5 text-gray-400 font-medium w-24">
                Helpful
              </th>
              <th className="text-right px-4 py-2.5 text-gray-400 font-medium w-28">
                Not Helpful
              </th>
              <th className="text-right px-4 py-2.5 text-gray-400 font-medium w-20">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {ratings.map((r) => (
              <tr
                key={r.page}
                className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-2.5">
                  <span
                    className="text-gray-300 truncate block max-w-[400px]"
                    title={r.page}
                  >
                    {r.page}
                  </span>
                </td>
                <td className="text-right px-4 py-2.5 text-emerald-400 tabular-nums">
                  {r.helpful}
                </td>
                <td className="text-right px-4 py-2.5 text-red-400 tabular-nums">
                  {r.notHelpful}
                </td>
                <td className="text-right px-4 py-2.5 text-gray-400 tabular-nums">
                  {r.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Feedback Entries Table ───────────────────────────────────────────────────

function FeedbackTable({
  entries,
  selectedIds,
  onToggle,
  onToggleAll,
}: {
  entries: FeedbackEntry[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}) {
  if (entries.length === 0) return null;

  const allSelected =
    entries.length > 0 && entries.every((e) => selectedIds.has(e.id));

  return (
    <div data-testid="feedback-table">
      <div className="border border-white/[0.08] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  className="rounded border-gray-600 bg-transparent"
                  data-testid="select-all-checkbox"
                  aria-label="Select all"
                />
              </th>
              <th className="text-left px-4 py-2.5 text-gray-400 font-medium">
                Feedback
              </th>
              <th className="text-left px-4 py-2.5 text-gray-400 font-medium w-28">
                Status
              </th>
              <th className="text-left px-4 py-2.5 text-gray-400 font-medium w-48">
                Page
              </th>
              <th className="text-right px-4 py-2.5 text-gray-400 font-medium w-28">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
              >
                <td className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(entry.id)}
                    onChange={() => onToggle(entry.id)}
                    className="rounded border-gray-600 bg-transparent"
                    aria-label={`Select feedback ${entry.id}`}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className="text-gray-300 block max-w-[300px]"
                    title={entry.comment || entry.rating}
                  >
                    {truncateFeedback(entry.comment || entry.rating)}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[entry.status]}`}
                    data-testid={`status-badge-${entry.status}`}
                  >
                    {statusLabels[entry.status]}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className="text-gray-400 truncate block max-w-[200px]"
                    title={entry.page}
                  >
                    {entry.page}
                  </span>
                </td>
                <td className="text-right px-4 py-2.5 text-gray-500 text-xs">
                  {formatFeedbackDate(entry.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Filter Dialog ───────────────────────────────────────────────────────────

function FilterDialog({
  open,
  activeStatuses,
  showAbusive,
  onToggleStatus,
  onToggleAbusive,
  onClose,
}: {
  open: boolean;
  activeStatuses: FeedbackStatus[];
  showAbusive: boolean;
  onToggleStatus: (s: FeedbackStatus) => void;
  onToggleAbusive: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="absolute top-full right-0 mt-2 w-64 bg-[#1a1a1a] border border-white/[0.08] rounded-lg shadow-xl z-50 p-4"
      data-testid="filter-dialog"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white">Filters</h4>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 text-xs"
        >
          Close
        </button>
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
          Status
        </p>
        {feedbackStatuses.map((status) => (
          <label
            key={status}
            className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={activeStatuses.includes(status)}
              onChange={() => onToggleStatus(status)}
              className="rounded border-gray-600 bg-transparent"
              data-testid={`filter-status-${status}`}
            />
            {statusLabels[status]}
          </label>
        ))}
      </div>

      <div className="border-t border-white/[0.06] pt-3">
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showAbusive}
            onChange={onToggleAbusive}
            className="rounded border-gray-600 bg-transparent"
            data-testid="filter-show-abusive"
          />
          Show abusive
        </label>
      </div>
    </div>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 text-center"
      data-testid="feedback-empty-state"
    >
      <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
        <MessageSquareWarning size={24} className="text-gray-500" />
      </div>
      <p className="text-gray-400 text-sm font-medium mb-1">No feedback yet</p>
      <p className="text-gray-500 text-xs">
        When users leave feedback, it will show up here
      </p>
    </div>
  );
}

// ── Feedback Content ────────────────────────────────────────────────────────

function FeedbackContent() {
  const searchParams = useSearchParams();
  const trafficSource = parseTrafficSource(searchParams.get("trafficSource"));

  const defaultPreset = getDatePresets()[2]; // Last 7 days
  const defaultRange = defaultPreset.getRange();
  const dateFrom =
    parseDateParam(searchParams.get("from")) ?? defaultRange.from;
  const dateTo = parseDateParam(searchParams.get("to")) ?? defaultRange.to;

  const [projectId, setProjectId] = useState<string | null>(null);
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [ratingsByPage, setRatingsByPage] = useState<RatingsByPage[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeSubTab, setActiveSubTabRaw] =
    useState<FeedbackSubTab>("ratings");
  const [activeStatuses, setActiveStatuses] = useState<FeedbackStatus[]>([]);
  const [showAbusive, setShowAbusive] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch project ID
  useEffect(() => {
    async function fetchProject() {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.projects?.length > 0) {
        setProjectId(data.projects[0].id);
      }
    }
    fetchProject();
  }, []);

  // Fetch analytics data
  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);

    const fromStr = dateFrom.toISOString().split("T")[0];
    const toStr = dateTo.toISOString().split("T")[0];

    const res = await fetch(
      `/api/analytics/feedback?projectId=${projectId}&from=${fromStr}&to=${toStr}`,
    );

    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries ?? []);
      setRatingsByPage(data.ratingsByPage ?? []);
      setTotalCount(data.totalCount ?? 0);
    }
    setLoading(false);
  }, [projectId, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function setActiveSubTab(tab: FeedbackSubTab) {
    setActiveSubTabRaw(tab);
    setSelectedIds(new Set());
  }

  // Filtered entries
  const filteredEntries = useMemo(() => {
    const byTab = filterBySubTab(entries, activeSubTab);
    return filterByStatus(byTab, activeStatuses, showAbusive);
  }, [entries, activeSubTab, activeStatuses, showAbusive]);

  // Toggle status filter
  function handleToggleStatus(status: FeedbackStatus) {
    setActiveStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  }

  // Toggle individual selection
  function handleToggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Toggle all
  function handleToggleAll() {
    if (filteredEntries.every((e) => selectedIds.has(e.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEntries.map((e) => e.id)));
    }
  }

  // CSV export handler
  function handleExportCsv() {
    const fromStr = dateFrom.toISOString().split("T")[0];
    const toStr = dateTo.toISOString().split("T")[0];

    if (activeSubTab === "ratings") {
      const csv = ratingsToCsv(ratingsByPage);
      downloadCsv(csv, `feedback-ratings-${fromStr}-${toStr}.csv`);
    } else {
      const csv = feedbackToCsv(filteredEntries);
      downloadCsv(csv, `feedback-${activeSubTab}-${fromStr}-${toStr}.csv`);
    }
  }

  // Agent mode shows empty state
  if (trafficSource === "agent") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
          <MessageSquareWarning size={24} className="text-gray-500" />
        </div>
        <p className="text-gray-400 text-sm font-medium mb-1">
          No feedback activity
        </p>
        <p className="text-gray-500 text-xs">
          Feedback from agents will appear here when available.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 bg-white/[0.04] rounded animate-pulse" />
          <div className="h-8 w-32 bg-white/[0.04] rounded animate-pulse" />
        </div>
        <div className="h-48 bg-white/[0.04] rounded-lg animate-pulse" />
      </div>
    );
  }

  const hasData = totalCount > 0;

  return (
    <div className="space-y-6">
      {/* Sub-tabs row + Filters + Export */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1" data-testid="feedback-sub-tabs">
          {feedbackSubTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSubTab(tab.key)}
              data-testid={`sub-tab-${tab.key}`}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeSubTab === tab.key
                  ? "bg-white/[0.1] text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Filters button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen(!filterOpen)}
              data-testid="filters-button"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                activeStatuses.length > 0 || showAbusive
                  ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                  : "text-gray-300 border-white/[0.08] bg-[#1a1a1a] hover:bg-white/[0.06]"
              }`}
            >
              <Filter size={14} />
              Filters
              {activeStatuses.length > 0 && (
                <span className="ml-1 text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                  {activeStatuses.length}
                </span>
              )}
            </button>

            <FilterDialog
              open={filterOpen}
              activeStatuses={activeStatuses}
              showAbusive={showAbusive}
              onToggleStatus={handleToggleStatus}
              onToggleAbusive={() => setShowAbusive(!showAbusive)}
              onClose={() => setFilterOpen(false)}
            />
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            data-testid="export-csv-button"
            disabled={!hasData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-300 bg-[#1a1a1a] border border-white/[0.08] rounded-lg hover:bg-white/[0.06] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-2 bg-white/[0.04] rounded-lg"
          data-testid="bulk-actions-bar"
        >
          <span className="text-sm text-gray-400">
            {selectedIds.size} selected
          </span>
        </div>
      )}

      {/* Summary */}
      {hasData && (
        <div className="flex items-baseline gap-3">
          <span className="text-sm text-gray-400">
            {totalCount.toLocaleString()} feedback item
            {totalCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Content */}
      {!hasData ? (
        <EmptyState />
      ) : activeSubTab === "ratings" ? (
        <RatingsTable ratings={ratingsByPage} />
      ) : filteredEntries.length === 0 ? (
        <EmptyState />
      ) : (
        <FeedbackTable
          entries={filteredEntries}
          selectedIds={selectedIds}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll}
        />
      )}
    </div>
  );
}

// ── Page Export ──────────────────────────────────────────────────────────────

export default function AnalyticsFeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="px-8 py-6">
          <div className="h-8 w-32 bg-white/[0.06] rounded animate-pulse" />
        </div>
      }
    >
      <AnalyticsShell>
        <FeedbackContent />
      </AnalyticsShell>
    </Suspense>
  );
}
