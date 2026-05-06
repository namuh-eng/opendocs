import { LanguageSwitcher } from "@/components/docs/language-switcher";
import { VersionSwitcher } from "@/components/docs/version-switcher";
import type { VersionsConfig } from "@/lib/versions";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const versionsConfig: VersionsConfig = {
  enabled: true,
  versions: [
    { tag: "v2", name: "Version 2.0", isDefault: true },
    { tag: "v1", name: "Version 1.0", isDefault: false },
  ],
};

describe("docs version and language selectors", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("labels the version selector trigger and options", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <VersionSwitcher
          currentVersion="v2"
          availableVersions={["v2", "v1"]}
          versionsConfig={versionsConfig}
          subdomain="test-project"
          pagePath="introduction"
        />,
      );
    });

    const trigger = container.querySelector<HTMLButtonElement>(
      '[data-testid="version-switcher-btn"]',
    );
    expect(trigger?.getAttribute("aria-label")).toBe("Select docs version");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");

    await act(async () => {
      trigger?.click();
    });

    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(
      container
        .querySelector<HTMLButtonElement>('[data-testid="version-option-v2"]')
        ?.getAttribute("aria-label"),
    ).toBe("Select docs version Version 2.0 (default)");
  });

  it("labels the language selector trigger and options", async () => {
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
    expect(trigger?.getAttribute("aria-label")).toBe("Select docs language");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");

    await act(async () => {
      trigger?.click();
    });

    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(
      container
        .querySelector<HTMLButtonElement>('[data-testid="lang-option-en"]')
        ?.getAttribute("aria-label"),
    ).toBe("Select docs language English");
  });
});
