import { DashboardHomeClient } from "@/app/dashboard/dashboard-home-client";
import { type ComponentProps, act } from "react";
import { createRoot } from "react-dom/client";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

beforeAll(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ topPages: [] }),
      }),
    ),
  );
});

type DashboardProps = ComponentProps<typeof DashboardHomeClient>;

const baseProps: DashboardProps = {
  greeting: "Good evening",
  firstName: "Ashley",
  project: {
    id: "project-1",
    name: "exponential",
    subdomain: "namuh-eng-exponential",
    status: "active",
    customDomain: null,
    repoUrl: "https://github.com/namuh-eng/exponential",
    repoBranch: "main",
    repoPath: "/",
  },
  deployments: [
    {
      id: "deployment-1",
      status: "succeeded",
      branch: "main",
      previewUrl: null,
      commitSha: null,
      commitMessage: "Initial deployment",
      startedAt: null,
      endedAt: null,
      createdAt: "2026-05-17T03:00:00.000Z",
    },
  ],
  previews: [],
  publishedPages: [
    { id: "page-1", path: "introduction", title: "Introduction" },
  ],
};

function renderDashboard(overrides: Partial<DashboardProps> = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<DashboardHomeClient {...baseProps} {...overrides} />);
  });

  return { container, root };
}

describe("Dashboard site preview", () => {
  it("embeds the live docs site instead of showing only the placeholder", () => {
    const { container, root } = renderDashboard();

    const iframe = container.querySelector<HTMLIFrameElement>(
      '[data-testid="dashboard-site-preview-frame"]',
    );

    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute("src")).toBe("/docs/namuh-eng-exponential");
    expect(iframe?.getAttribute("title")).toBe(
      "Live preview for exponential documentation",
    );
    expect(container.textContent).not.toContain("Site preview");

    act(() => root.unmount());
    container.remove();
  });
});
