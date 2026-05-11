export type BillingPlan = "free" | "pro" | "enterprise";

export interface BillingPlanDetails {
  plan: BillingPlan;
  label: string;
  statusLabel: string;
  monthlyPriceLabel: string;
  summary: string;
  projectLimit: number | null;
  assistantMessageLimit: number | null;
  features: string[];
}

export interface BillingUsageSummary {
  projectsUsed: number | null;
  projectLimit: number | null;
  assistantMessagesUsed: number | null;
  assistantMessageLimit: number | null;
}

export interface BillingRedirectResponse {
  url: string;
}

export const BILLING_API_CONTRACTS = {
  checkout: "POST /api/billing/checkout returns { url: string }",
  portal: "POST /api/billing/portal returns { url: string }",
} as const;

export const BILLING_PLAN_DETAILS: Record<BillingPlan, BillingPlanDetails> = {
  free: {
    plan: "free",
    label: "Free",
    statusLabel: "Self-hosted free",
    monthlyPriceLabel: "$0/mo",
    summary:
      "Run OpenDocs yourself while you evaluate the commercial hosted features.",
    projectLimit: 1,
    assistantMessageLimit: 250,
    features: ["Self-hosted docs", "One active project", "Community support"],
  },
  pro: {
    plan: "pro",
    label: "Pro",
    statusLabel: "Active",
    monthlyPriceLabel: "Managed in Stripe",
    summary:
      "Commercial plan for teams that want Namuh-hosted billing, support, and higher limits.",
    projectLimit: 5,
    assistantMessageLimit: 5000,
    features: [
      "More docs projects",
      "Higher assistant usage",
      "Priority support",
    ],
  },
  enterprise: {
    plan: "enterprise",
    label: "Enterprise",
    statusLabel: "Active",
    monthlyPriceLabel: "Custom",
    summary:
      "Custom commercial plan for self-hosted or Namuh-managed deployments with negotiated limits.",
    projectLimit: null,
    assistantMessageLimit: null,
    features: ["Custom limits", "Deployment support", "Commercial terms"],
  },
};

export function normalizeBillingPlan(plan: unknown): BillingPlan {
  return plan === "pro" || plan === "enterprise" ? plan : "free";
}

export function getBillingPlanDetails(plan: unknown): BillingPlanDetails {
  return BILLING_PLAN_DETAILS[normalizeBillingPlan(plan)];
}

export function calculateBillingUsagePercent(
  used: number | null,
  limit: number | null,
): number | null {
  if (used === null || limit === null) return null;
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function formatBillingLimit(limit: number | null, noun: string): string {
  if (limit === null) return `Unlimited ${noun}`;
  return `${limit.toLocaleString()} ${noun}`;
}

export function isBillingRedirectResponse(
  value: unknown,
): value is BillingRedirectResponse {
  if (!value || typeof value !== "object") return false;
  const url = (value as Record<string, unknown>).url;
  if (typeof url !== "string" || url.length === 0) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export async function readBillingApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown };
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  } catch {
    // Some placeholder API lanes may return an empty body or HTML 404.
  }

  if (response.status === 404) {
    return `${fallback} Billing API is not configured yet.`;
  }

  return fallback;
}

export async function createBillingRedirect(
  endpoint: "/api/billing/checkout" | "/api/billing/portal",
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const contract =
    endpoint === "/api/billing/checkout"
      ? BILLING_API_CONTRACTS.checkout
      : BILLING_API_CONTRACTS.portal;
  const fallback = `Expected ${contract}.`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return {
        ok: false,
        error: await readBillingApiError(response, fallback),
      };
    }

    const data = await response.json();
    if (!isBillingRedirectResponse(data)) {
      return {
        ok: false,
        error: `${fallback} The response did not include a valid redirect URL.`,
      };
    }

    return { ok: true, url: data.url };
  } catch {
    return {
      ok: false,
      error: `${fallback} Could not reach the billing API.`,
    };
  }
}
