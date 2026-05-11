import { db } from "@/lib/db";
import { organizationBilling, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const BILLING_PLANS = ["free", "pro", "enterprise"] as const;
export const BILLING_STATUSES = [
  "free",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
] as const;

export type BillingPlan = (typeof BILLING_PLANS)[number];
export type BillingStatus = (typeof BILLING_STATUSES)[number];
export type OrganizationBillingRow = typeof organizationBilling.$inferSelect;

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

export type BillingStateInput = Partial<
  Pick<
    OrganizationBillingRow,
    | "orgId"
    | "ownerUserId"
    | "stripeCustomerId"
    | "stripeSubscriptionId"
    | "stripePriceId"
    | "plan"
    | "status"
    | "currentPeriodEnd"
    | "cancelAtPeriodEnd"
    | "canceledAt"
    | "trialEndsAt"
  >
> | null;

export type NormalizedBillingState = {
  orgId: string | null;
  ownerUserId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  plan: BillingPlan;
  status: BillingStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  trialEndsAt: Date | null;
};

export type BillingAccessDecision = {
  hasPaidAccess: boolean;
  canUsePaidFeatures: boolean;
  plan: BillingPlan;
  status: BillingStatus;
  reason:
    | "active_subscription"
    | "trial_subscription"
    | "development_billing_bypass"
    | "free_plan"
    | "expired_period"
    | "non_paid_status"
    | "missing_billing_state";
};

export type BillingEnv = Partial<
  Pick<
    NodeJS.ProcessEnv,
    | "NODE_ENV"
    | "STRIPE_SECRET_KEY"
    | "STRIPE_PRICE_ID"
    | "STRIPE_PRO_PRICE_ID"
    | "STRIPE_ENTERPRISE_PRICE_ID"
  >
>;

export type UpsertOrganizationBillingInput = {
  orgId: string;
  ownerUserId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  plan?: BillingPlan;
  status?: BillingStatus;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date | null;
  trialEndsAt?: Date | null;
};

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

const PAID_PLANS = new Set<BillingPlan>(["pro", "enterprise"]);
const ACCESS_STATUSES = new Set<BillingStatus>(["active", "trialing"]);

export function normalizeBillingPlan(plan: unknown): BillingPlan {
  return typeof plan === "string" && BILLING_PLANS.includes(plan as BillingPlan)
    ? (plan as BillingPlan)
    : "free";
}

export function normalizeBillingStatus(status: unknown): BillingStatus {
  return typeof status === "string" &&
    BILLING_STATUSES.includes(status as BillingStatus)
    ? (status as BillingStatus)
    : "free";
}

export function normalizeBillingState(
  state: BillingStateInput,
): NormalizedBillingState {
  return {
    orgId: state?.orgId ?? null,
    ownerUserId: state?.ownerUserId ?? null,
    stripeCustomerId: state?.stripeCustomerId ?? null,
    stripeSubscriptionId: state?.stripeSubscriptionId ?? null,
    stripePriceId: state?.stripePriceId ?? null,
    plan: normalizeBillingPlan(state?.plan),
    status: normalizeBillingStatus(state?.status),
    currentPeriodEnd: normalizeDate(state?.currentPeriodEnd),
    cancelAtPeriodEnd: state?.cancelAtPeriodEnd ?? false,
    canceledAt: normalizeDate(state?.canceledAt),
    trialEndsAt: normalizeDate(state?.trialEndsAt),
  };
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

export function isStripeBillingConfigured(env: BillingEnv = process.env) {
  return Boolean(env.STRIPE_SECRET_KEY?.trim());
}

export function resolveBillingPlanForPriceId(
  priceId: string | null | undefined,
  env: BillingEnv = process.env,
): BillingPlan {
  if (!priceId) return "free";
  if (env.STRIPE_ENTERPRISE_PRICE_ID === priceId) return "enterprise";
  if (env.STRIPE_PRO_PRICE_ID === priceId || env.STRIPE_PRICE_ID === priceId) {
    return "pro";
  }
  return "free";
}

export function getBillingAccessDecision(
  state: BillingStateInput,
  options: { env?: BillingEnv; now?: Date } = {},
): BillingAccessDecision {
  const normalized = normalizeBillingState(state);
  const now = options.now ?? new Date();
  const hasPaidPlan = PAID_PLANS.has(normalized.plan);

  if (!state) {
    const canUsePaidFeatures = shouldUseDevelopmentBillingBypass(options.env);
    return {
      hasPaidAccess: false,
      canUsePaidFeatures,
      plan: normalized.plan,
      status: normalized.status,
      reason: canUsePaidFeatures
        ? "development_billing_bypass"
        : "missing_billing_state",
    };
  }

  if (!hasPaidPlan) {
    const canUsePaidFeatures = shouldUseDevelopmentBillingBypass(options.env);
    return {
      hasPaidAccess: false,
      canUsePaidFeatures,
      plan: normalized.plan,
      status: normalized.status,
      reason: canUsePaidFeatures ? "development_billing_bypass" : "free_plan",
    };
  }

  if (!ACCESS_STATUSES.has(normalized.status)) {
    return {
      hasPaidAccess: false,
      canUsePaidFeatures: false,
      plan: normalized.plan,
      status: normalized.status,
      reason: "non_paid_status",
    };
  }

  const periodEnd =
    normalized.status === "trialing"
      ? (normalized.trialEndsAt ?? normalized.currentPeriodEnd)
      : normalized.currentPeriodEnd;

  if (periodEnd && periodEnd.getTime() <= now.getTime()) {
    return {
      hasPaidAccess: false,
      canUsePaidFeatures: false,
      plan: normalized.plan,
      status: normalized.status,
      reason: "expired_period",
    };
  }

  return {
    hasPaidAccess: true,
    canUsePaidFeatures: true,
    plan: normalized.plan,
    status: normalized.status,
    reason:
      normalized.status === "trialing"
        ? "trial_subscription"
        : "active_subscription",
  };
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

export async function readOrganizationBilling(orgId: string) {
  const [row] = await db
    .select()
    .from(organizationBilling)
    .where(eq(organizationBilling.orgId, orgId))
    .limit(1);

  return normalizeBillingState(row ?? null);
}

export async function readProjectBillingAccess(projectId: string) {
  const [row] = await db
    .select({ billing: organizationBilling })
    .from(projects)
    .leftJoin(
      organizationBilling,
      eq(organizationBilling.orgId, projects.orgId),
    )
    .where(eq(projects.id, projectId))
    .limit(1);

  return getBillingAccessDecision(row?.billing ?? null);
}

export async function upsertOrganizationBilling(
  input: UpsertOrganizationBillingInput,
) {
  const normalized = normalizeBillingState(input);
  const values: typeof organizationBilling.$inferInsert = {
    orgId: input.orgId,
    ownerUserId: normalized.ownerUserId,
    stripeCustomerId: normalized.stripeCustomerId,
    stripeSubscriptionId: normalized.stripeSubscriptionId,
    stripePriceId: normalized.stripePriceId,
    plan: normalized.plan,
    status: normalized.status,
    currentPeriodEnd: normalized.currentPeriodEnd,
    cancelAtPeriodEnd: normalized.cancelAtPeriodEnd,
    canceledAt: normalized.canceledAt,
    trialEndsAt: normalized.trialEndsAt,
  };

  const [row] = await db
    .insert(organizationBilling)
    .values(values)
    .onConflictDoUpdate({
      target: organizationBilling.orgId,
      set: {
        ownerUserId: values.ownerUserId,
        stripeCustomerId: values.stripeCustomerId,
        stripeSubscriptionId: values.stripeSubscriptionId,
        stripePriceId: values.stripePriceId,
        plan: values.plan,
        status: values.status,
        currentPeriodEnd: values.currentPeriodEnd,
        cancelAtPeriodEnd: values.cancelAtPeriodEnd,
        canceledAt: values.canceledAt,
        trialEndsAt: values.trialEndsAt,
        updatedAt: new Date(),
      },
    })
    .returning();

  return normalizeBillingState(row);
}

function shouldUseDevelopmentBillingBypass(env: BillingEnv = process.env) {
  return env.NODE_ENV !== "production" && !isStripeBillingConfigured(env);
}

function normalizeDate(value: Date | null | undefined) {
  if (!value) return null;
  return value;
}
