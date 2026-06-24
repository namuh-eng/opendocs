import { describe, expect, it } from "vitest";
import {
  buildCommentThreads,
  canCreateBranch,
  canManageSuggestions,
  canResolveComment,
  createSuggestionDiff,
  formatCommentDate,
  parseSuggestionDiff,
  validateBranchName,
  validateCommentContent,
  validateSuggestionDiff,
} from "@/lib/collaboration";

// ── validateCommentContent ──────────────────────────────────────────────────

describe("validateCommentContent", () => {
  it("rejects empty content", () => {
    expect(validateCommentContent("")).not.toBeNull();
    expect(validateCommentContent("   ")).not.toBeNull();
  });

  it("accepts valid content", () => {
    expect(validateCommentContent("This is a comment")).toBeNull();
  });

  it("rejects content over 5000 chars", () => {
    expect(validateCommentContent("a".repeat(5001))).not.toBeNull();
  });

  it("accepts content at exactly 5000 chars", () => {
    expect(validateCommentContent("a".repeat(5000))).toBeNull();
  });
});

// ── validateSuggestionDiff ──────────────────────────────────────────────────

describe("validateSuggestionDiff", () => {
  it("rejects empty diff", () => {
    expect(validateSuggestionDiff("")).not.toBeNull();
  });

  it("accepts valid diff", () => {
    expect(validateSuggestionDiff("old text\n---\nnew text")).toBeNull();
  });

  it("rejects diff over 50000 chars", () => {
    expect(validateSuggestionDiff("a".repeat(50001))).not.toBeNull();
  });
});

// ── validateBranchName ──────────────────────────────────────────────────────

describe("validateBranchName", () => {
  it("rejects empty name", () => {
    expect(validateBranchName("")).not.toBeNull();
  });

  it("accepts valid branch names", () => {
    expect(validateBranchName("feature/my-branch")).toBeNull();
    expect(validateBranchName("fix-123")).toBeNull();
    expect(validateBranchName("main")).toBeNull();
  });

  it("rejects names with '..'", () => {
    expect(validateBranchName("feature..branch")).not.toBeNull();
  });

  it("rejects names starting with '.'", () => {
    expect(validateBranchName(".hidden")).not.toBeNull();
  });

  it("rejects names with spaces", () => {
    expect(validateBranchName("my branch")).not.toBeNull();
  });

  it("rejects names with consecutive slashes", () => {
    expect(validateBranchName("feature//branch")).not.toBeNull();
  });

  it("rejects names ending with '-'", () => {
    expect(validateBranchName("feature-")).not.toBeNull();
  });

  it("rejects names over 256 chars", () => {
    expect(validateBranchName("a".repeat(257))).not.toBeNull();
  });
});

// ── parseSuggestionDiff / createSuggestionDiff ──────────────────────────────

describe("parseSuggestionDiff", () => {
  it("parses a diff with separator", () => {
    const diff = createSuggestionDiff("old text", "new text");
    const parsed = parseSuggestionDiff(diff);
    expect(parsed.originalText).toBe("old text");
    expect(parsed.suggestedText).toBe("new text");
  });

  it("handles diff without separator", () => {
    const parsed = parseSuggestionDiff("just some text");
    expect(parsed.originalText).toBe("just some text");
    expect(parsed.suggestedText).toBe("just some text");
  });

  it("round-trips correctly", () => {
    const original = "Hello world";
    const suggested = "Hello, world!";
    const diff = createSuggestionDiff(original, suggested);
    const parsed = parseSuggestionDiff(diff);
    expect(parsed.originalText).toBe(original);
    expect(parsed.suggestedText).toBe(suggested);
  });
});

// ── buildCommentThreads ─────────────────────────────────────────────────────

describe("buildCommentThreads", () => {
  const baseComment = {
    pageId: "page-1",
    resolved: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  it("builds threads from flat comments", () => {
    const flat = [
      {
        ...baseComment,
        id: "c1",
        userId: "u1",
        parentId: null,
        content: "Thread 1",
      },
      {
        ...baseComment,
        id: "c2",
        userId: "u2",
        parentId: "c1",
        content: "Reply to thread 1",
      },
      {
        ...baseComment,
        id: "c3",
        userId: "u1",
        parentId: null,
        content: "Thread 2",
      },
    ];

    const threads = buildCommentThreads(flat);
    expect(threads).toHaveLength(2);
    expect(threads[0].id).toBe("c1");
    expect(threads[0].replies).toHaveLength(1);
    expect(threads[0].replies[0].content).toBe("Reply to thread 1");
    expect(threads[1].id).toBe("c3");
    expect(threads[1].replies).toHaveLength(0);
  });

  it("returns empty array for no comments", () => {
    expect(buildCommentThreads([])).toEqual([]);
  });

  it("resolves user names from map", () => {
    const flat = [
      {
        ...baseComment,
        id: "c1",
        userId: "u1",
        parentId: null,
        content: "Hello",
      },
    ];
    const userMap = new Map([["u1", "Alice"]]);
    const threads = buildCommentThreads(flat, userMap);
    expect(threads[0].userName).toBe("Alice");
  });

  it("sorts replies by createdAt ascending", () => {
    const flat = [
      {
        ...baseComment,
        id: "c1",
        userId: "u1",
        parentId: null,
        content: "Thread",
      },
      {
        ...baseComment,
        id: "c3",
        userId: "u1",
        parentId: "c1",
        content: "Late reply",
        createdAt: "2026-01-03T00:00:00Z",
      },
      {
        ...baseComment,
        id: "c2",
        userId: "u2",
        parentId: "c1",
        content: "Early reply",
        createdAt: "2026-01-02T00:00:00Z",
      },
    ];

    const threads = buildCommentThreads(flat);
    expect(threads[0].replies[0].content).toBe("Early reply");
    expect(threads[0].replies[1].content).toBe("Late reply");
  });
});

// ── Role checks ─────────────────────────────────────────────────────────────

describe("role checks", () => {
  it("canResolveComment allows admin and editor", () => {
    expect(canResolveComment("admin")).toBe(true);
    expect(canResolveComment("editor")).toBe(true);
    expect(canResolveComment("viewer")).toBe(false);
  });

  it("canManageSuggestions allows admin and editor", () => {
    expect(canManageSuggestions("admin")).toBe(true);
    expect(canManageSuggestions("editor")).toBe(true);
    expect(canManageSuggestions("viewer")).toBe(false);
  });

  it("canCreateBranch allows admin and editor", () => {
    expect(canCreateBranch("admin")).toBe(true);
    expect(canCreateBranch("editor")).toBe(true);
    expect(canCreateBranch("viewer")).toBe(false);
  });
});

// ── formatCommentDate ───────────────────────────────────────────────────────

describe("formatCommentDate", () => {
  it('returns "just now" for very recent dates', () => {
    const now = new Date().toISOString();
    expect(formatCommentDate(now)).toBe("just now");
  });

  it("returns minutes for recent dates", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatCommentDate(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours for dates within a day", () => {
    const threeHoursAgo = new Date(
      Date.now() - 3 * 60 * 60 * 1000,
    ).toISOString();
    expect(formatCommentDate(threeHoursAgo)).toBe("3h ago");
  });

  it("returns days for dates within a week", () => {
    const twoDaysAgo = new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(formatCommentDate(twoDaysAgo)).toBe("2d ago");
  });

  it("returns formatted date for older dates", () => {
    const result = formatCommentDate("2025-01-15T00:00:00Z");
    expect(result).toMatch(/Jan 15/);
  });
});
