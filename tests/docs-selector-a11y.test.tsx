import { LanguageSwitcher } from "@/components/docs/language-switcher";
import { VersionSwitcher } from "@/components/docs/version-switcher";
import type { VersionsConfig } from "@/lib/versions";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

// React 19 requires this flag for act() in non-testing-library environments.
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("docs selector accessibility", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockClear();
    document.body.innerHTML = "";
  });

  it("labels the version selector and version options", async () => {
    const versionsConfig: VersionsConfig = {
      enabled: true,
      versions: [
        { tag: "v1", name: "Version 1.0", isDefault: false },
        { tag: "v2", name: "Version 2.0", isDefault: true },
      ],
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <VersionSwitcher
          currentVersion="v2"
          availableVersions={["v1", "v2"]}
          versionsConfig={versionsConfig}
          subdomain="test-project"
          pagePath="introduction"
        />,
      );
    });

    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-testid="version-switcher-btn"]',
    );

    expect(trigger?.getAttribute("aria-label")).toBe(
      "Select docs version, current version Version 2.0",
    );
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");

    await act(async () => {
      trigger?.click();
    });

    const dropdown = container.querySelector<HTMLElement>(
      '[data-testid="version-switcher-dropdown"]',
    );
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(trigger?.getAttribute("aria-controls")).toBe(dropdown?.id);
    expect(
      container
        .querySelector('[data-testid="version-option-v1"]')
        ?.getAttribute("aria-label"),
    ).toBe("Switch to docs version Version 1.0");
    expect(
      container
        .querySelector('[data-testid="version-option-v2"]')
        ?.getAttribute("aria-label"),
    ).toBe("Switch to docs version Version 2.0 (default)");

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });

    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(trigger?.hasAttribute("aria-controls")).toBe(false);
    expect(
      container.querySelector('[data-testid="version-switcher-dropdown"]'),
    ).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("labels the language selector and language options", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <LanguageSwitcher
          currentLocale="en"
          availableLocales={["en", "ko"]}
          subdomain="test-project"
          pagePath="introduction"
          defaultLanguage="en"
        />,
      );
    });

    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-testid="language-switcher-btn"]',
    );

    expect(trigger?.getAttribute("aria-label")).toBe(
      "Select docs language, current language English",
    );
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");

    await act(async () => {
      trigger?.click();
    });

    const dropdown = container.querySelector<HTMLElement>(
      '[data-testid="language-switcher-dropdown"]',
    );
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(trigger?.getAttribute("aria-controls")).toBe(dropdown?.id);
    expect(
      container
        .querySelector('[data-testid="lang-option-en"]')
        ?.getAttribute("aria-label"),
    ).toBe("Switch to English");
    expect(
      container
        .querySelector('[data-testid="lang-option-ko"]')
        ?.getAttribute("aria-label"),
    ).toBe("Switch to Korean");

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });

    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(trigger?.hasAttribute("aria-controls")).toBe(false);
    expect(
      container.querySelector('[data-testid="language-switcher-dropdown"]'),
    ).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
