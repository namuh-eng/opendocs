import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

function renderEmptyState() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <AnalyticsEmptyState
        title="No data yet"
        description="Share your docs URL to start collecting analytics."
        ctaLabel="Share your docs URL"
        ctaHref="/settings"
      />,
    );
  });

  return { container, root };
}

describe("AnalyticsEmptyState", () => {
  it("uses dark analytics styles instead of theme CSS variables", () => {
    const { container, root } = renderEmptyState();

    const emptyState = container.querySelector(
      '[data-testid="analytics-empty-state"]',
    );
    const title = container.querySelector("h3");
    const cta = container.querySelector(
      '[data-testid="analytics-empty-state-cta"]',
    );

    expect(emptyState?.textContent).toContain("No data yet");
    expect(title?.className).toContain("text-white");
    expect(title?.className).not.toContain("var(--od-text)");
    expect(cta?.getAttribute("href")).toBe("/settings");
    expect(cta?.className).toContain("bg-emerald-600");

    act(() => root.unmount());
    container.remove();
  });
});
