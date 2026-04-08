import {
  type AgentStatCard,
  agentVisitorsEmptyMessage,
  formatAgentCount,
  getAgentStatCards,
  mcpSearchesEmptyMessage,
} from "@/lib/analytics-agents";
import { describe, expect, it } from "vitest";

describe("analytics-agents", () => {
  // ── formatAgentCount ─────────────────────────────────────────────────────

  describe("formatAgentCount", () => {
    it("formats zero", () => {
      expect(formatAgentCount(0)).toBe("0");
    });

    it("formats small numbers without separator", () => {
      expect(formatAgentCount(42)).toBe("42");
    });

    it("formats thousands with comma separator", () => {
      expect(formatAgentCount(1_234)).toBe("1,234");
    });

    it("formats large numbers with multiple separators", () => {
      expect(formatAgentCount(1_234_567)).toBe("1,234,567");
    });
  });

  // ── getAgentStatCards ────────────────────────────────────────────────────

  describe("getAgentStatCards", () => {
    it("returns two stat cards", () => {
      const cards = getAgentStatCards();
      expect(cards).toHaveLength(2);
    });

    it("first card is Agent Visitors", () => {
      const cards = getAgentStatCards();
      expect(cards[0].label).toBe("Agent Visitors");
      expect(cards[0].key).toBe("agent-visitors");
    });

    it("second card is MCP Searches", () => {
      const cards = getAgentStatCards();
      expect(cards[1].label).toBe("MCP Searches");
      expect(cards[1].key).toBe("mcp-searches");
    });

    it("cards have default count of 0", () => {
      const cards = getAgentStatCards();
      for (const card of cards) {
        expect(card.count).toBe(0);
      }
    });

    it("accepts override counts", () => {
      const cards = getAgentStatCards({
        "agent-visitors": 15,
        "mcp-searches": 7,
      });
      expect(cards[0].count).toBe(15);
      expect(cards[1].count).toBe(7);
    });

    it("partial overrides only affect specified cards", () => {
      const cards = getAgentStatCards({ "mcp-searches": 3 });
      expect(cards[0].count).toBe(0);
      expect(cards[1].count).toBe(3);
    });
  });

  // ── Empty state messages ─────────────────────────────────────────────────

  describe("empty state messages", () => {
    it("agent visitors empty message has title and subtitle", () => {
      expect(agentVisitorsEmptyMessage.title).toBe("No visitor activity");
      expect(agentVisitorsEmptyMessage.subtitle).toContain("AI agents");
    });

    it("mcp searches empty message has title and subtitle", () => {
      expect(mcpSearchesEmptyMessage.title).toBe("No MCP search activity");
      expect(mcpSearchesEmptyMessage.subtitle).toContain(
        "AI agents search your docs via MCP",
      );
    });
  });
});
