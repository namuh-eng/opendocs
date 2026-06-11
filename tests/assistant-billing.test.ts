import { describe, expect, it } from "vitest";
import {
  type AssistantUsageData,
  DEFAULT_ASSISTANT_USAGE,
  formatBillingDate,
  formatCents,
  usagePercent,
} from "@/lib/assistant-settings";

describe("Assistant Billing Tab — usage display logic", () => {
  describe("usage progress text", () => {
    it("formats 0% usage correctly", () => {
      const pct = usagePercent(0, 250);
      expect(pct).toBe(0);
      expect(`${pct}% (0 of 250) messages used`).toBe(
        "0% (0 of 250) messages used",
      );
    });

    it("formats partial usage correctly", () => {
      const pct = usagePercent(100, 250);
      expect(pct).toBe(40);
      expect(`${pct}% (100 of 250) messages used`).toBe(
        "40% (100 of 250) messages used",
      );
    });

    it("formats full usage correctly", () => {
      const pct = usagePercent(250, 250);
      expect(pct).toBe(100);
      expect(`${pct}% (250 of 250) messages used`).toBe(
        "100% (250 of 250) messages used",
      );
    });

    it("caps at 100% for overage", () => {
      const pct = usagePercent(300, 250);
      expect(pct).toBe(100);
    });
  });

  describe("stats grid values", () => {
    it("calculates messages remaining", () => {
      const usage: AssistantUsageData = {
        messagesUsed: 75,
        messageLimit: 250,
        billingCycleStart: "2026-04-01T00:00:00Z",
        billingCycleEnd: "2026-05-01T00:00:00Z",
        monthlyPrice: 0,
        overageSpend: 0,
      };
      const remaining = Math.max(0, usage.messageLimit - usage.messagesUsed);
      expect(remaining).toBe(175);
    });

    it("messages remaining never goes below zero", () => {
      const remaining = Math.max(0, 250 - 300);
      expect(remaining).toBe(0);
    });

    it("formats message range correctly", () => {
      const limit = 250;
      expect(`0 - ${limit}`).toBe("0 - 250");
    });

    it("formats monthly price as currency", () => {
      expect(formatCents(0)).toBe("$0.00");
      expect(formatCents(4900)).toBe("$49.00");
      expect(formatCents(1999)).toBe("$19.99");
    });

    it("formats overage spend with plus sign prefix", () => {
      expect(`+${formatCents(0)}`).toBe("+$0.00");
      expect(`+${formatCents(500)}`).toBe("+$5.00");
    });

    it("formats next billing date", () => {
      expect(formatBillingDate("2026-05-05T00:00:00Z")).toBe("May 5, 2026");
      expect(formatBillingDate(null)).toBe("—");
    });
  });

  describe("default usage values", () => {
    it("defaults to 0 messages used with 250 limit", () => {
      expect(DEFAULT_ASSISTANT_USAGE.messagesUsed).toBe(0);
      expect(DEFAULT_ASSISTANT_USAGE.messageLimit).toBe(250);
    });

    it("defaults to zero pricing", () => {
      expect(DEFAULT_ASSISTANT_USAGE.monthlyPrice).toBe(0);
      expect(DEFAULT_ASSISTANT_USAGE.overageSpend).toBe(0);
    });

    it("defaults to null billing cycle dates", () => {
      expect(DEFAULT_ASSISTANT_USAGE.billingCycleStart).toBeNull();
      expect(DEFAULT_ASSISTANT_USAGE.billingCycleEnd).toBeNull();
    });
  });

  describe("progress bar percentage", () => {
    it("returns 0 when limit is 0", () => {
      expect(usagePercent(10, 0)).toBe(0);
    });

    it("rounds to nearest integer", () => {
      // 1/3 = 33.33... -> 33
      expect(usagePercent(1, 3)).toBe(33);
      // 2/3 = 66.66... -> 67
      expect(usagePercent(2, 3)).toBe(67);
    });

    it("returns exact percentage for clean divisions", () => {
      expect(usagePercent(50, 100)).toBe(50);
      expect(usagePercent(25, 100)).toBe(25);
      expect(usagePercent(75, 100)).toBe(75);
    });
  });
});
