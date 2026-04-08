import {
  type AddonsSettings,
  getDefaultAddons,
  mergeAddons,
  validateCiCheckValue,
} from "@/lib/addons";
import { describe, expect, it } from "vitest";

describe("Addons settings data model", () => {
  it("returns all defaults when no existing settings", () => {
    const result = mergeAddons(undefined);
    expect(result.feedback.thumbsRating).toBe(false);
    expect(result.feedback.editSuggestions).toBe(false);
    expect(result.feedback.raiseIssues).toBe(false);
    expect(result.feedback.contextualFeedback).toBe(false);
    expect(result.feedback.codeSnippetFeedback).toBe(false);
    expect(result.ciChecks.brokenLinks).toBe("disabled");
    expect(result.ciChecks.grammarLinter).toBe("disabled");
    expect(result.previews.previewDeployments).toBe(false);
    expect(result.previews.previewAuth).toBe(false);
  });

  it("merges partial feedback settings with defaults", () => {
    const result = mergeAddons({
      feedback: {
        thumbsRating: true,
        editSuggestions: false,
        raiseIssues: false,
        contextualFeedback: false,
        codeSnippetFeedback: false,
      },
    });
    expect(result.feedback.thumbsRating).toBe(true);
    expect(result.feedback.editSuggestions).toBe(false);
    expect(result.ciChecks.brokenLinks).toBe("disabled");
    expect(result.previews.previewDeployments).toBe(false);
  });

  it("merges partial ciChecks with defaults", () => {
    const result = mergeAddons({
      ciChecks: { brokenLinks: "enabled", grammarLinter: "disabled" },
    });
    expect(result.ciChecks.brokenLinks).toBe("enabled");
    expect(result.ciChecks.grammarLinter).toBe("disabled");
    expect(result.feedback.thumbsRating).toBe(false);
  });

  it("merges partial previews with defaults", () => {
    const result = mergeAddons({
      previews: { previewDeployments: true, previewAuth: false },
    });
    expect(result.previews.previewDeployments).toBe(true);
    expect(result.previews.previewAuth).toBe(false);
  });

  it("preserves all overrides when fully specified", () => {
    const full: AddonsSettings = {
      feedback: {
        thumbsRating: true,
        editSuggestions: true,
        raiseIssues: true,
        contextualFeedback: true,
        codeSnippetFeedback: true,
      },
      ciChecks: {
        brokenLinks: "enabled",
        grammarLinter: "enabled",
      },
      previews: {
        previewDeployments: true,
        previewAuth: true,
      },
    };
    const result = mergeAddons(full);
    expect(result).toEqual(full);
  });

  it("getDefaultAddons returns a fresh copy each time", () => {
    const a = getDefaultAddons();
    const b = getDefaultAddons();
    expect(a).toEqual(b);
    a.feedback.thumbsRating = true;
    expect(b.feedback.thumbsRating).toBe(false);
  });
});

describe("Addons settings validation", () => {
  it("accepts valid CI check values", () => {
    expect(validateCiCheckValue("disabled")).toBe(true);
    expect(validateCiCheckValue("enabled")).toBe(true);
  });

  it("rejects invalid CI check values", () => {
    expect(validateCiCheckValue("warning")).toBe(false);
    expect(validateCiCheckValue("")).toBe(false);
    expect(validateCiCheckValue(null)).toBe(false);
    expect(validateCiCheckValue(42)).toBe(false);
  });
});
