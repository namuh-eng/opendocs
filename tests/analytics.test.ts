import {
  agentTabs,
  formatDateRange,
  getDatePresets,
  getTabsForSource,
  humanTabs,
  parseDateParam,
  parseTrafficSource,
} from "@/lib/analytics";
import { describe, expect, it } from "vitest";

describe("analytics utilities", () => {
  // ── Traffic source ────────────────────────────────────────────────────────

  describe("getTabsForSource", () => {
    it("returns 5 human tabs for 'human' source", () => {
      const tabs = getTabsForSource("human");
      expect(tabs).toHaveLength(5);
      expect(tabs.map((t) => t.key)).toEqual([
        "visitors",
        "views",
        "assistant",
        "searches",
        "feedback",
      ]);
    });

    it("returns 2 agent tabs for 'agent' source", () => {
      const tabs = getTabsForSource("agent");
      expect(tabs).toHaveLength(2);
      expect(tabs.map((t) => t.key)).toEqual([
        "agent-visitors",
        "mcp-searches",
      ]);
    });

    it("human tabs all have href starting with /analytics", () => {
      for (const tab of humanTabs) {
        expect(tab.href).toMatch(/^\/analytics/);
      }
    });

    it("agent tabs all have href starting with /analytics", () => {
      for (const tab of agentTabs) {
        expect(tab.href).toMatch(/^\/analytics/);
      }
    });
  });

  // ── Date presets ──────────────────────────────────────────────────────────

  describe("getDatePresets", () => {
    const fixedNow = new Date(2026, 3, 8, 14, 30, 0); // Apr 8, 2026 2:30PM

    function findPreset(key: string) {
      const preset = getDatePresets(fixedNow).find((p) => p.key === key);
      if (!preset) throw new Error(`Preset ${key} not found`);
      return preset;
    }

    it("returns 9 presets", () => {
      const presets = getDatePresets(fixedNow);
      expect(presets).toHaveLength(9);
    });

    it("Today preset returns same day start to end", () => {
      const { from, to } = findPreset("today").getRange();
      expect(from.getDate()).toBe(8);
      expect(from.getHours()).toBe(0);
      expect(to.getDate()).toBe(8);
      expect(to.getHours()).toBe(23);
    });

    it("Yesterday preset returns previous day", () => {
      const { from, to } = findPreset("yesterday").getRange();
      expect(from.getDate()).toBe(7);
      expect(to.getDate()).toBe(7);
    });

    it("Last 7 days preset spans 7 days back from now", () => {
      const { from, to } = findPreset("last-7").getRange();
      expect(from.getDate()).toBe(2); // Apr 2
      expect(to.getDate()).toBe(8);
    });

    it("This month preset starts on the 1st", () => {
      const { from } = findPreset("this-month").getRange();
      expect(from.getDate()).toBe(1);
      expect(from.getMonth()).toBe(3); // April
    });

    it("Year to date preset starts on Jan 1", () => {
      const { from } = findPreset("ytd").getRange();
      expect(from.getMonth()).toBe(0); // January
      expect(from.getDate()).toBe(1);
      expect(from.getFullYear()).toBe(2026);
    });

    it("preset labels match expected text", () => {
      const labels = getDatePresets(fixedNow).map((p) => p.label);
      expect(labels).toContain("Today");
      expect(labels).toContain("Yesterday");
      expect(labels).toContain("Last 7 days");
      expect(labels).toContain("Last 14 days");
      expect(labels).toContain("Last 30 days");
      expect(labels).toContain("Last 90 days");
      expect(labels).toContain("This month");
      expect(labels).toContain("Year to date");
      expect(labels).toContain("All time");
    });
  });

  // ── Format date range ─────────────────────────────────────────────────────

  describe("formatDateRange", () => {
    it("formats a multi-day range", () => {
      const from = new Date(2026, 3, 1);
      const to = new Date(2026, 3, 8);
      const result = formatDateRange(from, to);
      expect(result).toBe("Apr 1 - Apr 8");
    });

    it("returns single date when from and to are same day", () => {
      const d = new Date(2026, 3, 8);
      const result = formatDateRange(d, d);
      expect(result).toBe("Apr 8");
    });

    it("handles cross-month ranges", () => {
      const from = new Date(2026, 2, 25);
      const to = new Date(2026, 3, 8);
      const result = formatDateRange(from, to);
      expect(result).toBe("Mar 25 - Apr 8");
    });
  });

  // ── Parse helpers ─────────────────────────────────────────────────────────

  describe("parseDateParam", () => {
    it("returns null for null input", () => {
      expect(parseDateParam(null)).toBeNull();
    });

    it("returns null for invalid date string", () => {
      expect(parseDateParam("not-a-date")).toBeNull();
    });

    it("parses valid ISO date string", () => {
      const result = parseDateParam("2026-04-01");
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2026);
    });
  });

  describe("parseTrafficSource", () => {
    it("returns 'human' for null", () => {
      expect(parseTrafficSource(null)).toBe("human");
    });

    it("returns 'human' for unknown value", () => {
      expect(parseTrafficSource("robots")).toBe("human");
    });

    it("returns 'agent' for 'agent'", () => {
      expect(parseTrafficSource("agent")).toBe("agent");
    });

    it("returns 'human' for 'human'", () => {
      expect(parseTrafficSource("human")).toBe("human");
    });
  });
});
