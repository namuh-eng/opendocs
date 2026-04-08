/**
 * Analytics utilities — date range presets, traffic source types, tab configuration
 */

export type TrafficSource = "human" | "agent";

export interface DatePreset {
  label: string;
  key: string;
  getRange: () => { from: Date; to: Date };
}

export interface AnalyticsTab {
  label: string;
  key: string;
  href: string;
}

// ── Humans mode tabs ──────────────────────────────────────────────────────────

export const humanTabs: AnalyticsTab[] = [
  { label: "Visitors", key: "visitors", href: "/analytics" },
  { label: "Views", key: "views", href: "/analytics/views" },
  { label: "Assistant", key: "assistant", href: "/analytics/assistant" },
  { label: "Searches", key: "searches", href: "/analytics/searches" },
  { label: "Feedback", key: "feedback", href: "/analytics/feedback" },
];

// ── Agents mode tabs ──────────────────────────────────────────────────────────

export const agentTabs: AnalyticsTab[] = [
  { label: "Agent Visitors", key: "agent-visitors", href: "/analytics" },
  {
    label: "MCP Searches",
    key: "mcp-searches",
    href: "/analytics/mcp-searches",
  },
];

// ── Date presets ──────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

export function getDatePresets(now: Date = new Date()): DatePreset[] {
  return [
    {
      label: "Today",
      key: "today",
      getRange: () => ({ from: startOfDay(now), to: endOfDay(now) }),
    },
    {
      label: "Yesterday",
      key: "yesterday",
      getRange: () => {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        return { from: startOfDay(d), to: endOfDay(d) };
      },
    },
    {
      label: "Last 7 days",
      key: "last-7",
      getRange: () => {
        const from = new Date(now);
        from.setDate(from.getDate() - 6);
        return { from: startOfDay(from), to: endOfDay(now) };
      },
    },
    {
      label: "Last 14 days",
      key: "last-14",
      getRange: () => {
        const from = new Date(now);
        from.setDate(from.getDate() - 13);
        return { from: startOfDay(from), to: endOfDay(now) };
      },
    },
    {
      label: "Last 30 days",
      key: "last-30",
      getRange: () => {
        const from = new Date(now);
        from.setDate(from.getDate() - 29);
        return { from: startOfDay(from), to: endOfDay(now) };
      },
    },
    {
      label: "Last 90 days",
      key: "last-90",
      getRange: () => {
        const from = new Date(now);
        from.setDate(from.getDate() - 89);
        return { from: startOfDay(from), to: endOfDay(now) };
      },
    },
    {
      label: "This month",
      key: "this-month",
      getRange: () => ({
        from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: endOfDay(now),
      }),
    },
    {
      label: "Year to date",
      key: "ytd",
      getRange: () => ({
        from: startOfDay(new Date(now.getFullYear(), 0, 1)),
        to: endOfDay(now),
      }),
    },
    {
      label: "All time",
      key: "all-time",
      getRange: () => ({
        from: startOfDay(new Date(2020, 0, 1)),
        to: endOfDay(now),
      }),
    },
  ];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getTabsForSource(source: TrafficSource): AnalyticsTab[] {
  return source === "human" ? humanTabs : agentTabs;
}

export function formatDateRange(from: Date, to: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const fromStr = from.toLocaleDateString("en-US", opts);
  const toStr = to.toLocaleDateString("en-US", opts);
  if (fromStr === toStr) return fromStr;
  return `${fromStr} - ${toStr}`;
}

export function parseDateParam(param: string | null): Date | null {
  if (!param) return null;
  const d = new Date(param);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseTrafficSource(param: string | null): TrafficSource {
  return param === "agent" ? "agent" : "human";
}
