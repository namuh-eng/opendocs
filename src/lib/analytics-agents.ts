/**
 * Analytics Agents mode — stat cards, empty state messages, helpers
 */

export interface AgentStatCard {
  label: string;
  key: "agent-visitors" | "mcp-searches";
  count: number;
}

export interface EmptyStateMessage {
  title: string;
  subtitle: string;
}

export function formatAgentCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function getAgentStatCards(
  counts?: Partial<Record<"agent-visitors" | "mcp-searches", number>>,
): AgentStatCard[] {
  return [
    {
      label: "Agent Visitors",
      key: "agent-visitors",
      count: counts?.["agent-visitors"] ?? 0,
    },
    {
      label: "MCP Searches",
      key: "mcp-searches",
      count: counts?.["mcp-searches"] ?? 0,
    },
  ];
}

export const agentVisitorsEmptyMessage: EmptyStateMessage = {
  title: "No visitor activity",
  subtitle: "When AI agents visit your docs, activity will show up here.",
};

export const mcpSearchesEmptyMessage: EmptyStateMessage = {
  title: "No MCP search activity",
  subtitle:
    "When AI agents search your docs via MCP, results will show up here.",
};
