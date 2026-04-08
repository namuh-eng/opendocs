"use client";

import {
  getDatePresets,
  parseDateParam,
  parseTrafficSource,
} from "@/lib/analytics";
import type { SearchQuery } from "@/lib/analytics-searches";
import {
  type DailyVisitorCount,
  fillDailyCounts,
  formatChartDate,
  generateDateRange,
} from "@/lib/analytics-visitors";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnalyticsShell } from "../analytics-shell";

// ── Search Volume Chart ──────────────────────────────────────────────────────

function SearchVolumeChart({ data }: { data: DailyVisitorCount[] }) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
        No search data for this date range.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: d.date,
    label: formatChartDate(d.date),
    count: d.count,
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              fontSize: "13px",
              color: "#fff",
            }}
            labelStyle={{ color: "#9ca3af" }}
          />
          <Bar
            dataKey="count"
            fill="rgba(99,102,241,0.3)"
            radius={[4, 4, 0, 0]}
            name="Searches"
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            name="Searches"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Top Searches Table ───────────────────────────────────────────────────────

function TopSearchesTable({ searches }: { searches: SearchQuery[] }) {
  if (searches.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center py-8">
        No search data available.
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-white mb-3">Top searches</h3>
      <div className="border border-white/[0.08] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
              <th className="text-left px-4 py-2.5 text-gray-400 font-medium">
                Query
              </th>
              <th className="text-right px-4 py-2.5 text-gray-400 font-medium w-20">
                Count
              </th>
            </tr>
          </thead>
          <tbody>
            {searches.map((search) => (
              <tr
                key={search.query}
                className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-2.5">
                  <span
                    className="text-gray-300 truncate block max-w-[400px]"
                    title={search.query}
                  >
                    {search.query}
                  </span>
                </td>
                <td className="text-right px-4 py-2.5 text-gray-400 tabular-nums">
                  {search.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────

function SearchesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-500"
          role="img"
          aria-label="No search activity"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <p className="text-gray-400 text-sm font-medium mb-1">
        No search activity
      </p>
      <p className="text-gray-500 text-xs">
        When users search your docs, results will show up here
      </p>
    </div>
  );
}

// ── Searches Content ─────────────────────────────────────────────────────────

function SearchesContent() {
  const searchParams = useSearchParams();
  const trafficSource = parseTrafficSource(searchParams.get("trafficSource"));

  const defaultPreset = getDatePresets()[2]; // Last 7 days
  const defaultRange = defaultPreset.getRange();
  const dateFrom =
    parseDateParam(searchParams.get("from")) ?? defaultRange.from;
  const dateTo = parseDateParam(searchParams.get("to")) ?? defaultRange.to;

  const [projectId, setProjectId] = useState<string | null>(null);
  const [dailyCounts, setDailyCounts] = useState<DailyVisitorCount[]>([]);
  const [topSearches, setTopSearches] = useState<SearchQuery[]>([]);
  const [totalSearches, setTotalSearches] = useState(0);
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
      `/api/analytics/searches?projectId=${projectId}&from=${fromStr}&to=${toStr}`,
    );

    if (res.ok) {
      const data = await res.json();
      const dateRange = generateDateRange(dateFrom, dateTo);
      setDailyCounts(fillDailyCounts(data.dailyCounts ?? [], dateRange));
      setTopSearches(data.topSearches ?? []);
      setTotalSearches(data.totalSearches ?? 0);
    }
    setLoading(false);
  }, [projectId, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Date range for filling zeroes
  const dateRange = useMemo(
    () => generateDateRange(dateFrom, dateTo),
    [dateFrom, dateTo],
  );

  const filledCounts = useMemo(
    () => fillDailyCounts(dailyCounts, dateRange),
    [dailyCounts, dateRange],
  );

  // Agent mode shows empty state — searches are human activity
  if (trafficSource === "agent") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-500"
            role="img"
            aria-label="No search activity"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <p className="text-gray-400 text-sm font-medium mb-1">
          No search activity
        </p>
        <p className="text-gray-500 text-xs">
          Agent search activity is tracked under MCP Searches.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-white/[0.04] rounded-lg animate-pulse" />
        <div className="h-48 bg-white/[0.04] rounded-lg animate-pulse" />
      </div>
    );
  }

  // Empty state when no data
  if (totalSearches === 0) {
    return <SearchesEmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-semibold text-white">
          Search Volume Over Time
        </h2>
        <span className="text-sm text-gray-400">
          {totalSearches.toLocaleString()} total
        </span>
      </div>

      {/* Chart */}
      <SearchVolumeChart data={filledCounts} />

      {/* Top searches table */}
      <TopSearchesTable searches={topSearches} />
    </div>
  );
}

// ── Page Export ───────────────────────────────────────────────────────────────

export default function AnalyticsSearchesPage() {
  return (
    <Suspense
      fallback={
        <div className="px-8 py-6">
          <div className="h-8 w-32 bg-white/[0.06] rounded animate-pulse" />
        </div>
      }
    >
      <AnalyticsShell>
        <SearchesContent />
      </AnalyticsShell>
    </Suspense>
  );
}
