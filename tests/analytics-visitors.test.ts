import {
  fillDailyCounts,
  formatChartDate,
  formatDateKey,
  generateDateRange,
  truncatePath,
} from "@/lib/analytics-visitors";
import { describe, expect, it } from "vitest";

describe("analytics-visitors utilities", () => {
  // ── formatDateKey ─────────────────────────────────────────────────────────

  describe("formatDateKey", () => {
    it("formats a date as YYYY-MM-DD", () => {
      const d = new Date(2026, 3, 8); // April 8, 2026
      expect(formatDateKey(d)).toBe("2026-04-08");
    });

    it("pads single-digit month and day", () => {
      const d = new Date(2026, 0, 5); // Jan 5
      expect(formatDateKey(d)).toBe("2026-01-05");
    });

    it("handles December 31", () => {
      const d = new Date(2026, 11, 31);
      expect(formatDateKey(d)).toBe("2026-12-31");
    });
  });

  // ── generateDateRange ─────────────────────────────────────────────────────

  describe("generateDateRange", () => {
    it("generates a single day when from equals to", () => {
      const d = new Date(2026, 3, 8);
      const range = generateDateRange(d, d);
      expect(range).toEqual(["2026-04-08"]);
    });

    it("generates correct number of days for a 7-day range", () => {
      const from = new Date(2026, 3, 1);
      const to = new Date(2026, 3, 7);
      const range = generateDateRange(from, to);
      expect(range).toHaveLength(7);
      expect(range[0]).toBe("2026-04-01");
      expect(range[6]).toBe("2026-04-07");
    });

    it("spans across month boundary", () => {
      const from = new Date(2026, 2, 30); // Mar 30
      const to = new Date(2026, 3, 2); // Apr 2
      const range = generateDateRange(from, to);
      expect(range).toEqual([
        "2026-03-30",
        "2026-03-31",
        "2026-04-01",
        "2026-04-02",
      ]);
    });

    it("returns empty array when from is after to", () => {
      const from = new Date(2026, 3, 10);
      const to = new Date(2026, 3, 5);
      const range = generateDateRange(from, to);
      expect(range).toEqual([]);
    });
  });

  // ── fillDailyCounts ───────────────────────────────────────────────────────

  describe("fillDailyCounts", () => {
    it("fills missing dates with zero", () => {
      const counts = [
        { date: "2026-04-01", count: 5 },
        { date: "2026-04-03", count: 10 },
      ];
      const dateRange = [
        "2026-04-01",
        "2026-04-02",
        "2026-04-03",
        "2026-04-04",
      ];
      const filled = fillDailyCounts(counts, dateRange);
      expect(filled).toEqual([
        { date: "2026-04-01", count: 5 },
        { date: "2026-04-02", count: 0 },
        { date: "2026-04-03", count: 10 },
        { date: "2026-04-04", count: 0 },
      ]);
    });

    it("handles empty counts", () => {
      const filled = fillDailyCounts([], ["2026-04-01", "2026-04-02"]);
      expect(filled).toEqual([
        { date: "2026-04-01", count: 0 },
        { date: "2026-04-02", count: 0 },
      ]);
    });

    it("handles empty date range", () => {
      const counts = [{ date: "2026-04-01", count: 5 }];
      const filled = fillDailyCounts(counts, []);
      expect(filled).toEqual([]);
    });

    it("preserves existing counts in correct order", () => {
      const counts = [
        { date: "2026-04-03", count: 3 },
        { date: "2026-04-01", count: 7 },
      ];
      const dateRange = ["2026-04-01", "2026-04-02", "2026-04-03"];
      const filled = fillDailyCounts(counts, dateRange);
      expect(filled[0].count).toBe(7);
      expect(filled[1].count).toBe(0);
      expect(filled[2].count).toBe(3);
    });
  });

  // ── truncatePath ──────────────────────────────────────────────────────────

  describe("truncatePath", () => {
    it("returns short paths unchanged", () => {
      expect(truncatePath("/docs/intro")).toBe("/docs/intro");
    });

    it("truncates long paths with ellipsis", () => {
      const long = "/docs/very/deeply/nested/path/to/some/page/in/the/docs";
      const result = truncatePath(long, 30);
      expect(result.length).toBe(30);
      expect(result.endsWith("...")).toBe(true);
    });

    it("handles exact length paths", () => {
      const exact = "a".repeat(40);
      expect(truncatePath(exact, 40)).toBe(exact);
    });

    it("uses default maxLen of 40", () => {
      const long = "a".repeat(50);
      const result = truncatePath(long);
      expect(result.length).toBe(40);
    });
  });

  // ── formatChartDate ───────────────────────────────────────────────────────

  describe("formatChartDate", () => {
    it("formats date string as short month + day", () => {
      const result = formatChartDate("2026-04-08");
      expect(result).toBe("Apr 8");
    });

    it("formats January 1", () => {
      const result = formatChartDate("2026-01-01");
      expect(result).toBe("Jan 1");
    });

    it("formats December 31", () => {
      const result = formatChartDate("2026-12-31");
      expect(result).toBe("Dec 31");
    });
  });
});
