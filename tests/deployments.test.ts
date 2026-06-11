import { describe, expect, it } from "vitest";
import {
  DEPLOYMENT_STATUSES,
  deploymentDuration,
  formatDuration,
  generateDeploymentLogSteps,
  isValidStatus,
  shortSha,
  statusColor,
  statusDotColor,
  statusLabel,
  timeAgo,
  validateTriggerDeploymentRequest,
} from "@/lib/deployments";

describe("isValidStatus", () => {
  it("returns true for all valid statuses", () => {
    for (const s of DEPLOYMENT_STATUSES) {
      expect(isValidStatus(s)).toBe(true);
    }
  });

  it("returns false for invalid status", () => {
    expect(isValidStatus("cancelled")).toBe(false);
    expect(isValidStatus("")).toBe(false);
    expect(isValidStatus("QUEUED")).toBe(false);
  });
});

describe("statusLabel", () => {
  it("returns human-readable labels", () => {
    expect(statusLabel("queued")).toBe("Queued");
    expect(statusLabel("in_progress")).toBe("Updating");
    expect(statusLabel("succeeded")).toBe("Successful");
    expect(statusLabel("failed")).toBe("Failed");
  });
});

describe("statusColor", () => {
  it("returns color classes for each status", () => {
    expect(statusColor("queued")).toContain("gray");
    expect(statusColor("in_progress")).toContain("amber");
    expect(statusColor("succeeded")).toContain("emerald");
    expect(statusColor("failed")).toContain("red");
  });
});

describe("statusDotColor", () => {
  it("returns dot color for each status", () => {
    expect(statusDotColor("queued")).toContain("gray");
    expect(statusDotColor("in_progress")).toContain("amber");
    expect(statusDotColor("succeeded")).toContain("emerald");
    expect(statusDotColor("failed")).toContain("red");
  });
});

describe("timeAgo", () => {
  it("returns 'just now' for very recent dates", () => {
    expect(timeAgo(new Date())).toBe("just now");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgo(fiveMinAgo)).toBe("5 minutes ago");
  });

  it("returns singular minute", () => {
    const oneMinAgo = new Date(Date.now() - 61 * 1000);
    expect(timeAgo(oneMinAgo)).toBe("1 minute ago");
  });

  it("returns hours ago", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(timeAgo(threeHoursAgo)).toBe("3 hours ago");
  });

  it("returns days ago", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(timeAgo(twoDaysAgo)).toBe("2 days ago");
  });

  it("accepts string dates", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe("5 minutes ago");
  });

  it("returns months for old dates", () => {
    const twoMonthsAgo = new Date(Date.now() - 65 * 24 * 60 * 60 * 1000);
    expect(timeAgo(twoMonthsAgo)).toBe("2 months ago");
  });
});

describe("shortSha", () => {
  it("truncates a 40-char SHA to 7", () => {
    expect(shortSha("46cf4e0abcdef1234567890123456789abcdef12")).toBe(
      "46cf4e0",
    );
  });

  it("handles short SHA input", () => {
    expect(shortSha("abc1234")).toBe("abc1234");
  });

  it("returns empty string for null", () => {
    expect(shortSha(null)).toBe("");
  });
});

describe("validateTriggerDeploymentRequest", () => {
  it("accepts empty body for manual trigger", () => {
    const result = validateTriggerDeploymentRequest({});
    expect(result.valid).toBe(true);
  });

  it("accepts null body", () => {
    const result = validateTriggerDeploymentRequest(null);
    expect(result.valid).toBe(true);
  });

  it("accepts valid commit SHA and message", () => {
    const result = validateTriggerDeploymentRequest({
      commitSha: "46cf4e0",
      commitMessage: "Initial commit",
    });
    expect(result).toEqual({
      valid: true,
      commitSha: "46cf4e0",
      commitMessage: "Initial commit",
    });
  });

  it("accepts full 40-char SHA", () => {
    const sha = "46cf4e0abcdef1234567890123456789abcdef12";
    const result = validateTriggerDeploymentRequest({ commitSha: sha });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.commitSha).toBe(sha);
  });

  it("rejects invalid commit SHA", () => {
    const result = validateTriggerDeploymentRequest({
      commitSha: "not-a-sha!",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("Invalid commit SHA");
  });

  it("rejects too-short SHA", () => {
    const result = validateTriggerDeploymentRequest({ commitSha: "abc" });
    expect(result.valid).toBe(false);
  });
});

describe("generateDeploymentLogSteps", () => {
  it("returns an array of log step strings", () => {
    const steps = generateDeploymentLogSteps();
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0]).toBe("Verified update permissions");
    expect(steps[steps.length - 1]).toBe("Deployment complete");
  });
});

describe("deploymentDuration", () => {
  it("computes duration in seconds", () => {
    const start = new Date("2026-04-08T10:00:00Z");
    const end = new Date("2026-04-08T10:01:30Z");
    expect(deploymentDuration(start, end)).toBe(90);
  });

  it("handles string dates", () => {
    expect(
      deploymentDuration("2026-04-08T10:00:00Z", "2026-04-08T10:00:45Z"),
    ).toBe(45);
  });

  it("returns null when startedAt is null", () => {
    expect(deploymentDuration(null, new Date())).toBeNull();
  });

  it("returns null when endedAt is null", () => {
    expect(deploymentDuration(new Date(), null)).toBeNull();
  });
});

describe("formatDuration", () => {
  it("formats seconds under a minute", () => {
    expect(formatDuration(45)).toBe("45s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(90)).toBe("1m 30s");
  });

  it("formats even minutes without seconds", () => {
    expect(formatDuration(120)).toBe("2m");
  });

  it("returns empty string for null", () => {
    expect(formatDuration(null)).toBe("");
  });
});
