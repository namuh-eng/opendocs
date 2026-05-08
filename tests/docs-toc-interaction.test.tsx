import { DocsToc } from "@/components/docs/docs-toc";
import type { TocEntry } from "@/lib/editor";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// React 19 requires this flag for act() in non-testing-library environments.
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;

let latestObserverCallback: ObserverCallback | null = null;

class MockIntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds = [];

  constructor(callback: ObserverCallback) {
    latestObserverCallback = callback;
  }

  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords = vi.fn(() => []);
  unobserve = vi.fn();
}

const tocEntries: TocEntry[] = [
  { level: 2, text: "Create a project", id: "create-a-project" },
  { level: 2, text: "Install the SDK", id: "install-the-sdk" },
  { level: 2, text: "Make your first request", id: "make-your-first-request" },
];

describe("DocsToc interactions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    latestObserverCallback = null;
    document.body.innerHTML = `
      <h2 id="create-a-project">Create a project</h2>
      <h2 id="install-the-sdk">Install the SDK</h2>
      <h2 id="make-your-first-request">Make your first request</h2>
      <div id="toc-root"></div>
    `;
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    Element.prototype.scrollIntoView = vi.fn();
    window.history.replaceState(null, "", "/docs/test-project/quickstart");
  });

  it("keeps the clicked ToC entry active while smooth scrolling settles", async () => {
    const container = document.getElementById("toc-root");
    if (!container) throw new Error("missing test container");
    const root = createRoot(container);

    await act(async () => {
      root.render(<DocsToc entries={tocEntries} />);
    });

    const createLink = container.querySelector<HTMLAnchorElement>(
      'a[href="#create-a-project"]',
    );
    const installLink = container.querySelector<HTMLAnchorElement>(
      'a[href="#install-the-sdk"]',
    );
    if (!createLink || !installLink) throw new Error("missing ToC links");

    await act(async () => {
      installLink.click();
    });

    expect(window.location.hash).toBe("#install-the-sdk");
    expect(installLink.className).toContain("active");

    const createHeading = document.getElementById("create-a-project");
    if (!createHeading) throw new Error("missing create heading");

    await act(async () => {
      latestObserverCallback?.([
        {
          isIntersecting: true,
          target: createHeading,
        } as unknown as IntersectionObserverEntry,
      ]);
    });

    expect(installLink.className).toContain("active");
    expect(createLink.className).not.toContain("active");

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });
  });
});
