"use client";

import {
  getDatePresets,
  parseDateParam,
  parseTrafficSource,
} from "@/lib/analytics";
import {
  type DailyVisitorCount,
  type Referral,
  type TopPage,
  fillDailyCounts,
  formatChartDate,
  generateDateRange,
  truncatePath,
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
import { AnalyticsShell } from "./analytics-shell";

// ── Visitors Chart ────────────────────────────────────────────────────────────

function VisitorsChart({ data }: { data: DailyVisitorCount[] }) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
        No visitor data for this date range.
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
            fill="rgba(16,185,129,0.3)"
            radius={[4, 4, 0, 0]}
            name="Visitors"
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="Visitors"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Top Pages Table ───────────────────────────────────────────────────────────

function TopPagesTable({ pages }: { pages: TopPage[] }) {
  if (pages.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center py-8">
        No page data available.
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-white mb-3">Top pages</h3>
      <div className="border border-white/[0.08] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
              <th className="text-left px-4 py-2.5 text-gray-400 font-medium">
                Page
              </th>
              <th className="text-right px-4 py-2.5 text-gray-400 font-medium w-20">
                Views
              </th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr
                key={page.pagePath}
                className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-2.5">
                  <span
                    className="text-gray-300 truncate block max-w-[280px]"
                    title={page.pagePath}
                  >
                    {truncatePath(page.pagePath)}
                  </span>
                </td>
                <td className="text-right px-4 py-2.5 text-gray-400 tabular-nums">
                  {page.views}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Referrals Table ───────────────────────────────────────────────────────────

function ReferralsTable({ referrals }: { referrals: Referral[] }) {
  if (referrals.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center py-8">
        No referral data available.
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-white mb-3">Referrals</h3>
      <div className="border border-white/[0.08] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
              <th className="text-left px-4 py-2.5 text-gray-400 font-medium">
                Source
              </th>
              <th className="text-right px-4 py-2.5 text-gray-400 font-medium w-20">
                Views
              </th>
            </tr>
          </thead>
          <tbody>
            {referrals.map((ref) => (
              <tr
                key={ref.source}
                className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-2.5 text-gray-300">{ref.source}</td>
                <td className="text-right px-4 py-2.5 text-gray-400 tabular-nums">
                  {ref.views}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Visitors Content ──────────────────────────────────────────────────────────

function VisitorsContent() {
  const searchParams = useSearchParams();
  const trafficSource = parseTrafficSource(searchParams.get("trafficSource"));

  const defaultPreset = getDatePresets()[2]; // Last 7 days
  const defaultRange = defaultPreset.getRange();
  const dateFrom =
    parseDateParam(searchParams.get("from")) ?? defaultRange.from;
  const dateTo = parseDateParam(searchParams.get("to")) ?? defaultRange.to;

  const [projectId, setProjectId] = useState<string | null>(null);
  const [dailyCounts, setDailyCounts] = useState<DailyVisitorCount[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [totalVisitors, setTotalVisitors] = useState(0);
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
      `/api/analytics/visitors?projectId=${projectId}&from=${fromStr}&to=${toStr}`,
    );

    if (res.ok) {
      const data = await res.json();
      const dateRange = generateDateRange(dateFrom, dateTo);
      setDailyCounts(fillDailyCounts(data.dailyCounts ?? [], dateRange));
      setTopPages(data.topPages ?? []);
      setReferrals(data.referrals ?? []);
      setTotalVisitors(data.totalVisitors ?? 0);
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

  // Agent mode shows empty state
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
            aria-label="No visitors"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <p className="text-gray-400 text-sm font-medium mb-1">
          No visitor activity
        </p>
        <p className="text-gray-500 text-xs">
          When AI agents visit your docs, activity will show up here.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-white/[0.04] rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-48 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="h-48 bg-white/[0.04] rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-semibold text-white">Visitors Over Time</h2>
        <span className="text-sm text-gray-400">
          {totalVisitors.toLocaleString()} total
        </span>
      </div>

      {/* Chart */}
      <VisitorsChart data={filledCounts} />

      {/* Tables side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TopPagesTable pages={topPages} />
        <ReferralsTable referrals={referrals} />
      </div>
    </div>
  );
}

// ── Page Export ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-8 py-6">
          <div className="h-8 w-32 bg-white/[0.06] rounded animate-pulse" />
        </div>
      }
    >
      <AnalyticsShell>
        <VisitorsContent />
      </AnalyticsShell>
    </Suspense>
  );
}
