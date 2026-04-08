import {
  type FeedbackEntry,
  type FeedbackStatus,
  downloadCsv,
  feedbackStatuses,
  feedbackSubTabs,
  feedbackToCsv,
  filterByStatus,
  filterBySubTab,
  formatFeedbackDate,
  parseFeedbackStatus,
  ratingsToCsv,
  statusColors,
  statusLabels,
  truncateFeedback,
} from "@/lib/analytics-feedback";
import { describe, expect, it } from "vitest";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFeedback(overrides: Partial<FeedbackEntry> = {}): FeedbackEntry {
  return {
    id: "fb-1",
    page: "/docs/intro",
    rating: "helpful",
    comment: "Great docs!",
    status: "pending",
    isAbusive: false,
    createdAt: "2026-04-01T12:00:00Z",
    type: "contextual",
    ...overrides,
  };
}

// ── Sub-tab config ───────────────────────────────────────────────────────────

describe("feedbackSubTabs", () => {
  it("has 3 sub-tabs in correct order", () => {
    expect(feedbackSubTabs).toHaveLength(3);
    expect(feedbackSubTabs.map((t) => t.key)).toEqual([
      "ratings",
      "detailed",
      "code_snippets",
    ]);
  });

  it("each sub-tab has label and typeParam", () => {
    for (const tab of feedbackSubTabs) {
      expect(tab.label).toBeTruthy();
      expect(tab.typeParam).toBeTruthy();
    }
  });
});

// ── Status definitions ───────────────────────────────────────────────────────

describe("feedbackStatuses", () => {
  it("defines 4 statuses", () => {
    expect(feedbackStatuses).toEqual([
      "pending",
      "in_progress",
      "resolved",
      "dismissed",
    ]);
  });

  it("has labels for every status", () => {
    for (const status of feedbackStatuses) {
      expect(statusLabels[status]).toBeTruthy();
    }
  });

  it("has colors for every status", () => {
    for (const status of feedbackStatuses) {
      expect(statusColors[status]).toBeTruthy();
    }
  });
});

// ── parseFeedbackStatus ──────────────────────────────────────────────────────

describe("parseFeedbackStatus", () => {
  it("returns valid status as-is", () => {
    expect(parseFeedbackStatus("resolved")).toBe("resolved");
    expect(parseFeedbackStatus("in_progress")).toBe("in_progress");
  });

  it("defaults to pending for unknown values", () => {
    expect(parseFeedbackStatus("invalid")).toBe("pending");
    expect(parseFeedbackStatus(null)).toBe("pending");
    expect(parseFeedbackStatus(42)).toBe("pending");
  });
});

// ── formatFeedbackDate ───────────────────────────────────────────────────────

describe("formatFeedbackDate", () => {
  it("formats ISO date string", () => {
    const result = formatFeedbackDate("2026-04-01T12:00:00Z");
    expect(result).toContain("Apr");
    expect(result).toContain("2026");
  });
});

// ── truncateFeedback ─────────────────────────────────────────────────────────

describe("truncateFeedback", () => {
  it("returns short text as-is", () => {
    expect(truncateFeedback("Hello")).toBe("Hello");
  });

  it("truncates long text with ellipsis", () => {
    const long = "A".repeat(100);
    const result = truncateFeedback(long, 80);
    expect(result).toHaveLength(81); // 80 chars + ellipsis
    expect(result.endsWith("…")).toBe(true);
  });

  it("handles empty string", () => {
    expect(truncateFeedback("")).toBe("");
  });
});

// ── filterByStatus ───────────────────────────────────────────────────────────

describe("filterByStatus", () => {
  const entries: FeedbackEntry[] = [
    makeFeedback({ id: "1", status: "pending" }),
    makeFeedback({ id: "2", status: "resolved" }),
    makeFeedback({ id: "3", status: "dismissed", isAbusive: true }),
  ];

  it("returns all entries when no status filter", () => {
    const result = filterByStatus(entries, [], true);
    expect(result).toHaveLength(3);
  });

  it("filters by single status", () => {
    const result = filterByStatus(entries, ["pending"], true);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters by multiple statuses", () => {
    const result = filterByStatus(entries, ["pending", "resolved"], true);
    expect(result).toHaveLength(2);
  });

  it("hides abusive entries when showAbusive is false", () => {
    const result = filterByStatus(entries, [], false);
    expect(result).toHaveLength(2);
    expect(result.every((e) => !e.isAbusive)).toBe(true);
  });

  it("shows abusive entries when showAbusive is true", () => {
    const result = filterByStatus(entries, [], true);
    expect(result).toHaveLength(3);
  });
});

// ── filterBySubTab ───────────────────────────────────────────────────────────

describe("filterBySubTab", () => {
  const entries: FeedbackEntry[] = [
    makeFeedback({ id: "1", type: "contextual" }),
    makeFeedback({ id: "2", type: "code_snippet" }),
    makeFeedback({ id: "3", type: "contextual" }),
  ];

  it("returns all entries for ratings tab", () => {
    const result = filterBySubTab(entries, "ratings");
    expect(result).toHaveLength(3);
  });

  it("filters to contextual for detailed tab", () => {
    const result = filterBySubTab(entries, "detailed");
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.type === "contextual")).toBe(true);
  });

  it("filters to code_snippet for code snippets tab", () => {
    const result = filterBySubTab(entries, "code_snippets");
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("code_snippet");
  });
});

// ── CSV export ───────────────────────────────────────────────────────────────

describe("feedbackToCsv", () => {
  it("generates CSV with header and data rows", () => {
    const csv = feedbackToCsv([makeFeedback()]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain(
      "ID,Page,Rating,Comment,Status,Abusive,Type,Date",
    );
    expect(lines[1]).toContain("fb-1");
    expect(lines[1]).toContain("Great docs!");
  });

  it("escapes double quotes in comments", () => {
    const csv = feedbackToCsv([makeFeedback({ comment: 'He said "hello"' })]);
    expect(csv).toContain('""hello""');
  });
});

describe("ratingsToCsv", () => {
  it("generates CSV with ratings data", () => {
    const csv = ratingsToCsv([
      { page: "/intro", helpful: 5, notHelpful: 2, total: 7 },
    ]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("Page,Helpful,Not Helpful,Total");
    expect(lines[1]).toContain("/intro");
    expect(lines[1]).toContain("5");
  });
});
