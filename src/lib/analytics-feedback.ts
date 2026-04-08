/**
 * Analytics Feedback tab utilities — types, sub-tab config, status definitions,
 * CSV export, and formatting helpers.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type FeedbackStatus =
  | "pending"
  | "in_progress"
  | "resolved"
  | "dismissed";

export type FeedbackSubTab = "ratings" | "detailed" | "code_snippets";

export interface FeedbackSubTabConfig {
  key: FeedbackSubTab;
  label: string;
  /** URL search param value for `type` */
  typeParam: string;
}

export interface FeedbackEntry {
  id: string;
  page: string;
  rating: string;
  comment: string;
  status: FeedbackStatus;
  isAbusive: boolean;
  createdAt: string;
  type: string; // "contextual" | "code_snippet" | "rating"
}

export interface RatingsByPage {
  page: string;
  helpful: number;
  notHelpful: number;
  total: number;
}

export interface FeedbackData {
  entries: FeedbackEntry[];
  ratingsByPage: RatingsByPage[];
  totalCount: number;
}

// ── Sub-tab configuration ────────────────────────────────────────────────────

export const feedbackSubTabs: FeedbackSubTabConfig[] = [
  { key: "ratings", label: "Ratings by page", typeParam: "ratings" },
  { key: "detailed", label: "Detailed feedback", typeParam: "contextual" },
  { key: "code_snippets", label: "Code snippets", typeParam: "code_snippet" },
];

// ── Status definitions ───────────────────────────────────────────────────────

export const feedbackStatuses: FeedbackStatus[] = [
  "pending",
  "in_progress",
  "resolved",
  "dismissed",
];

export const statusLabels: Record<FeedbackStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export const statusColors: Record<FeedbackStatus, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  resolved: "bg-emerald-500/20 text-emerald-400",
  dismissed: "bg-gray-500/20 text-gray-400",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function formatFeedbackDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function truncateFeedback(text: string, maxLen = 80): string {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
}

export function parseFeedbackStatus(val: unknown): FeedbackStatus {
  if (
    typeof val === "string" &&
    feedbackStatuses.includes(val as FeedbackStatus)
  ) {
    return val as FeedbackStatus;
  }
  return "pending";
}

export function filterByStatus(
  entries: FeedbackEntry[],
  activeStatuses: FeedbackStatus[],
  showAbusive: boolean,
): FeedbackEntry[] {
  return entries.filter((entry) => {
    if (activeStatuses.length > 0 && !activeStatuses.includes(entry.status)) {
      return false;
    }
    if (!showAbusive && entry.isAbusive) {
      return false;
    }
    return true;
  });
}

export function filterBySubTab(
  entries: FeedbackEntry[],
  subTab: FeedbackSubTab,
): FeedbackEntry[] {
  if (subTab === "ratings") return entries; // ratings view uses ratingsByPage, not entries
  const typeParam =
    feedbackSubTabs.find((t) => t.key === subTab)?.typeParam ?? "contextual";
  return entries.filter((e) => e.type === typeParam);
}

// ── CSV export ───────────────────────────────────────────────────────────────

export function feedbackToCsv(entries: FeedbackEntry[]): string {
  const header = "ID,Page,Rating,Comment,Status,Abusive,Type,Date";
  const rows = entries.map(
    (e) =>
      `"${e.id}","${e.page}","${e.rating}","${e.comment.replace(/"/g, '""')}","${e.status}","${e.isAbusive}","${e.type}","${e.createdAt}"`,
  );
  return [header, ...rows].join("\n");
}

export function ratingsToCsv(ratings: RatingsByPage[]): string {
  const header = "Page,Helpful,Not Helpful,Total";
  const rows = ratings.map(
    (r) => `"${r.page}",${r.helpful},${r.notHelpful},${r.total}`,
  );
  return [header, ...rows].join("\n");
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
