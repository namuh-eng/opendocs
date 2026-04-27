"use client";

import { useActiveProject } from "@/hooks/use-active-project";
import {
  getDatePresets,
  parseDateParam,
  parseTrafficSource,
} from "@/lib/analytics";
import {
  type AssistantCategory,
  type AssistantSubTab,
  type ChatHistoryEntry,
  assistantSubTabs,
  categoriesToCsv,
  chatHistoryToCsv,
  downloadCsv,
  formatConversationDate,
  truncateMessage,
} from "@/lib/analytics-assistant";
import { generateDateRange } from "@/lib/analytics-visitors";
import { Download, MessageSquare } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AnalyticsShell } from "../analytics-shell";

// ── Categories Table ─────────────────────────────────────────────────────────

function CategoriesTable({ categories }: { categories: AssistantCategory[] }) {
  if (categories.length === 0) {
    return null; // Empty state handled by parent
  }

  return (
    <div data-testid="categories-table">
      <div className="border border-white/[0.08] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
              <th className="text-left px-4 py-2.5 text-gray-400 font-medium">
                Category
              </th>
              <th className="text-right px-4 py-2.5 text-gray-400 font-medium w-28">
                Conversations
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr
                key={cat.category}
                className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-2.5 text-gray-300">{cat.category}</td>
                <td className="text-right px-4 py-2.5 text-gray-400 tabular-nums">
                  {cat.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Chat History Table ───────────────────────────────────────────────────────

function ChatHistoryTable({ history }: { history: ChatHistoryEntry[] }) {
  if (history.length === 0) {
    return null; // Empty state handled by parent
  }

  return (
    <div data-testid="chat-history-table">
      <div className="border border-white/[0.08] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
              <th className="text-left px-4 py-2.5 text-gray-400 font-medium">
                First message
              </th>
              <th className="text-right px-4 py-2.5 text-gray-400 font-medium w-24">
                Messages
              </th>
              <th className="text-right px-4 py-2.5 text-gray-400 font-medium w-28">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-2.5">
                  <span
                    className="text-gray-300 truncate block max-w-[400px]"
                    title={entry.firstMessage}
                  >
                    {truncateMessage(entry.firstMessage)}
                  </span>
                </td>
                <td className="text-right px-4 py-2.5 text-gray-400 tabular-nums">
                  {entry.messageCount}
                </td>
                <td className="text-right px-4 py-2.5 text-gray-500 text-xs">
                  {formatConversationDate(entry.createdAt)}
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

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 text-center"
      data-testid="assistant-empty-state"
    >
      <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
        <MessageSquare size={24} className="text-gray-500" />
      </div>
      <p className="text-gray-400 text-sm font-medium mb-1">
        No assistant activity
      </p>
      <p className="text-gray-500 text-xs">
        When users ask questions, results will show up here
      </p>
    </div>
  );
}

// ── Assistant Content ────────────────────────────────────────────────────────

function AssistantContent() {
  const searchParams = useSearchParams();
  const trafficSource = parseTrafficSource(searchParams.get("trafficSource"));

  const defaultPreset = getDatePresets()[2]; // Last 7 days
  const defaultRange = defaultPreset.getRange();
  const dateFrom =
    parseDateParam(searchParams.get("from")) ?? defaultRange.from;
  const dateTo = parseDateParam(searchParams.get("to")) ?? defaultRange.to;

  const { project, loading: projectLoading } = useActiveProject<{
    id: string;
  }>();
  const projectId = project?.id ?? null;
  const [categories, setCategories] = useState<AssistantCategory[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>([]);
  const [totalConversations, setTotalConversations] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [activeSubTab, setActiveSubTab] =
    useState<AssistantSubTab>("categories");
  const [loading, setLoading] = useState(true);

  // Fetch analytics data
  const fetchData = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const fromStr = dateFrom.toISOString().split("T")[0];
    const toStr = dateTo.toISOString().split("T")[0];

    const res = await fetch(
      `/api/analytics/assistant?projectId=${projectId}&from=${fromStr}&to=${toStr}`,
    );

    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories ?? []);
      setChatHistory(data.chatHistory ?? []);
      setTotalConversations(data.totalConversations ?? 0);
      setTotalMessages(data.totalMessages ?? 0);
    }
    setLoading(false);
  }, [projectId, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-gray-500">
        Loading analytics...
      </div>
    );
  }

  // CSV export handler
  function handleExportCsv() {
    const fromStr = dateFrom.toISOString().split("T")[0];
    const toStr = dateTo.toISOString().split("T")[0];

    if (activeSubTab === "categories") {
      const csv = categoriesToCsv(categories);
      downloadCsv(csv, `assistant-categories-${fromStr}-${toStr}.csv`);
    } else {
      const csv = chatHistoryToCsv(chatHistory);
      downloadCsv(csv, `assistant-chat-history-${fromStr}-${toStr}.csv`);
    }
  }

  // Agent mode shows empty state
  if (trafficSource === "agent") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
          <MessageSquare size={24} className="text-gray-500" />
        </div>
        <p className="text-gray-400 text-sm font-medium mb-1">
          No assistant activity
        </p>
        <p className="text-gray-500 text-xs">
          When AI agents use your assistant, activity will show up here.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 bg-white/[0.04] rounded animate-pulse" />
          <div className="h-8 w-32 bg-white/[0.04] rounded animate-pulse" />
        </div>
        <div className="h-48 bg-white/[0.04] rounded-lg animate-pulse" />
      </div>
    );
  }

  const hasData = totalConversations > 0;

  return (
    <div className="space-y-6">
      {/* Sub-tabs row + Export button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1" data-testid="assistant-sub-tabs">
          {assistantSubTabs.map((tab) => (
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

        <button
          type="button"
          onClick={handleExportCsv}
          data-testid="export-csv-button"
          disabled={!hasData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-300 bg-[#1a1a1a] border border-white/[0.08] rounded-lg hover:bg-white/[0.06] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={14} />
          Export to CSV
        </button>
      </div>

      {/* Summary line */}
      {hasData && (
        <div className="flex items-baseline gap-3">
          <span className="text-sm text-gray-400">
            {totalConversations.toLocaleString()} conversation
            {totalConversations !== 1 ? "s" : ""} ·{" "}
            {totalMessages.toLocaleString()} message
            {totalMessages !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Content based on active sub-tab */}
      {!hasData ? (
        <EmptyState />
      ) : activeSubTab === "categories" ? (
        <CategoriesTable categories={categories} />
      ) : (
        <ChatHistoryTable history={chatHistory} />
      )}
    </div>
  );
}

// ── Page Export ───────────────────────────────────────────────────────────────

export default function AnalyticsAssistantPage() {
  return (
    <Suspense
      fallback={
        <div className="px-8 py-6">
          <div className="h-8 w-32 bg-white/[0.06] rounded animate-pulse" />
        </div>
      }
    >
      <AnalyticsShell>
        <AssistantContent />
      </AnalyticsShell>
    </Suspense>
  );
}
