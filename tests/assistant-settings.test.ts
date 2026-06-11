import { describe, expect, it } from "vitest";
import {
  DEFAULT_ASSISTANT_SETTINGS,
  DEFAULT_ASSISTANT_USAGE,
  formatBillingDate,
  formatCents,
  isValidDomain,
  isValidEmail,
  MAX_STARTER_QUESTIONS,
  usagePercent,
  validateAssistantSettingsUpdate,
} from "@/lib/assistant-settings";

describe("assistant-settings", () => {
  describe("isValidDomain", () => {
    it("accepts valid domains", () => {
      expect(isValidDomain("example.com")).toBe(true);
      expect(isValidDomain("docs.example.com")).toBe(true);
      expect(isValidDomain("my-site.co.uk")).toBe(true);
    });

    it("rejects invalid domains", () => {
      expect(isValidDomain("")).toBe(false);
      expect(isValidDomain("notadomain")).toBe(false);
      expect(isValidDomain("http://example.com")).toBe(false);
      expect(isValidDomain("example.com/path")).toBe(false);
      expect(isValidDomain(" ")).toBe(false);
    });

    it("rejects domains over 253 chars", () => {
      const longDomain = `${"a".repeat(250)}.com`;
      expect(isValidDomain(longDomain)).toBe(false);
    });
  });

  describe("isValidEmail", () => {
    it("accepts valid emails", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
      expect(isValidEmail("support@my-company.co")).toBe(true);
    });

    it("rejects invalid emails", () => {
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail("notanemail")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("user@")).toBe(false);
    });

    it("rejects emails over 320 chars", () => {
      const longEmail = `${"a".repeat(310)}@example.com`;
      expect(isValidEmail(longEmail)).toBe(false);
    });
  });

  describe("usagePercent", () => {
    it("calculates 0% when no usage", () => {
      expect(usagePercent(0, 250)).toBe(0);
    });

    it("calculates correct percentage", () => {
      expect(usagePercent(125, 250)).toBe(50);
      expect(usagePercent(250, 250)).toBe(100);
    });

    it("caps at 100%", () => {
      expect(usagePercent(300, 250)).toBe(100);
    });

    it("returns 0 for zero limit", () => {
      expect(usagePercent(10, 0)).toBe(0);
    });
  });

  describe("formatCents", () => {
    it("formats 0 cents", () => {
      expect(formatCents(0)).toBe("$0.00");
    });

    it("formats positive cents", () => {
      expect(formatCents(999)).toBe("$9.99");
      expect(formatCents(10000)).toBe("$100.00");
    });
  });

  describe("formatBillingDate", () => {
    it("returns dash for null", () => {
      expect(formatBillingDate(null)).toBe("—");
    });

    it("formats a date string", () => {
      const result = formatBillingDate("2026-05-05T00:00:00.000Z");
      expect(result).toContain("May");
      expect(result).toContain("2026");
    });
  });

  describe("DEFAULT_ASSISTANT_SETTINGS", () => {
    it("has expected defaults", () => {
      expect(DEFAULT_ASSISTANT_SETTINGS.enabled).toBe(false);
      expect(DEFAULT_ASSISTANT_SETTINGS.deflectionEnabled).toBe(false);
      expect(DEFAULT_ASSISTANT_SETTINGS.deflectionEmail).toBeNull();
      expect(DEFAULT_ASSISTANT_SETTINGS.showHelpButton).toBe(false);
      expect(DEFAULT_ASSISTANT_SETTINGS.searchDomainsEnabled).toBe(false);
      expect(DEFAULT_ASSISTANT_SETTINGS.searchDomains).toEqual([]);
      expect(DEFAULT_ASSISTANT_SETTINGS.starterQuestionsEnabled).toBe(false);
      expect(DEFAULT_ASSISTANT_SETTINGS.starterQuestions).toEqual([]);
    });
  });

  describe("DEFAULT_ASSISTANT_USAGE", () => {
    it("has expected defaults", () => {
      expect(DEFAULT_ASSISTANT_USAGE.messagesUsed).toBe(0);
      expect(DEFAULT_ASSISTANT_USAGE.messageLimit).toBe(250);
      expect(DEFAULT_ASSISTANT_USAGE.monthlyPrice).toBe(0);
      expect(DEFAULT_ASSISTANT_USAGE.overageSpend).toBe(0);
    });
  });

  describe("MAX_STARTER_QUESTIONS", () => {
    it("is 3", () => {
      expect(MAX_STARTER_QUESTIONS).toBe(3);
    });
  });

  describe("validateAssistantSettingsUpdate", () => {
    it("rejects null body", () => {
      const result = validateAssistantSettingsUpdate(null);
      expect(result.valid).toBe(false);
    });

    it("rejects non-object body", () => {
      const result = validateAssistantSettingsUpdate("string");
      expect(result.valid).toBe(false);
    });

    it("rejects empty object", () => {
      const result = validateAssistantSettingsUpdate({});
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.error).toContain("No valid fields");
    });

    it("validates enabled field", () => {
      const result = validateAssistantSettingsUpdate({ enabled: true });
      expect(result.valid).toBe(true);
      if (result.valid) expect(result.data.enabled).toBe(true);
    });

    it("rejects non-boolean enabled", () => {
      const result = validateAssistantSettingsUpdate({ enabled: "yes" });
      expect(result.valid).toBe(false);
    });

    it("validates deflectionEnabled", () => {
      const result = validateAssistantSettingsUpdate({
        deflectionEnabled: true,
      });
      expect(result.valid).toBe(true);
      if (result.valid) expect(result.data.deflectionEnabled).toBe(true);
    });

    it("validates deflectionEmail", () => {
      const result = validateAssistantSettingsUpdate({
        deflectionEmail: "test@example.com",
      });
      expect(result.valid).toBe(true);
      if (result.valid)
        expect(result.data.deflectionEmail).toBe("test@example.com");
    });

    it("rejects invalid deflectionEmail", () => {
      const result = validateAssistantSettingsUpdate({
        deflectionEmail: "notanemail",
      });
      expect(result.valid).toBe(false);
    });

    it("accepts null deflectionEmail", () => {
      const result = validateAssistantSettingsUpdate({
        deflectionEmail: null,
      });
      expect(result.valid).toBe(true);
      if (result.valid) expect(result.data.deflectionEmail).toBeNull();
    });

    it("validates showHelpButton", () => {
      const result = validateAssistantSettingsUpdate({
        showHelpButton: true,
      });
      expect(result.valid).toBe(true);
    });

    it("validates searchDomainsEnabled", () => {
      const result = validateAssistantSettingsUpdate({
        searchDomainsEnabled: true,
      });
      expect(result.valid).toBe(true);
    });

    it("validates searchDomains array", () => {
      const result = validateAssistantSettingsUpdate({
        searchDomains: ["example.com", "docs.test.org"],
      });
      expect(result.valid).toBe(true);
      if (result.valid) expect(result.data.searchDomains).toHaveLength(2);
    });

    it("rejects invalid domain in searchDomains", () => {
      const result = validateAssistantSettingsUpdate({
        searchDomains: ["example.com", "not-valid"],
      });
      expect(result.valid).toBe(false);
    });

    it("rejects non-array searchDomains", () => {
      const result = validateAssistantSettingsUpdate({
        searchDomains: "example.com",
      });
      expect(result.valid).toBe(false);
    });

    it("validates starterQuestionsEnabled", () => {
      const result = validateAssistantSettingsUpdate({
        starterQuestionsEnabled: true,
      });
      expect(result.valid).toBe(true);
    });

    it("validates starterQuestions array", () => {
      const result = validateAssistantSettingsUpdate({
        starterQuestions: ["How do I get started?", "What is this?"],
      });
      expect(result.valid).toBe(true);
      if (result.valid) expect(result.data.starterQuestions).toHaveLength(2);
    });

    it("rejects too many starter questions", () => {
      const result = validateAssistantSettingsUpdate({
        starterQuestions: ["Q1", "Q2", "Q3", "Q4"],
      });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.error).toContain("Maximum");
    });

    it("validates multiple fields at once", () => {
      const result = validateAssistantSettingsUpdate({
        enabled: true,
        deflectionEnabled: true,
        deflectionEmail: "test@example.com",
        showHelpButton: true,
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.enabled).toBe(true);
        expect(result.data.deflectionEnabled).toBe(true);
        expect(result.data.deflectionEmail).toBe("test@example.com");
        expect(result.data.showHelpButton).toBe(true);
      }
    });
  });
});
