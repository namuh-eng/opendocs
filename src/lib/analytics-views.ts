/**
 * Analytics views — data types specific to the Views tab
 * Reuses DailyVisitorCount (as DailyViewCount) and TopPage from analytics-visitors
 */

import type { DailyVisitorCount, TopPage } from "./analytics-visitors";

/** Daily page-view count — same shape as DailyVisitorCount */
export type DailyViewCount = DailyVisitorCount;

/** Response shape for /api/analytics/views */
export interface ViewsData {
  dailyCounts: DailyViewCount[];
  topPages: TopPage[];
  totalViews: number;
}

/**
 * Format total view count for display (e.g., 1234 → "1,234")
 */
export function formatViewCount(count: number): string {
  return count.toLocaleString("en-US");
}

/**
 * Compute total views from daily counts array
 */
export function sumDailyCounts(counts: DailyViewCount[]): number {
  return counts.reduce((sum, d) => sum + d.count, 0);
}
