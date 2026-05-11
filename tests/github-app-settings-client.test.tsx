import { GitHubAppSettingsClient } from "@/app/settings/deployment/github/github-app-client";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

function renderClient(installUrl: string | null) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <GitHubAppSettingsClient
        initialConnections={[]}
        isAdmin={true}
        installUrl={installUrl}
      />,
    );
  });

  return { container, root };
}

describe("GitHubAppSettingsClient", () => {
  it("does not create a fake connection when the GitHub App install URL is missing", () => {
    const { container, root } = renderClient(null);
    const installButton = container.querySelector(
      '[data-testid="install-github-app-btn"]',
    );
    expect(installButton).toBeTruthy();

    act(() => {
      installButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain(
      "GitHub App installation is not configured",
    );
    expect(container.textContent).not.toContain(
      "GitHub App installed successfully",
    );
    expect(container.textContent).not.toContain("Active connections");

    act(() => root.unmount());
    container.remove();
  });

  it("keeps the install action available when a GitHub App install URL is configured", () => {
    const { container, root } = renderClient(
      "https://github.com/apps/open-docs/installations/new",
    );

    expect(
      container.querySelector('[data-testid="install-github-app-btn"]'),
    ).toBeTruthy();
    expect(container.textContent).not.toContain(
      "GitHub App installed successfully",
    );

    act(() => root.unmount());
    container.remove();
  });
});
