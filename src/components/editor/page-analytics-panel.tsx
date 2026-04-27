"use client";

import { useActiveProject } from "@/hooks/use-active-project";
import {
  fillDailyCounts,
  formatChartDate,
  generateDateRange,
} from "@/lib/analytics-visitors";
import {
  AlertCircle,
  BarChart3,
  ChevronRight,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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

interface PageAnalyticsProps {
  pagePath: string;
}

interface DailyCount {
  date: string;
  count: number;
}

interface FeedbackEntry {
  id?: string;
  createdAt?: string;
  rating: "helpful" | "not_helpful";
  comment?: string | null;
}

export function PageAnalyticsPanel({ pagePath }: PageAnalyticsProps) {
  const { project } = useActiveProject<{ id: string }>();
  const projectId = project?.id ?? null;

  const [data, setData] = useState<{
    dailyCounts: DailyCount[];
    totalViews: number;
    feedback: { helpful: number; notHelpful: number; entries: FeedbackEntry[] };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);

    // Default to last 30 days for the side panel
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);

    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];

    try {
      const [viewsRes, feedbackRes] = await Promise.all([
        fetch(
          `/api/analytics/views?projectId=${projectId}&pagePath=${encodeURIComponent(pagePath)}&from=${fromStr}&to=${toStr}`,
        ),
        fetch(
          `/api/analytics/feedback?projectId=${projectId}&pagePath=${encodeURIComponent(pagePath)}&from=${fromStr}&to=${toStr}`,
        ),
      ]);

      if (viewsRes.ok && feedbackRes.ok) {
        const viewsData = await viewsRes.json();
        const feedbackData = await feedbackRes.json();

        const dateRange = generateDateRange(from, to);

        setData({
          dailyCounts: fillDailyCounts(viewsData.dailyCounts ?? [], dateRange),
          totalViews: viewsData.totalViews ?? 0,
          feedback: {
            helpful:
              (feedbackData.entries as FeedbackEntry[] | undefined)?.filter(
                (e) => e.rating === "helpful",
              ).length ?? 0,
            notHelpful:
              (feedbackData.entries as FeedbackEntry[] | undefined)?.filter(
                (e) => e.rating === "not_helpful",
              ).length ?? 0,
            entries:
              (feedbackData.entries as FeedbackEntry[] | undefined)?.slice(
                0,
                5,
              ) ?? [],
          },
        });
      }
    } catch (err) {
      console.error("Failed to fetch page analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, pagePath]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="w-80 border-l border-white/[0.08] bg-[#0f0f0f] p-4 flex flex-col gap-4 animate-pulse">
        <div className="h-6 w-32 bg-white/[0.04] rounded" />
        <div className="h-32 bg-white/[0.04] rounded" />
        <div className="h-24 bg-white/[0.04] rounded" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="w-80 border-l border-white/[0.08] bg-[#0f0f0f] flex flex-col shrink-0 overflow-y-auto">
      <div className="px-4 py-3 border-b border-white/[0.08] flex items-center gap-2">
        <BarChart3 size={16} className="text-emerald-400" />
        <h3 className="text-sm font-medium text-white">Page Analytics</h3>
      </div>

      <div className="p-4 space-y-6">
        {/* Views Summary */}
        <div>
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">
            Views (Last 30 days)
          </p>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-2xl font-semibold text-white">
              {data.totalViews.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500">total views</span>
          </div>

          <div className="h-32 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.dailyCounts}>
                <Bar
                  dataKey="count"
                  fill="rgba(16,185,129,0.2)"
                  radius={[2, 2, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "6px",
                    fontSize: "11px",
                  }}
                  labelStyle={{ display: "none" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feedback Summary */}
        <div>
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-3">
            Feedback
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2 text-center">
              <ThumbsUp size={14} className="text-emerald-500 mx-auto mb-1" />
              <span className="text-sm font-medium text-white">
                {data.feedback.helpful}
              </span>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2 text-center">
              <ThumbsDown size={14} className="text-amber-500 mx-auto mb-1" />
              <span className="text-sm font-medium text-white">
                {data.feedback.notHelpful}
              </span>
            </div>
          </div>

          {data.feedback.entries.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-gray-500 font-medium">
                Recent comments
              </p>
              {data.feedback.entries.map((entry) => (
                <div
                  key={
                    entry.id ??
                    `${entry.createdAt ?? "unknown"}:${entry.rating}:${entry.comment ?? ""}`
                  }
                  className="text-xs text-gray-400 bg-white/[0.02] p-2 rounded border border-white/[0.04]"
                >
                  {entry.comment ||
                    (entry.rating === "helpful" ? "Helpful" : "Not helpful")}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="w-full py-2 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-xs text-gray-300 flex items-center justify-center gap-2 transition-colors"
        >
          View detailed analytics
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}
