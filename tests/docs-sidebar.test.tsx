import { DocsSidebar } from "@/components/docs/docs-sidebar";
import type { DocsNavEntry } from "@/lib/mdx-renderer";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";

// React 19 requires this flag for act() in non-testing-library environments.
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const nav: DocsNavEntry[] = [
  {
    type: "group",
    label: "Guides",
    items: [
      {
        type: "item",
        label: "Quickstart",
        path: "guides/quickstart",
        pageId: "page-1",
      },
    ],
  },
];

describe("DocsSidebar", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("labels sidebar group toggles and exposes expanded state", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <DocsSidebar
          nav={nav}
          activePath="introduction"
          subdomain="test-project"
          projectName="Test Project"
        />,
      );
    });

    const toggle = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Toggle Guides section"]',
    );

    expect(toggle).not.toBeNull();
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    expect(toggle?.getAttribute("aria-controls")).toBeTruthy();

    await act(async () => {
      toggle?.click();
    });

    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
  });
});

it("uses themeable currentColor for the default logo mark", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const html = renderToStaticMarkup(
    <DocsSidebar
      nav={nav}
      activePath="introduction"
      subdomain="test-project"
      projectName="Test Project"
    />,
  );

  expect(html).toContain('class="docs-logo-mark"');
  expect(html).toContain('fill="currentColor"');
  expect(html).toContain('stroke="currentColor"');
  expect(html).not.toContain("#16A34A");
});

it("uses configured docs logo image and link when provided", async () => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const html = renderToStaticMarkup(
    <DocsSidebar
      nav={nav}
      activePath="introduction"
      subdomain="test-project"
      projectName="Test Project"
      settings={{
        docsConfig: {
          visualBranding: { logoLink: "https://example.com" },
          headerTopbar: { logoPath: "/brand.svg" },
        },
      }}
    />,
  );

  expect(html).toContain('href="https://example.com"');
  expect(html).toContain('src="/brand.svg"');
  expect(html).toContain('class="docs-sidebar-logo-image"');
});
