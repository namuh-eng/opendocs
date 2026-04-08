/**
 * Add-ons settings types and utilities.
 * Stored in project.settings.addons JSONB field.
 */

export interface AddonsSettings {
  feedback: {
    thumbsRating: boolean;
    editSuggestions: boolean;
    raiseIssues: boolean;
    contextualFeedback: boolean;
    codeSnippetFeedback: boolean;
  };
  ciChecks: {
    brokenLinks: "disabled" | "enabled";
    grammarLinter: "disabled" | "enabled";
  };
  previews: {
    previewDeployments: boolean;
    previewAuth: boolean;
  };
}

export type CiCheckValue = "disabled" | "enabled";

export function getDefaultAddons(): AddonsSettings {
  return {
    feedback: {
      thumbsRating: false,
      editSuggestions: false,
      raiseIssues: false,
      contextualFeedback: false,
      codeSnippetFeedback: false,
    },
    ciChecks: {
      brokenLinks: "disabled",
      grammarLinter: "disabled",
    },
    previews: {
      previewDeployments: false,
      previewAuth: false,
    },
  };
}

export function mergeAddons(
  existing: Partial<AddonsSettings> | undefined,
): AddonsSettings {
  const defaults = getDefaultAddons();
  if (!existing) return defaults;
  return {
    feedback: { ...defaults.feedback, ...existing.feedback },
    ciChecks: { ...defaults.ciChecks, ...existing.ciChecks },
    previews: { ...defaults.previews, ...existing.previews },
  };
}

export function validateCiCheckValue(value: unknown): value is CiCheckValue {
  return value === "disabled" || value === "enabled";
}
