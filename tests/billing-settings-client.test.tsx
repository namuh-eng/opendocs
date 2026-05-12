import { BillingSettingsClient } from "@/app/settings/organization/billing/billing-settings-client";
import { act } from "react";
import { createRoot } from "react-dom/client";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

beforeAll(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

function okJson(data: unknown) {
  return { ok: true, status: 200, json: async () => data };
}

function errorJson(status: number, data: unknown) {
  return { ok: false, status, json: async () => data };
}

async function renderBilling(
  fetchMock: ReturnType<typeof vi.fn>,
  redirectTo = vi.fn(),
) {
  vi.stubGlobal("fetch", fetchMock);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <BillingSettingsClient initialPlan="free" redirectTo={redirectTo} />,
    );
  });

  return { container, root, redirectTo };
}

describe("BillingSettingsClient", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders plan and usage from existing org/project/assistant endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okJson({ orgs: [{ plan: "pro" }] }))
      .mockResolvedValueOnce(okJson({ projects: [{ id: "p1" }, { id: "p2" }] }))
      .mockResolvedValueOnce(
        okJson({ usage: { messagesUsed: 125, messageLimit: 500 } }),
      );

    const { container, root } = await renderBilling(fetchMock);

    expect(container.textContent).toContain("Billing");
    expect(container.textContent).toContain("Hosted Pro");
    expect(container.textContent).toContain("$49/mo");
    expect(container.textContent).toContain("Active");
    expect(container.textContent).toContain("2");
    expect(container.textContent).toContain("125");
    expect(container.textContent).toContain("25% used");

    act(() => root.unmount());
    container.remove();
  });

  it("redirects to the checkout URL returned by the billing API", async () => {
    const redirectTo = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okJson({ orgs: [{ plan: "free" }] }))
      .mockResolvedValueOnce(okJson({ projects: [] }))
      .mockResolvedValueOnce(
        okJson({ usage: { messagesUsed: 0, messageLimit: 250 } }),
      )
      .mockResolvedValueOnce(
        okJson({ url: "https://checkout.stripe.com/c/test" }),
      );

    const { container, root } = await renderBilling(fetchMock, redirectTo);

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '[data-testid="billing-checkout-btn"]',
        )
        ?.click();
    });

    expect(fetchMock).toHaveBeenLastCalledWith("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect(redirectTo).toHaveBeenCalledWith(
      "https://checkout.stripe.com/c/test",
    );

    act(() => root.unmount());
    container.remove();
  });

  it("shows a readable error when the portal API is not merged yet", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okJson({ orgs: [{ plan: "free" }] }))
      .mockResolvedValueOnce(okJson({ projects: [] }))
      .mockResolvedValueOnce(
        okJson({ usage: { messagesUsed: 0, messageLimit: 250 } }),
      )
      .mockResolvedValueOnce(errorJson(404, {}));

    const { container, root } = await renderBilling(fetchMock);

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="billing-portal-btn"]')
        ?.click();
    });

    expect(container.textContent).toContain("POST /api/billing/portal");
    expect(container.textContent).toContain(
      "Billing API is not configured yet",
    );

    act(() => root.unmount());
    container.remove();
  });
});
