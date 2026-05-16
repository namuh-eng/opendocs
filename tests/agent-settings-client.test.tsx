import { AgentSettingsClient } from "@/app/products/agent/agent-settings-client";
import { type ComponentProps, act } from "react";
import { createRoot } from "react-dom/client";
import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const defaultSettings: ComponentProps<
  typeof AgentSettingsClient
>["initialSettings"] = {
  agentEnabled: true,
  slackConnected: false,
  slackWorkspace: null,
  githubAppInstalled: false,
  connectedRepos: [],
};

function renderClient(
  overrides: Partial<ComponentProps<typeof AgentSettingsClient>> = {},
) {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: false,
  } as Response);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <AgentSettingsClient
        initialPlan="pro"
        initialSettings={defaultSettings}
        {...overrides}
      />,
    );
  });

  return { container, root, fetchMock };
}

describe("AgentSettingsClient", () => {
  it("links GitHub app actions to the real settings page instead of the missing docs page", () => {
    const { container, root, fetchMock } = renderClient();

    expect(
      container
        .querySelector('[data-testid="configure-github-link"]')
        ?.getAttribute("href"),
    ).toBe("/settings/deployment/github");
    expect(
      container
        .querySelector('[data-testid="install-github-btn"]')
        ?.getAttribute("href"),
    ).toBe("/settings/deployment/github");

    act(() => root.unmount());
    container.remove();
    fetchMock.mockRestore();
  });
});
