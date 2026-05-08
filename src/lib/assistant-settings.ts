/**
 * Assistant settings utilities — types, validation, defaults.
 */

export interface AssistantSettingsData {
  enabled: boolean;
  deflectionEnabled: boolean;
  deflectionEmail: string | null;
  showHelpButton: boolean;
  searchDomainsEnabled: boolean;
  searchDomains: string[];
  starterQuestionsEnabled: boolean;
  starterQuestions: string[];
}

export const DEFAULT_ASSISTANT_SETTINGS: AssistantSettingsData = {
  enabled: false,
  deflectionEnabled: false,
  deflectionEmail: null,
  showHelpButton: false,
  searchDomainsEnabled: false,
  searchDomains: [],
  starterQuestionsEnabled: false,
  starterQuestions: [],
};

export const MAX_STARTER_QUESTIONS = 3;

export interface AssistantUsageData {
  messagesUsed: number;
  messageLimit: number;
  billingCycleStart: string | null;
  billingCycleEnd: string | null;
  monthlyPrice: number;
  overageSpend: number;
}

export const DEFAULT_ASSISTANT_USAGE: AssistantUsageData = {
  messagesUsed: 0,
  messageLimit: 250,
  billingCycleStart: null,
  billingCycleEnd: null,
  monthlyPrice: 0,
  overageSpend: 0,
};

/** Validate a domain string (basic check). */
export function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(
    domain,
  );
}

/** Validate an email address (basic check). */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 320) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Calculate usage percentage. */
export function usagePercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
}

/** Format currency cents to dollars string. */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
}

/** Format a date string to a short readable format like "May 5, 2026". */
export function formatBillingDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Validate an update request body for assistant settings. */
export function validateAssistantSettingsUpdate(
  body: unknown,
):
  | { valid: true; data: Partial<AssistantSettingsData> }
  | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" };
  }

  const b = body as Record<string, unknown>;
  const data: Partial<AssistantSettingsData> = {};

  if ("enabled" in b) {
    if (typeof b.enabled !== "boolean") {
      return { valid: false, error: "enabled must be a boolean" };
    }
    data.enabled = b.enabled;
  }

  if ("deflectionEnabled" in b) {
    if (typeof b.deflectionEnabled !== "boolean") {
      return { valid: false, error: "deflectionEnabled must be a boolean" };
    }
    data.deflectionEnabled = b.deflectionEnabled;
  }

  if ("deflectionEmail" in b) {
    if (b.deflectionEmail !== null && typeof b.deflectionEmail !== "string") {
      return {
        valid: false,
        error: "deflectionEmail must be a string or null",
      };
    }
    if (typeof b.deflectionEmail === "string" && b.deflectionEmail.length > 0) {
      if (!isValidEmail(b.deflectionEmail)) {
        return { valid: false, error: "Invalid email address" };
      }
    }
    data.deflectionEmail = b.deflectionEmail as string | null;
  }

  if ("showHelpButton" in b) {
    if (typeof b.showHelpButton !== "boolean") {
      return { valid: false, error: "showHelpButton must be a boolean" };
    }
    data.showHelpButton = b.showHelpButton;
  }

  if ("searchDomainsEnabled" in b) {
    if (typeof b.searchDomainsEnabled !== "boolean") {
      return { valid: false, error: "searchDomainsEnabled must be a boolean" };
    }
    data.searchDomainsEnabled = b.searchDomainsEnabled;
  }

  if ("searchDomains" in b) {
    if (!Array.isArray(b.searchDomains)) {
      return { valid: false, error: "searchDomains must be an array" };
    }
    if (!b.searchDomains.every((d: unknown) => typeof d === "string")) {
      return {
        valid: false,
        error: "searchDomains must be an array of strings",
      };
    }
    for (const domain of b.searchDomains as string[]) {
      if (!isValidDomain(domain)) {
        return { valid: false, error: `Invalid domain: ${domain}` };
      }
    }
    data.searchDomains = b.searchDomains as string[];
  }

  if ("starterQuestionsEnabled" in b) {
    if (typeof b.starterQuestionsEnabled !== "boolean") {
      return {
        valid: false,
        error: "starterQuestionsEnabled must be a boolean",
      };
    }
    data.starterQuestionsEnabled = b.starterQuestionsEnabled;
  }

  if ("starterQuestions" in b) {
    if (!Array.isArray(b.starterQuestions)) {
      return { valid: false, error: "starterQuestions must be an array" };
    }
    if (!b.starterQuestions.every((q: unknown) => typeof q === "string")) {
      return {
        valid: false,
        error: "starterQuestions must be an array of strings",
      };
    }
    if (b.starterQuestions.length > MAX_STARTER_QUESTIONS) {
      return {
        valid: false,
        error: `Maximum ${MAX_STARTER_QUESTIONS} starter questions allowed`,
      };
    }
    data.starterQuestions = b.starterQuestions as string[];
  }

  if (Object.keys(data).length === 0) {
    return { valid: false, error: "No valid fields to update" };
  }

  return { valid: true, data };
}
