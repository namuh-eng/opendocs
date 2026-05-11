import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const headersMock = vi.fn();
const getBillingOrgForUserMock = vi.fn();
const updateOrgBillingStateMock = vi.fn();
const applyStripeWebhookEventMock = vi.fn();
const getStripeClientMock = vi.fn();
const getStripePriceIdMock = vi.fn();
const getStripeAppUrlMock = vi.fn();
const getStripeWebhookSecretMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/stripe-billing", () => ({
  applyStripeWebhookEvent: applyStripeWebhookEventMock,
  canManageBilling: (role: string) => role === "admin",
  getBillingOrgForUser: getBillingOrgForUserMock,
  readBillingSettings: (settings: { billing?: Record<string, unknown> }) =>
    settings?.billing ?? {},
  updateOrgBillingState: updateOrgBillingStateMock,
}));

vi.mock("@/lib/stripe", () => ({
  getStripeAppUrl: getStripeAppUrlMock,
  getStripeClient: getStripeClientMock,
  getStripePriceId: getStripePriceIdMock,
  getStripeWebhookSecret: getStripeWebhookSecretMock,
}));

function mockUserSession() {
  getSessionMock.mockResolvedValue({
    user: { id: "user-1", email: "founder@example.com" },
  });
}

function mockOrg(settings: Record<string, unknown> = {}) {
  getBillingOrgForUserMock.mockResolvedValue({
    id: "org-1",
    name: "Acme Docs",
    slug: "acme",
    plan: "free",
    role: "admin",
    settings,
  });
}

describe("Stripe billing routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    headersMock.mockResolvedValue(new Headers());
    getStripePriceIdMock.mockReturnValue("price_1");
    getStripeAppUrlMock.mockReturnValue("http://localhost:3015");
    getStripeWebhookSecretMock.mockReturnValue("whsec_test");
  });

  it("requires authentication before creating checkout sessions", async () => {
    getSessionMock.mockResolvedValue(null);

    const { POST } = await import("@/app/api/billing/stripe/checkout/route");
    const response = await POST();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(getBillingOrgForUserMock).not.toHaveBeenCalled();
  });

  it("creates a Stripe customer and checkout session for org admins", async () => {
    mockUserSession();
    mockOrg({});
    const createCustomerMock = vi.fn().mockResolvedValue({ id: "cus_1" });
    const createCheckoutMock = vi.fn().mockResolvedValue({
      id: "cs_1",
      url: "https://checkout.stripe.test/cs_1",
    });
    getStripeClientMock.mockReturnValue({
      customers: { create: createCustomerMock },
      checkout: { sessions: { create: createCheckoutMock } },
    });

    const { POST } = await import("@/app/api/billing/stripe/checkout/route");
    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBe("https://checkout.stripe.test/cs_1");
    expect(createCustomerMock).toHaveBeenCalledWith({
      name: "Acme Docs",
      email: "founder@example.com",
      metadata: { orgId: "org-1", orgSlug: "acme", userId: "user-1" },
    });
    expect(updateOrgBillingStateMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "org-1" }),
      { stripeCustomerId: "cus_1" },
    );
    expect(createCheckoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_1",
        line_items: [{ price: "price_1", quantity: 1 }],
        client_reference_id: "org-1",
        success_url:
          "http://localhost:3015/settings?billing=success&session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "http://localhost:3015/settings?billing=cancelled",
        metadata: {
          orgId: "org-1",
          orgSlug: "acme",
          userId: "user-1",
          priceId: "price_1",
        },
      }),
    );
  });

  it("requires authentication before creating portal sessions", async () => {
    getSessionMock.mockResolvedValue(null);

    const { POST } = await import("@/app/api/billing/stripe/portal/route");
    const response = await POST();

    expect(response.status).toBe(401);
    expect(getBillingOrgForUserMock).not.toHaveBeenCalled();
  });

  it("creates a customer portal session for orgs with a Stripe customer id", async () => {
    mockUserSession();
    mockOrg({ billing: { stripeCustomerId: "cus_1" } });
    const createPortalMock = vi.fn().mockResolvedValue({
      id: "bps_1",
      url: "https://billing.stripe.test/session/bps_1",
    });
    getStripeClientMock.mockReturnValue({
      billingPortal: { sessions: { create: createPortalMock } },
    });

    const { POST } = await import("@/app/api/billing/stripe/portal/route");
    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBe("https://billing.stripe.test/session/bps_1");
    expect(createPortalMock).toHaveBeenCalledWith({
      customer: "cus_1",
      return_url: "http://localhost:3015/settings?billing=portal_return",
    });
  });

  it("keeps provider-neutral checkout and portal aliases available for the UI", async () => {
    const checkoutRoute = await import("@/app/api/billing/checkout/route");
    const stripeCheckoutRoute = await import(
      "@/app/api/billing/stripe/checkout/route"
    );
    const portalRoute = await import("@/app/api/billing/portal/route");
    const stripePortalRoute = await import(
      "@/app/api/billing/stripe/portal/route"
    );

    expect(checkoutRoute.POST).toBe(stripeCheckoutRoute.POST);
    expect(portalRoute.POST).toBe(stripePortalRoute.POST);
  });

  it("rejects webhooks without a Stripe signature", async () => {
    const { POST } = await import("@/app/api/billing/stripe/webhook/route");
    const response = await POST(
      new Request("http://localhost/api/billing/stripe/webhook", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(response.status).toBe(400);
    expect(getStripeClientMock).not.toHaveBeenCalled();
  });

  it("rejects webhooks when signature verification fails", async () => {
    getStripeClientMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => {
          throw new Error("No signatures found matching");
        }),
      },
    });

    const { POST } = await import("@/app/api/billing/stripe/webhook/route");
    const response = await POST(
      new Request("http://localhost/api/billing/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "bad" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid Stripe webhook signature",
    });
    expect(applyStripeWebhookEventMock).not.toHaveBeenCalled();
  });

  it("acknowledges verified unknown webhook events", async () => {
    const event = {
      id: "evt_1",
      type: "customer.created",
      data: { object: {} },
    };
    getStripeClientMock.mockReturnValue({
      webhooks: { constructEvent: vi.fn().mockReturnValue(event) },
    });
    applyStripeWebhookEventMock.mockResolvedValue({
      handled: false,
      mapped: false,
    });

    const { POST } = await import("@/app/api/billing/stripe/webhook/route");
    const response = await POST(
      new Request("http://localhost/api/billing/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "good" },
        body: "{}",
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      received: true,
      handled: false,
      mapped: false,
    });
    expect(applyStripeWebhookEventMock).toHaveBeenCalledWith(event);
  });
});
