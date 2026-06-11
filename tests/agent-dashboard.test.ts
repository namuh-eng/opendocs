import { describe, expect, it } from "vitest";
import {
  extractPrNumber,
  statusColor,
  statusLabel,
  timeAgo,
  truncatePrompt,
  validatePrompt,
} from "@/lib/agent-dashboard";

describe("statusLabel", () => {
  it("returns correct labels for each status", () => {
    expect(statusLabel("pending")).toBe("Pending");
    expect(statusLabel("running")).toBe("Running");
    expect(statusLabel("succeeded")).toBe("Succeeded");
    expect(statusLabel("failed")).toBe("Failed");
  });
});

describe("statusColor", () => {
  it("returns correct color tokens", () => {
    expect(statusColor("pending")).toBe("yellow");
    expect(statusColor("running")).toBe("blue");
    expect(statusColor("succeeded")).toBe("green");
    expect(statusColor("failed")).toBe("red");
  });
});

describe("truncatePrompt", () => {
  it("returns short prompts unchanged", () => {
    expect(truncatePrompt("Fix the typo")).toBe("Fix the typo");
  });

  it("truncates prompts exceeding maxLength", () => {
    const long = "a".repeat(100);
    const result = truncatePrompt(long, 80);
    expect(result).toHaveLength(81); // 80 chars + ellipsis
    expect(result.endsWith("…")).toBe(true);
  });

  it("respects custom maxLength", () => {
    const result = truncatePrompt("Hello World!", 5);
    expect(result).toBe("Hello…");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-04-09T12:00:00Z");

  it("formats seconds ago", () => {
    expect(timeAgo("2026-04-09T11:59:30Z", now)).toBe("30s ago");
  });

  it("formats minutes ago", () => {
    expect(timeAgo("2026-04-09T11:55:00Z", now)).toBe("5m ago");
  });

  it("formats hours ago", () => {
    expect(timeAgo("2026-04-09T09:00:00Z", now)).toBe("3h ago");
  });

  it("formats days ago", () => {
    expect(timeAgo("2026-04-07T12:00:00Z", now)).toBe("2d ago");
  });
});

describe("validatePrompt", () => {
  it("rejects empty strings", () => {
    const result = validatePrompt("   ");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Prompt cannot be empty");
  });

  it("rejects prompts over 5000 chars", () => {
    const result = validatePrompt("x".repeat(5001));
    expect(result.valid).toBe(false);
    expect(result.error).toContain("5000");
  });

  it("accepts valid prompts", () => {
    expect(validatePrompt("Update the getting started guide").valid).toBe(true);
  });
});

describe("extractPrNumber", () => {
  it("extracts PR number from GitHub URL", () => {
    expect(extractPrNumber("https://github.com/org/repo/pull/42")).toBe(42);
  });

  it("returns null for null input", () => {
    expect(extractPrNumber(null)).toBeNull();
  });

  it("returns null for non-PR URLs", () => {
    expect(extractPrNumber("https://github.com/org/repo")).toBeNull();
  });
});
