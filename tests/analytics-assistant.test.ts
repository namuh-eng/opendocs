import { describe, expect, it } from "vitest";
import {
  type AssistantCategory,
  assistantSubTabs,
  type ChatHistoryEntry,
  categoriesToCsv,
  categorizeConversation,
  chatHistoryToCsv,
  escapeCsvField,
  extractFirstUserMessage,
  fillDailyConversationCounts,
  formatConversationDate,
  truncateMessage,
} from "@/lib/analytics-assistant";

// ── extractFirstUserMessage ──────────────────────────────────────────────────

describe("extractFirstUserMessage", () => {
  it("returns the first user message", () => {
    const messages = [
      { role: "assistant", content: "Hello!" },
      { role: "user", content: "How do I install?" },
      { role: "assistant", content: "Run npm install..." },
    ];
    expect(extractFirstUserMessage(messages)).toBe("How do I install?");
  });

  it("returns fallback when no user message exists", () => {
    const messages = [{ role: "assistant", content: "Welcome" }];
    expect(extractFirstUserMessage(messages)).toBe("(No message)");
  });

  it("returns fallback for empty messages array", () => {
    expect(extractFirstUserMessage([])).toBe("(No message)");
  });
});

// ── truncateMessage ──────────────────────────────────────────────────────────

describe("truncateMessage", () => {
  it("does not truncate short messages", () => {
    expect(truncateMessage("Hello")).toBe("Hello");
  });

  it("truncates long messages and adds ellipsis", () => {
    const long = "a".repeat(100);
    const result = truncateMessage(long, 80);
    expect(result).toHaveLength(83); // 80 + "..."
    expect(result.endsWith("...")).toBe(true);
  });

  it("respects custom maxLen", () => {
    const result = truncateMessage("Hello World!", 5);
    expect(result).toBe("Hello...");
  });

  it("handles exact length boundary", () => {
    expect(truncateMessage("12345", 5)).toBe("12345");
  });
});

// ── categorizeConversation ───────────────────────────────────────────────────

describe("categorizeConversation", () => {
  it("categorizes setup-related messages", () => {
    expect(categorizeConversation("How do I install the SDK?")).toBe(
      "Setup & Configuration",
    );
    expect(categorizeConversation("Configure my project")).toBe(
      "Setup & Configuration",
    );
  });

  it("categorizes API-related messages", () => {
    expect(categorizeConversation("What is the API endpoint for users?")).toBe(
      "API Reference",
    );
  });

  it("categorizes troubleshooting messages", () => {
    expect(categorizeConversation("I got an error when deploying")).toBe(
      "Troubleshooting",
    );
    expect(categorizeConversation("Fix this bug please")).toBe(
      "Troubleshooting",
    );
  });

  it("categorizes deployment messages", () => {
    expect(categorizeConversation("How to deploy to production")).toBe(
      "Deployment",
    );
  });

  it("categorizes auth messages", () => {
    expect(categorizeConversation("Set up login page")).toBe("Authentication");
  });

  it("categorizes general questions", () => {
    expect(categorizeConversation("How does this work?")).toBe(
      "General Questions",
    );
  });

  it("categorizes guide/tutorial messages", () => {
    expect(categorizeConversation("Show me a tutorial for React")).toBe(
      "Guides & Tutorials",
    );
  });

  it("categorizes UI messages", () => {
    expect(categorizeConversation("Style the component with Tailwind")).toBe(
      "UI & Components",
    );
  });

  it("returns Other for empty/no-message", () => {
    expect(categorizeConversation("(No message)")).toBe("Other");
    expect(categorizeConversation("")).toBe("Other");
  });

  it("returns General Questions for unmatched messages", () => {
    expect(categorizeConversation("Tell me about pricing plans")).toBe(
      "General Questions",
    );
  });
});

// ── formatConversationDate ───────────────────────────────────────────────────

