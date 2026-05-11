import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.fn();
const updateMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
}));

function mockSelectRows(rows: Array<Record<string, unknown>>) {
  selectMock.mockReturnValueOnce({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  });
}

function mockUpdate() {
  const whereMock = vi.fn().mockResolvedValue(undefined);
  const setMock = vi.fn().mockReturnValue({ where: whereMock });
  updateMock.mockReturnValueOnce({ set: setMock });
  return { setMock, whereMock };
}

describe("stripe billing helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("merges billing settings without losing existing org settings", async () => {
    const { mergeBillingSettings } = await import("@/lib/stripe-billing");

    expect(
      mergeBillingSettings(
        { theme: "dark", billing: { stripeCustomerId: "cus_1" } },
        { stripeSubscriptionId: "sub_1" },
      ),
    ).toMatchObject({
      theme: "dark",
      billing: {
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: "sub_1",
        stripeLastUpdatedAt: expect.any(String),
      },
    });
  });

  it("maps completed checkout sessions back to org metadata", async () => {
    mockSelectRows([{ id: "org-1", settings: { existing: true } }]);
    const { setMock } = mockUpdate();

    const { applyStripeWebhookEvent } = await import("@/lib/stripe-billing");
    const result = await applyStripeWebhookEvent({
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_1",
          subscription: "sub_1",
          metadata: {
            orgId: "org-1",
            priceId: "price_1",
          },
        },
      },
    } as never);

    expect(result).toEqual({ handled: true, mapped: true });
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "pro",
        settings: expect.objectContaining({
          existing: true,
          billing: expect.objectContaining({
            stripeCustomerId: "cus_1",
            stripeSubscriptionId: "sub_1",
            stripeSubscriptionStatus: "checkout_completed",
            stripePriceId: "price_1",
            stripeLastEventId: "evt_1",
          }),
        }),
        updatedAt: expect.any(Date),
      }),
    );
  });

  it("maps subscription updates through the stored Stripe customer id", async () => {
    mockSelectRows([
      {
        id: "org-1",
        plan: "free",
        settings: { billing: { stripeCustomerId: "cus_1" } },
      },
    ]);
    const { setMock } = mockUpdate();

    const { applyStripeWebhookEvent } = await import("@/lib/stripe-billing");
    const result = await applyStripeWebhookEvent({
      id: "evt_2",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          customer: "cus_1",
          status: "active",
          current_period_end: 1_799_856_000,
          items: {
            data: [
              { current_period_end: 1_799_856_000, price: { id: "price_1" } },
            ],
          },
        },
      },
    } as never);

    expect(result).toEqual({ handled: true, mapped: true });
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: "pro",
        settings: expect.objectContaining({
          billing: expect.objectContaining({
            stripeCustomerId: "cus_1",
            stripeSubscriptionId: "sub_1",
            stripeSubscriptionStatus: "active",
            stripePriceId: "price_1",
            stripeCurrentPeriodEnd: "2027-01-13T16:00:00.000Z",
          }),
        }),
      }),
    );
  });

  it("acknowledges unknown events without database writes", async () => {
    const { applyStripeWebhookEvent } = await import("@/lib/stripe-billing");

    await expect(
      applyStripeWebhookEvent({
        id: "evt_3",
        type: "customer.created",
        data: { object: {} },
      } as never),
    ).resolves.toEqual({ handled: false, mapped: false });
    expect(updateMock).not.toHaveBeenCalled();
  });
});
