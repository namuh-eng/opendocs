import {
  getBillingAccessDecision,
  isStripeBillingConfigured,
  normalizeBillingPlan,
  normalizeBillingState,
  normalizeBillingStatus,
  resolveBillingPlanForPriceId,
} from "@/lib/billing";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {},
}));

const now = new Date("2026-05-12T00:00:00.000Z");

describe("billing state normalization", () => {
  it("defaults missing billing records to free state", () => {
    expect(normalizeBillingState(null)).toMatchObject({
      orgId: null,
      plan: "free",
      status: "free",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: false,
    });
  });

  it("normalizes invalid plan and status values to free", () => {
    expect(normalizeBillingPlan("gold")).toBe("free");
    expect(normalizeBillingStatus("paid")).toBe("free");
  });

  it("preserves Stripe identifiers without requiring Stripe credentials", () => {
    expect(
      normalizeBillingState({
        orgId: "org_123",
        ownerUserId: "user_123",
        stripeCustomerId: "cus_test",
        stripeSubscriptionId: "sub_test",
        stripePriceId: "price_test",
        plan: "pro",
        status: "active",
      }),
    ).toMatchObject({
      orgId: "org_123",
      ownerUserId: "user_123",
      stripeCustomerId: "cus_test",
      stripeSubscriptionId: "sub_test",
      stripePriceId: "price_test",
      plan: "pro",
      status: "active",
    });
  });
});

describe("billing access gating", () => {
  it("grants paid access for an active paid plan with a future period", () => {
    expect(
      getBillingAccessDecision(
        {
          plan: "pro",
          status: "active",
          currentPeriodEnd: new Date("2026-06-12T00:00:00.000Z"),
        },
        { env: { NODE_ENV: "production" }, now },
      ),
    ).toMatchObject({
      hasPaidAccess: true,
      canUsePaidFeatures: true,
      reason: "active_subscription",
    });
  });

  it("grants paid access for an unexpired trial", () => {
    expect(
      getBillingAccessDecision(
        {
          plan: "pro",
          status: "trialing",
          trialEndsAt: new Date("2026-05-19T00:00:00.000Z"),
        },
        { env: { NODE_ENV: "production" }, now },
      ),
    ).toMatchObject({
      hasPaidAccess: true,
      canUsePaidFeatures: true,
      reason: "trial_subscription",
    });
  });

  it("fails closed for past due, canceled, and expired paid subscriptions", () => {
    const env = {
      NODE_ENV: "production",
      STRIPE_SECRET_KEY: "stripe-secret-present",
    } as const;

    expect(
      getBillingAccessDecision(
        { plan: "pro", status: "past_due" },
        { env, now },
      ).canUsePaidFeatures,
    ).toBe(false);
    expect(
      getBillingAccessDecision(
        { plan: "pro", status: "canceled" },
        { env, now },
      ).canUsePaidFeatures,
    ).toBe(false);
    expect(
      getBillingAccessDecision(
        {
          plan: "pro",
          status: "active",
          currentPeriodEnd: new Date("2026-05-01T00:00:00.000Z"),
        },
        { env, now },
      ),
    ).toMatchObject({
      hasPaidAccess: false,
      canUsePaidFeatures: false,
      reason: "expired_period",
    });
  });

  it("allows local development to keep running without Stripe env", () => {
    expect(
      getBillingAccessDecision(null, {
        env: { NODE_ENV: "development" },
        now,
      }),
    ).toMatchObject({
      hasPaidAccess: false,
      canUsePaidFeatures: true,
      reason: "development_billing_bypass",
    });
  });

  it("fails closed in production without Stripe env or billing state", () => {
    expect(
      getBillingAccessDecision(null, {
        env: { NODE_ENV: "production" },
        now,
      }),
    ).toMatchObject({
      hasPaidAccess: false,
      canUsePaidFeatures: false,
      reason: "missing_billing_state",
    });
  });
});

describe("Stripe billing configuration", () => {
  it("detects Stripe configuration from variable presence only", () => {
    expect(isStripeBillingConfigured({ NODE_ENV: "production" })).toBe(false);
    expect(
      isStripeBillingConfigured({
        NODE_ENV: "production",
        STRIPE_SECRET_KEY: "stripe-secret-present",
      }),
    ).toBe(true);
  });

  it("maps configured Stripe price ids to plans", () => {
    const env = {
      NODE_ENV: "production",
      STRIPE_PRO_PRICE_ID: "price_pro",
      STRIPE_ENTERPRISE_PRICE_ID: "price_enterprise",
    } as const;

    expect(resolveBillingPlanForPriceId("price_pro", env)).toBe("pro");
    expect(resolveBillingPlanForPriceId("price_enterprise", env)).toBe(
      "enterprise",
    );
    expect(resolveBillingPlanForPriceId("price_unknown", env)).toBe("free");
  });
});