describe("formatConversationDate", () => {
  it("formats recent dates as relative time", () => {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    expect(formatConversationDate(fiveMinAgo)).toBe("5m ago");
  });

  it("formats hours ago", () => {
    const now = new Date();
    const threeHoursAgo = new Date(
      now.getTime() - 3 * 60 * 60 * 1000,
    ).toISOString();
    expect(formatConversationDate(threeHoursAgo)).toBe("3h ago");
  });

  it("formats days ago", () => {
    const now = new Date();
    const twoDaysAgo = new Date(
      now.getTime() - 2 * 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(formatConversationDate(twoDaysAgo)).toBe("2d ago");
  });

  it("formats older dates with month and day", () => {
    const oldDate = new Date("2025-01-15T12:00:00Z").toISOString();
    const result = formatConversationDate(oldDate);
    expect(result).toContain("Jan");
    expect(result).toContain("15");
  });
});

// ── fillDailyConversationCounts ──────────────────────────────────────────────

describe("fillDailyConversationCounts", () => {
  it("fills gaps with zero counts", () => {
    const counts = [{ date: "2025-01-02", count: 5 }];
    const range = ["2025-01-01", "2025-01-02", "2025-01-03"];
    const result = fillDailyConversationCounts(counts, range);
    expect(result).toEqual([
      { date: "2025-01-01", count: 0 },
      { date: "2025-01-02", count: 5 },
      { date: "2025-01-03", count: 0 },
    ]);
  });

  it("handles empty counts", () => {
    const result = fillDailyConversationCounts([], ["2025-01-01"]);
    expect(result).toEqual([{ date: "2025-01-01", count: 0 }]);
  });
});

// ── CSV Export ────────────────────────────────────────────────────────────────

describe("escapeCsvField", () => {
  it("returns plain values unchanged", () => {
    expect(escapeCsvField("hello")).toBe("hello");
  });

  it("wraps values with commas in quotes", () => {
    expect(escapeCsvField("hello, world")).toBe('"hello, world"');
  });

  it("escapes double quotes inside values", () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it("wraps values with newlines in quotes", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("categoriesToCsv", () => {
  it("generates correct CSV with header", () => {
    const categories: AssistantCategory[] = [
      { category: "API Reference", count: 10 },
      { category: "Setup & Configuration", count: 5 },
    ];
    const csv = categoriesToCsv(categories);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Category,Conversations");
    expect(lines[1]).toBe("API Reference,10");
    expect(lines[2]).toBe("Setup & Configuration,5");
  });

  it("handles empty categories", () => {
    const csv = categoriesToCsv([]);
    expect(csv).toBe("Category,Conversations");
  });
});

describe("chatHistoryToCsv", () => {
  it("generates correct CSV with header", () => {
    const history: ChatHistoryEntry[] = [
      {
        id: "abc-123",
        firstMessage: "How do I install?",
        messageCount: 4,
        createdAt: "2025-01-15T12:00:00Z",
      },
    ];
    const csv = chatHistoryToCsv(history);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("ID,First Message,Messages,Date");
    expect(lines[1]).toBe("abc-123,How do I install?,4,2025-01-15T12:00:00Z");
  });

  it("escapes messages with commas", () => {
    const history: ChatHistoryEntry[] = [
      {
        id: "xyz",
        firstMessage: "Hello, how are you?",
        messageCount: 2,
        createdAt: "2025-01-15T12:00:00Z",
      },
    ];
    const csv = chatHistoryToCsv(history);
    expect(csv).toContain('"Hello, how are you?"');
  });
});

// ── Sub-tab config ───────────────────────────────────────────────────────────

describe("assistantSubTabs", () => {
  it("has exactly two tabs", () => {
    expect(assistantSubTabs).toHaveLength(2);
  });

  it("has Categories and Chat history tabs", () => {
    expect(assistantSubTabs[0].label).toBe("Categories");
    expect(assistantSubTabs[0].key).toBe("categories");
    expect(assistantSubTabs[1].label).toBe("Chat history");
    expect(assistantSubTabs[1].key).toBe("chat-history");
  });
});
