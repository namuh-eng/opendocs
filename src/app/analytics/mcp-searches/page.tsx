"use client";

import {
  formatAgentCount,
  getAgentStatCards,
  mcpSearchesEmptyMessage,
} from "@/lib/analytics-agents";
import { Search } from "lucide-react";
import { Suspense } from "react";
import { AnalyticsShell } from "../analytics-shell";

function AgentStatsBar() {
  const cards = getAgentStatCards();
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.key}
          data-testid={`stat-card-${card.key}`}
          className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-4"
        >
          <p className="text-sm text-gray-400 mb-1">{card.label}</p>
          <p className="text-2xl font-semibold text-white">
            {formatAgentCount(card.count)}
          </p>
          <p className="text-xs text-gray-600 mt-1">&mdash;</p>
        </div>
      ))}
    </div>
  );
}

function McpSearchesContent() {
  return (
    <>
      <AgentStatsBar />
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
          <Search size={24} className="text-gray-500" />
        </div>
        <p className="text-gray-400 text-sm font-medium mb-1">
          {mcpSearchesEmptyMessage.title}
        </p>
        <p className="text-gray-500 text-xs">
          {mcpSearchesEmptyMessage.subtitle}
        </p>
      </div>
    </>
  );
}

export default function McpSearchesPage() {
  return (
    <Suspense
      fallback={
        <div className="px-8 py-6">
          <div className="h-8 w-32 bg-white/[0.06] rounded animate-pulse" />
        </div>
      }
    >
      <AnalyticsShell>
        <McpSearchesContent />
      </AnalyticsShell>
    </Suspense>
  );
}
