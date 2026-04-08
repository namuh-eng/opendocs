import {
  AI_TOOLS,
  type AiToolId,
  type ContextualAiMenuConfig,
  DEFAULT_CONTEXTUAL_AI_MENU,
  buildAiToolUrl,
  getEnabledAiTools,
} from "@/lib/contextual-ai-menu";
import { describe, expect, it } from "vitest";

describe("contextual-ai-menu", () => {
  describe("AI_TOOLS registry", () => {
    it("has at least 8 AI tools defined", () => {
      expect(AI_TOOLS.length).toBeGreaterThanOrEqual(8);
    });

    it("each tool has id, label, and urlTemplate", () => {
      for (const tool of AI_TOOLS) {
        expect(tool.id).toBeTruthy();
        expect(tool.label).toBeTruthy();
        expect(tool.urlTemplate).toBeTruthy();
      }
    });

    it("includes ChatGPT, Claude, Cursor, Perplexity, Google AI Studio, Grok, Devin, Windsurf", () => {
      const ids = AI_TOOLS.map((t) => t.id);
      expect(ids).toContain("chatgpt");
      expect(ids).toContain("claude");
      expect(ids).toContain("cursor");
      expect(ids).toContain("perplexity");
      expect(ids).toContain("google-ai-studio");
      expect(ids).toContain("grok");
      expect(ids).toContain("devin");
      expect(ids).toContain("windsurf");
    });
  });

  describe("DEFAULT_CONTEXTUAL_AI_MENU", () => {
    it("is disabled by default", () => {
      expect(DEFAULT_CONTEXTUAL_AI_MENU.enabled).toBe(false);
    });

    it("has empty tools list by default", () => {
      expect(DEFAULT_CONTEXTUAL_AI_MENU.tools).toEqual([]);
    });
  });

  describe("getEnabledAiTools", () => {
    it("returns empty when menu is disabled", () => {
      const config: ContextualAiMenuConfig = {
        enabled: false,
        tools: ["chatgpt", "claude"],
      };
      expect(getEnabledAiTools(config)).toEqual([]);
    });

    it("returns empty when tools list is empty", () => {
      const config: ContextualAiMenuConfig = { enabled: true, tools: [] };
      expect(getEnabledAiTools(config)).toEqual([]);
    });

    it("returns matching AI tool objects for enabled ids", () => {
      const config: ContextualAiMenuConfig = {
        enabled: true,
        tools: ["chatgpt", "claude"],
      };
      const result = getEnabledAiTools(config);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("chatgpt");
      expect(result[1].id).toBe("claude");
    });

    it("skips unknown tool ids", () => {
      const config: ContextualAiMenuConfig = {
        enabled: true,
        tools: ["chatgpt", "nonexistent" as AiToolId],
      };
      const result = getEnabledAiTools(config);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("chatgpt");
    });

    it("preserves order from config", () => {
      const config: ContextualAiMenuConfig = {
        enabled: true,
        tools: ["perplexity", "grok", "chatgpt"],
      };
      const result = getEnabledAiTools(config);
      expect(result.map((t) => t.id)).toEqual([
        "perplexity",
        "grok",
        "chatgpt",
      ]);
    });
  });

  describe("buildAiToolUrl", () => {
    it("builds ChatGPT URL with encoded content", () => {
      const url = buildAiToolUrl(
        "chatgpt",
        "Hello World",
        "https://example.com/docs/page",
      );
      expect(url).toContain("chatgpt.com");
      expect(url).toContain(encodeURIComponent("Hello World"));
    });

    it("builds Claude URL", () => {
      const url = buildAiToolUrl(
        "claude",
        "Test content",
        "https://example.com",
      );
      expect(url).toContain("claude.ai");
    });

    it("builds Perplexity URL with query", () => {
      const url = buildAiToolUrl(
        "perplexity",
        "Search this",
        "https://example.com",
      );
      expect(url).toContain("perplexity.ai");
    });

    it("builds Google AI Studio URL", () => {
      const url = buildAiToolUrl(
        "google-ai-studio",
        "Test",
        "https://example.com",
      );
      expect(url).toContain("aistudio.google.com");
    });

    it("builds Grok URL", () => {
      const url = buildAiToolUrl("grok", "Test", "https://example.com");
      expect(url).toContain("grok.com");
    });

    it("returns empty string for unknown tool", () => {
      const url = buildAiToolUrl(
        "nonexistent" as AiToolId,
        "Test",
        "https://example.com",
      );
      expect(url).toBe("");
    });

    it("truncates very long content to prevent URL overflow", () => {
      const longContent = "x".repeat(10000);
      const url = buildAiToolUrl("chatgpt", longContent, "https://example.com");
      // URL should be reasonable length (content truncated)
      expect(url.length).toBeLessThan(12000);
    });
  });
});
