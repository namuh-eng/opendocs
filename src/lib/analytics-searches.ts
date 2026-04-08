/**
 * Analytics searches — data types specific to the Searches tab
 * Reuses DailyVisitorCount (as DailySearchCount) from analytics-visitors
 */

import type { DailyVisitorCount } from "./analytics-visitors";

/** Daily search count — same shape as DailyVisitorCount */
export type DailySearchCount = DailyVisitorCount;

/** A single search query with its frequency */
export interface SearchQuery {
  query: string;
  count: number;
}

/** Response shape for /api/analytics/searches */
export interface SearchesData {
  dailyCounts: DailySearchCount[];
  topSearches: SearchQuery[];
  totalSearches: number;
}

/**
 * Format total search count for display (e.g., 1234 → "1,234")
 */
export function formatSearchCount(count: number): string {
  return count.toLocaleString("en-US");
}

/**
 * Compute total searches from daily counts array
 */
export function sumSearchCounts(counts: DailySearchCount[]): number {
  return counts.reduce((sum, d) => sum + d.count, 0);
}

/**
 * Truncate a search query for display
 */
export function truncateQuery(query: string, maxLen = 60): string {
  if (query.length <= maxLen) return query;
  return `${query.slice(0, maxLen - 3)}...`;
}
