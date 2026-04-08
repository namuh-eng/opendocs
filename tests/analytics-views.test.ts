import {
  type DailyViewCount,
  type ViewsData,
  formatViewCount,
  sumDailyCounts,
} from "@/lib/analytics-views";
import { fillDailyCounts, truncatePath } from "@/lib/analytics-visitors";
import { describe, expect, it } from "vitest";

describe("analytics-views", () => {
  // ── formatViewCount ──────────────────────────────────────────────────────

  describe("formatViewCount", () => {
    it("formats zero", () => {
      expect(formatViewCount(0)).toBe("0");
    });

    it("formats small numbers without separator", () => {
      expect(formatViewCount(42)).toBe("42");
    });

    it("formats thousands with comma separator", () => {
      expect(formatViewCount(1234)).toBe("1,234");
    });

    it("formats large numbers with multiple separators", () => {
      expect(formatViewCount(1234567)).toBe("1,234,567");
    });
  });

  // ── sumDailyCounts ───────────────────────────────────────────────────────

  describe("sumDailyCounts", () => {
    it("returns 0 for empty array", () => {
      expect(sumDailyCounts([])).toBe(0);
    });

    it("sums single entry", () => {
      const counts: DailyViewCount[] = [{ date: "2026-04-01", count: 15 }];
      expect(sumDailyCounts(counts)).toBe(15);
    });

    it("sums multiple entries", () => {
      const counts: DailyViewCount[] = [
        { date: "2026-04-01", count: 10 },
        { date: "2026-04-02", count: 20 },
        { date: "2026-04-03", count: 30 },
      ];
      expect(sumDailyCounts(counts)).toBe(60);
    });

    it("handles zero counts in the mix", () => {
      const counts: DailyViewCount[] = [
        { date: "2026-04-01", count: 5 },
        { date: "2026-04-02", count: 0 },
        { date: "2026-04-03", count: 8 },
      ];
      expect(sumDailyCounts(counts)).toBe(13);
    });
  });

  // ── ViewsData shape ──────────────────────────────────────────────────────

  describe("ViewsData type integration", () => {
    it("has correct shape with dailyCounts, topPages, and totalViews", () => {
      const data: ViewsData = {
        dailyCounts: [
          { date: "2026-04-01", count: 100 },
          { date: "2026-04-02", count: 200 },
        ],
        topPages: [
          { pagePath: "/docs/intro", views: 150 },
          { pagePath: "/docs/api", views: 100 },
        ],
        totalViews: 300,
      };

      expect(data.dailyCounts).toHaveLength(2);
      expect(data.topPages).toHaveLength(2);
      expect(data.totalViews).toBe(300);
    });

    it("works with fillDailyCounts from analytics-visitors", () => {
      const counts: DailyViewCount[] = [{ date: "2026-04-02", count: 50 }];
      const dateRange = ["2026-04-01", "2026-04-02", "2026-04-03"];
      const filled = fillDailyCounts(counts, dateRange);
      expect(filled).toEqual([
        { date: "2026-04-01", count: 0 },
        { date: "2026-04-02", count: 50 },
        { date: "2026-04-03", count: 0 },
      ]);
    });

    it("works with truncatePath for top pages display", () => {
      const longPath =
        "/docs/very/deeply/nested/path/to/some/specific/guide/page";
      const truncated = truncatePath(longPath, 30);
      expect(truncated.length).toBe(30);
      expect(truncated.endsWith("...")).toBe(true);
    });
  });
});
