import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { updateProjectMock } = vi.hoisted(() => ({
  updateProjectMock: vi.fn(),
}));

vi.mock("@/hooks/use-project-updater", () => ({
  useProjectUpdater: () => ({
    saving: false,
    updateProject: updateProjectMock,
  }),
}));

// React 19 requires this flag for act() in non-testing-library environments.
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("ConfigsPanel", () => {
  let container: HTMLElement;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        project: {
          settings: {
            docsConfig: {
              assistantSearch: {
                assistantEnabled: true,
                searchEnabled: true,
                searchPrompt: "Ask anything...",
              },
            },
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    updateProjectMock.mockReset();
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.unstubAllGlobals();
  });

  it("centers toggle knobs and treats the default search prompt as placeholder text", async () => {
    const { ConfigsPanel } = await import("@/components/editor/configs-panel");
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(ConfigsPanel, { projectId: "project-1" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    const assistantSectionTrigger = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button"),
    ).find((button) => button.textContent?.includes("Assistant & Search"));

    await act(async () => {
      assistantSectionTrigger?.click();
      await Promise.resolve();
    });

    const assistantToggle = container.querySelector<HTMLButtonElement>(
      '[data-testid="config-assistant-enabled"]',
    );
    const searchPrompt = container.querySelector<HTMLInputElement>(
      '[data-testid="config-search-prompt"]',
    );
    const knobClass = assistantToggle?.firstElementChild?.getAttribute("class");

    expect(knobClass).toContain("left-0.5");
    expect(knobClass).toContain("translate-x-[14px]");
    expect(searchPrompt?.value).toBe("");
    expect(searchPrompt?.placeholder).toBe("Ask anything...");

    await act(async () => {
      root.unmount();
    });
  });
});
