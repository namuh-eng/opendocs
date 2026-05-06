import { PageHeaderActions } from "@/components/docs/page-chrome";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// React 19 requires this flag for act() in non-testing-library environments.
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("PageHeaderActions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("shows visible copied feedback after copying page markdown", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <PageHeaderActions
          title="Introduction"
          content="Welcome to the docs."
          pageUrl="/docs/test-project/introduction.md"
        />,
      );
    });

    const copyButton = container.querySelector<HTMLButtonElement>(
      '[data-testid="copy-page-btn"]',
    );

    expect(copyButton?.textContent).not.toContain("Copied");

    await act(async () => {
      copyButton?.click();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "# Introduction\n\nWelcome to the docs.",
    );
    expect(copyButton?.textContent).toContain("Copied");
    expect(copyButton?.getAttribute("aria-label")).toBe("Copied page markdown");
  });
});
