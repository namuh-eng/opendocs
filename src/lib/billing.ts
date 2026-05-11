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

export function isStripeBillingConfigured(env: BillingEnv = process.env) {
  return Boolean(env.STRIPE_SECRET_KEY?.trim());
}

export function resolveBillingPlanForPriceId(
  priceId: string | null | undefined,
  env: BillingEnv = process.env,
): BillingPlan {
  if (!priceId) return "free";
  if (env.STRIPE_ENTERPRISE_PRICE_ID === priceId) return "enterprise";
  if (env.STRIPE_PRO_PRICE_ID === priceId) return "pro";
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
