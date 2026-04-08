/**
 * Analytics visitors — data types, aggregation helpers, and formatters
 */

export interface DailyVisitorCount {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface TopPage {
  pagePath: string;
  views: number;
}

export interface Referral {
  source: string;
  views: number;
}

export interface VisitorsData {
  dailyCounts: DailyVisitorCount[];
  topPages: TopPage[];
  referrals: Referral[];
  totalVisitors: number;
}

/**
 * Generate date range array between from and to (inclusive), YYYY-MM-DD strings
 */
export function generateDateRange(from: Date, to: Date): string[] {
  const dates: string[] = [];
  const current = new Date(from);
  current.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(formatDateKey(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Format a Date to YYYY-MM-DD
 */
export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Truncate a page path for display. Keeps first segment and end.
 */
export function truncatePath(path: string, maxLen = 40): string {
  if (path.length <= maxLen) return path;
  return `${path.slice(0, maxLen - 3)}...`;
}

/**
 * Fill in missing dates with zero counts
 */
export function fillDailyCounts(
  counts: DailyVisitorCount[],
  dateRange: string[],
): DailyVisitorCount[] {
  const map = new Map<string, number>();
  for (const c of counts) {
    map.set(c.date, c.count);
  }
  return dateRange.map((date) => ({
    date,
    count: map.get(date) ?? 0,
  }));
}

/**
 * Format a date string for chart axis display (e.g., "Apr 1")
 */
export function formatChartDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
