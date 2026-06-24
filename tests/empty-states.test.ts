import { describe, expect, it } from "vitest";
import {
  agentEmptyState,
  analyticsEmptyState,
  editorEmptyState,
} from "@/lib/empty-states";

describe("Empty state configurations", () => {
  describe("analyticsEmptyState", () => {
    it("has correct title", () => {
      expect(analyticsEmptyState.title).toBe("No data yet");
    });

    it("has description mentioning sharing docs URL", () => {
      expect(analyticsEmptyState.description).toContain("Share your docs URL");
    });

    it("has CTA label for sharing URL", () => {
      expect(analyticsEmptyState.ctaLabel).toBe("Share your docs URL");
    });

    it("has CTA href to settings", () => {
      expect(analyticsEmptyState.ctaHref).toBe("/settings");
    });
  });

  describe("agentEmptyState", () => {
    it("has correct title", () => {
      expect(agentEmptyState.title).toBe("Connect integrations");
    });

    it("has description mentioning Slack or Linear", () => {
      expect(agentEmptyState.description).toContain("Slack or Linear");
    });

    it("has CTA label for connecting integrations", () => {
      expect(agentEmptyState.ctaLabel).toBe("Connect Slack or Linear");
    });

    it("has CTA href to integrations settings", () => {
      expect(agentEmptyState.ctaHref).toBe("/settings/integrations");
    });
  });

  describe("editorEmptyState", () => {
    it("has correct title", () => {
      expect(editorEmptyState.title).toBe("Start writing your docs");
    });

    it("has description mentioning MDX components", () => {
      expect(editorEmptyState.description).toContain("MDX");
    });

    it("has CTA label for creating a page", () => {
      expect(editorEmptyState.ctaLabel).toBe("Create a page");
    });

    it("does not have a ctaHref (uses onClick instead)", () => {
      expect(editorEmptyState.ctaHref).toBeUndefined();
    });
  });

  describe("all configs have required fields", () => {
    const configs = [analyticsEmptyState, agentEmptyState, editorEmptyState];

    it.each(configs)("has non-empty title", (config) => {
      expect(config.title.length).toBeGreaterThan(0);
    });

    it.each(configs)("has non-empty description", (config) => {
      expect(config.description.length).toBeGreaterThan(0);
    });

    it.each(configs)("has non-empty ctaLabel", (config) => {
      expect(config.ctaLabel.length).toBeGreaterThan(0);
    });
  });
});
