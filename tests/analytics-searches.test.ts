import {
  type DailySearchCount,
  type SearchQuery,
  type SearchesData,
  formatSearchCount,
  sumSearchCounts,
  truncateQuery,
} from "@/lib/analytics-searches";
import { fillDailyCounts } from "@/lib/analytics-visitors";
import { describe, expect, it } from "vitest";

describe("analytics-searches", () => {
  // ── formatSearchCount ───────────────────────────────────────────────────

  describe("formatSearchCount", () => {
    it("formats zero", () => {
      expect(formatSearchCount(0)).toBe("0");
    });

    it("formats small numbers without separator", () => {
      expect(formatSearchCount(42)).toBe("42");
    });

    it("formats thousands with comma separator", () => {
      expect(formatSearchCount(1234)).toBe("1,234");
    });

    it("formats large numbers with multiple separators", () => {
      expect(formatSearchCount(1234567)).toBe("1,234,567");
    });
  });

  // ── sumSearchCounts ─────────────────────────────────────────────────────

  describe("sumSearchCounts", () => {
    it("returns 0 for empty array", () => {
      expect(sumSearchCounts([])).toBe(0);
    });

    it("sums single entry", () => {
      const counts: DailySearchCount[] = [{ date: "2026-04-01", count: 15 }];
      expect(sumSearchCounts(counts)).toBe(15);
    });

    it("sums multiple entries", () => {
      const counts: DailySearchCount[] = [
        { date: "2026-04-01", count: 10 },
        { date: "2026-04-02", count: 20 },
        { date: "2026-04-03", count: 30 },
      ];
      expect(sumSearchCounts(counts)).toBe(60);
    });

    it("handles zero counts in the mix", () => {
      const counts: DailySearchCount[] = [
        { date: "2026-04-01", count: 5 },
        { date: "2026-04-02", count: 0 },
        { date: "2026-04-03", count: 8 },
      ];
      expect(sumSearchCounts(counts)).toBe(13);
    });
  });

  // ── truncateQuery ───────────────────────────────────────────────────────

  describe("truncateQuery", () => {
    it("returns short queries unchanged", () => {
      expect(truncateQuery("api auth")).toBe("api auth");
    });

    it("truncates long queries with ellipsis", () => {
      const longQuery =
        "how to configure authentication with google oauth in my nextjs app";
      const result = truncateQuery(longQuery, 30);
      expect(result.length).toBe(30);
      expect(result.endsWith("...")).toBe(true);
    });

    it("returns query at exactly maxLen unchanged", () => {
      const exact = "a".repeat(60);
      expect(truncateQuery(exact)).toBe(exact);
    });

    it("uses default maxLen of 60", () => {
      const longQuery = "a".repeat(100);
      const result = truncateQuery(longQuery);
      expect(result.length).toBe(60);
      expect(result.endsWith("...")).toBe(true);
    });
  });

  // ── SearchesData shape ──────────────────────────────────────────────────

  describe("SearchesData type integration", () => {
    it("has correct shape with dailyCounts, topSearches, and totalSearches", () => {
      const data: SearchesData = {
        dailyCounts: [
          { date: "2026-04-01", count: 100 },
          { date: "2026-04-02", count: 200 },
        ],
        topSearches: [
          { query: "authentication", count: 50 },
          { query: "api reference", count: 30 },
        ],
        totalSearches: 300,
      };

      expect(data.dailyCounts).toHaveLength(2);
      expect(data.topSearches).toHaveLength(2);
      expect(data.totalSearches).toBe(300);
    });

    it("works with fillDailyCounts from analytics-visitors", () => {
      const counts: DailySearchCount[] = [{ date: "2026-04-02", count: 50 }];
      const dateRange = ["2026-04-01", "2026-04-02", "2026-04-03"];
      const filled = fillDailyCounts(counts, dateRange);
      expect(filled).toEqual([
        { date: "2026-04-01", count: 0 },
        { date: "2026-04-02", count: 50 },
        { date: "2026-04-03", count: 0 },
      ]);
    });

    it("SearchQuery has query and count fields", () => {
      const search: SearchQuery = { query: "getting started", count: 42 };
      expect(search.query).toBe("getting started");
      expect(search.count).toBe(42);
    });

    it("works with truncateQuery for display", () => {
      const longQuery =
        "how do I set up custom domain verification with cloudflare dns";
      const truncated = truncateQuery(longQuery, 30);
      expect(truncated.length).toBe(30);
      expect(truncated.endsWith("...")).toBe(true);
    });
  });
});
