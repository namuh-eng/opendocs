import {
  calculateBillingUsagePercent,
  createBillingRedirect,
  formatBillingLimit,
  getBillingPlanDetails,
  isBillingRedirectResponse,
  normalizeBillingPlan,
} from "@/lib/billing";
import { afterEach, describe, expect, it, vi } from "vitest";

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
