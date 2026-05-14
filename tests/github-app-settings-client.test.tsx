import { GitHubAppSettingsClient } from "@/app/settings/deployment/github/github-app-client";
import { type ComponentProps, act } from "react";
import { createRoot } from "react-dom/client";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

function renderClient(
  installUrl: string | null,
  overrides: Partial<ComponentProps<typeof GitHubAppSettingsClient>> = {},
  path = "/settings/deployment/github",
) {
  window.history.replaceState({}, "", path);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <GitHubAppSettingsClient
        initialConnections={[]}
        isAdmin={true}
        installUrl={installUrl}
        {...overrides}
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
    expect(container.textContent).toContain("GitHub app setup required");
    expect(container.textContent).toContain(
      "will not send users to GitHub Marketplace",
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
    expect(container.textContent).toContain(
      "Connect GitHub to enable auto updates",
    );
    expect(container.textContent).toContain("Install");
    expect(container.textContent).toContain("Grant access");
    expect(container.textContent).toContain("Sync updates");
    expect(container.textContent).not.toContain(
      "GitHub App installed successfully",
    );

    act(() => root.unmount());
    container.remove();
  });

  it("explains repository access blockers with readable light-theme styles", () => {
    const { container, root } = renderClient(
      "https://github.com/apps/open-docs/installations/new",
      {
        selectedRepoFullName: "namuh-eng/opensend",
        selectedSource: {
          repoFullName: "namuh-eng/opensend",
          owner: "namuh-eng",
          repo: "opensend",
          branch: "main",
          path: "/",
          sourceType: "public_repo",
        },
      },
    );

    const status = container.querySelector(
      '[data-testid="github-selected-repo-status"]',
    );
    expect(status).toBeTruthy();
    expect(status?.className).toContain("text-amber-950");
    expect(status?.className).not.toContain("text-amber-200");
    expect(container.textContent).toContain("Repository access required");
    expect(container.textContent).toContain(
      "Auto updates are disabled because this repository is not included",
    );
    expect(container.textContent).toContain("Update GitHub app access");
    expect(container.textContent).toContain("Source type");
    expect(container.textContent).toContain("Public GitHub repo");
    expect(container.textContent).not.toContain("Selected repository");
    expect(container.textContent).not.toContain("before import");

    act(() => root.unmount());
    container.remove();
  });

  it("shows callback success and error guidance from the GitHub setup redirect", () => {
    const success = renderClient(
      "https://github.com/apps/open-docs/installations/new",
      {},
      "/settings/deployment/github?github_app=connected&installation_id=123",
    );
    expect(success.container.textContent).toContain("GitHub is connected");
    act(() => success.root.unmount());
    success.container.remove();

    const error = renderClient(
      "https://github.com/apps/open-docs/installations/new",
      {},
      "/settings/deployment/github?github_app=error&error=invalid_callback",
    );
    expect(error.container.textContent).toContain(
      "Start the install from this page instead of GitHub Marketplace",
    );
    act(() => error.root.unmount());
    error.container.remove();
  });
});
