import {
  calculateBillingUsagePercent,
  createBillingRedirect,
  formatBillingLimit,
  getBillingAccessDecision,
  getBillingPlanDetails,
  isBillingRedirectResponse,
  isStripeBillingConfigured,
  normalizeBillingPlan,
  normalizeBillingState,
  normalizeBillingStatus,
  resolveBillingPlanForPriceId,
} from "@/lib/billing";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {},
}));

const now = new Date("2026-05-12T00:00:00.000Z");

describe("billing utilities", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes unknown plans to free", () => {
    expect(normalizeBillingPlan("pro")).toBe("pro");
    expect(normalizeBillingPlan("enterprise")).toBe("enterprise");
    expect(normalizeBillingPlan("starter")).toBe("free");
    expect(getBillingPlanDetails("starter").label).toBe("Free");
  });

  it("formats limits and usage percentages", () => {
    expect(formatBillingLimit(5, "projects")).toBe("5 projects");
    expect(formatBillingLimit(null, "projects")).toBe("Unlimited projects");
    expect(calculateBillingUsagePercent(2, 5)).toBe(40);
    expect(calculateBillingUsagePercent(9, 5)).toBe(100);
    expect(calculateBillingUsagePercent(null, 5)).toBeNull();
    expect(calculateBillingUsagePercent(5, null)).toBeNull();
    expect(calculateBillingUsagePercent(5, 0)).toBe(0);
  });

  it("validates billing redirect responses", () => {
    expect(
      isBillingRedirectResponse({ url: "https://checkout.stripe.com/c/test" }),
    ).toBe(true);
    expect(isBillingRedirectResponse({ url: "not a url" })).toBe(false);
    expect(isBillingRedirectResponse({})).toBe(false);
  });

  it("posts to the checkout endpoint and returns redirect URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://checkout.stripe.com/c/test" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createBillingRedirect("/api/billing/checkout"),
    ).resolves.toEqual({
      ok: true,
      url: "https://checkout.stripe.com/c/test",
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  });

  it("turns missing API routes into readable contract errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({}),
      }),
    );

    const result = await createBillingRedirect("/api/billing/portal");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("POST /api/billing/portal");
      expect(result.error).toContain("Billing API is not configured yet");
    }
  });
});

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
      STRIPE_PRICE_ID: "price_hosted_pro",
      STRIPE_PRO_PRICE_ID: "price_pro",
      STRIPE_ENTERPRISE_PRICE_ID: "price_enterprise",
    } as const;

    expect(resolveBillingPlanForPriceId("price_hosted_pro", env)).toBe("pro");
    expect(resolveBillingPlanForPriceId("price_pro", env)).toBe("pro");
    expect(resolveBillingPlanForPriceId("price_enterprise", env)).toBe(
      "enterprise",
    );
    expect(resolveBillingPlanForPriceId("price_unknown", env)).toBe("free");
  });
});
