import {
  getStripeAppUrl,
  getStripePriceId,
  getStripeSecretKey,
  getStripeWebhookSecret,
} from "@/lib/stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Stripe config", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("validates the secret key only when requested", () => {
    expect(() => getStripeSecretKey()).toThrow(
      "Missing required Stripe environment variable: STRIPE_SECRET_KEY",
    );

    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    expect(getStripeSecretKey()).toBe("sk_test_123");
  });

  it("validates webhook secret and price id independently", () => {
    expect(() => getStripeWebhookSecret()).toThrow(
      "Missing required Stripe environment variable: STRIPE_WEBHOOK_SECRET",
    );
    expect(() => getStripePriceId()).toThrow(
      "Missing required Stripe environment variable: STRIPE_PRICE_ID",
    );

    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_123");
    vi.stubEnv("STRIPE_PRICE_ID", "price_123");

    expect(getStripeWebhookSecret()).toBe("whsec_123");
    expect(getStripePriceId()).toBe("price_123");
  });

  it("uses the existing app URL helper for Stripe redirects", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://opendocs.example.com///");
    expect(getStripeAppUrl()).toBe("https://opendocs.example.com");
  });
});
