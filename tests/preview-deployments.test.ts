import {
  generatePreviewUrl,
  isValidBranchName,
  validateCreatePreviewRequest,
} from "@/lib/deployments";
import { describe, expect, it } from "vitest";

describe("isValidBranchName", () => {
  it("accepts simple branch names", () => {
    expect(isValidBranchName("main")).toBe(true);
    expect(isValidBranchName("develop")).toBe(true);
    expect(isValidBranchName("feature-123")).toBe(true);
  });

  it("accepts branch names with slashes", () => {
    expect(isValidBranchName("feature/new-widget")).toBe(true);
    expect(isValidBranchName("bugfix/fix-login")).toBe(true);
  });

  it("accepts branch names with dots and underscores", () => {
    expect(isValidBranchName("v1.0.0")).toBe(true);
    expect(isValidBranchName("release_v2")).toBe(true);
  });

  it("rejects empty strings", () => {
    expect(isValidBranchName("")).toBe(false);
  });

  it("rejects branch names with spaces", () => {
    expect(isValidBranchName("my branch")).toBe(false);
  });

  it("rejects branch names with special characters", () => {
    expect(isValidBranchName("branch@name")).toBe(false);
    expect(isValidBranchName("branch#1")).toBe(false);
    expect(isValidBranchName("branch$money")).toBe(false);
  });

  it("rejects branch names longer than 256 characters", () => {
    expect(isValidBranchName("a".repeat(257))).toBe(false);
  });
});

describe("generatePreviewUrl", () => {
  it("generates preview URL from branch and subdomain", () => {
    expect(generatePreviewUrl("feature-123", "my-docs")).toBe(
      "https://feature-123.preview.my-docs.mintlify.app",
    );
  });

  it("sanitizes branch names with slashes", () => {
    expect(generatePreviewUrl("feature/new-widget", "docs")).toBe(
      "https://feature-new-widget.preview.docs.mintlify.app",
    );
  });

  it("lowercases branch names", () => {
    expect(generatePreviewUrl("Feature-ABC", "docs")).toBe(
      "https://feature-abc.preview.docs.mintlify.app",
    );
  });

  it("strips leading and trailing hyphens from sanitized name", () => {
    expect(generatePreviewUrl("/feature/", "docs")).toBe(
      "https://feature.preview.docs.mintlify.app",
    );
  });

  it("uses 'docs' as default when subdomain is null", () => {
    expect(generatePreviewUrl("staging", null)).toBe(
      "https://staging.preview.docs.mintlify.app",
    );
  });

  it("handles branch names with dots", () => {
    expect(generatePreviewUrl("v1.2.3", "docs")).toBe(
      "https://v1-2-3.preview.docs.mintlify.app",
    );
  });
});

describe("validateCreatePreviewRequest", () => {
  it("accepts valid request with branch only", () => {
    const result = validateCreatePreviewRequest({ branch: "feature-123" });
    expect(result).toEqual({ valid: true, branch: "feature-123" });
  });

  it("accepts valid request with branch, commitSha, and commitMessage", () => {
    const result = validateCreatePreviewRequest({
      branch: "staging",
      commitSha: "abc1234",
      commitMessage: "Add new feature",
    });
    expect(result).toEqual({
      valid: true,
      branch: "staging",
      commitSha: "abc1234",
      commitMessage: "Add new feature",
    });
  });

  it("trims whitespace from branch name", () => {
    const result = validateCreatePreviewRequest({ branch: "  staging  " });
    expect(result).toEqual({ valid: true, branch: "staging" });
  });

  it("rejects null body", () => {
    const result = validateCreatePreviewRequest(null);
    expect(result).toEqual({ valid: false, error: "Request body is required" });
  });

  it("rejects missing branch", () => {
    const result = validateCreatePreviewRequest({ commitSha: "abc1234" });
    expect(result).toEqual({
      valid: false,
      error: "Branch name is required",
    });
  });

  it("rejects empty branch", () => {
    const result = validateCreatePreviewRequest({ branch: "   " });
    expect(result).toEqual({
      valid: false,
      error: "Branch name is required",
    });
  });

  it("rejects invalid branch name characters", () => {
    const result = validateCreatePreviewRequest({ branch: "my branch" });
    expect(result).toEqual({
      valid: false,
      error:
        "Invalid branch name. Use alphanumeric characters, hyphens, underscores, dots, or slashes.",
    });
  });

  it("rejects invalid commit SHA", () => {
    const result = validateCreatePreviewRequest({
      branch: "main",
      commitSha: "not-a-sha",
    });
    expect(result).toEqual({ valid: false, error: "Invalid commit SHA" });
  });

  it("ignores non-string commitSha", () => {
    const result = validateCreatePreviewRequest({
      branch: "main",
      commitSha: 123,
    });
    expect(result).toEqual({ valid: true, branch: "main" });
  });

  it("ignores non-string commitMessage", () => {
    const result = validateCreatePreviewRequest({
      branch: "main",
      commitMessage: 42,
    });
    expect(result).toEqual({ valid: true, branch: "main" });
  });
});
