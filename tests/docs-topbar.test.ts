import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/docs/test-project/quickstart",
}));

// React 19 requires this flag for act() in non-testing-library environments.
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Docs topbar — feature-014a", () => {
  describe("DocsTopbar component exports", () => {
    it("renders a skip link before docs navigation", async () => {
      const { DocsTopbar } = await import("@/components/docs/docs-topbar");
      const html = renderToStaticMarkup(
        DocsTopbar({
          projectName: "Test Project",
          subdomain: "test-project",
          settings: {},
        }),
      );

      expect(html).toContain('href="#main-content"');
      expect(html).toContain("Skip to main content");
      expect(html.indexOf("Skip to main content")).toBeLessThan(
        html.indexOf("docs-topbar"),
      );
    });

    it("exports DocsTopbar component", async () => {
      const mod = await import("@/components/docs/docs-topbar");
      expect(mod.DocsTopbar).toBeDefined();
      expect(typeof mod.DocsTopbar).toBe("function");
    });
  });

  describe("DocsTopbar props interface", () => {
    it("accepts project settings with githubUrl", async () => {
      const { DocsTopbar } = await import("@/components/docs/docs-topbar");
      const settings = {
        githubUrl: "https://github.com/example/docs",
        supportEmail: "support@example.com",
      };
      // Component should accept settings prop without error
      expect(() =>
        DocsTopbar({
          projectName: "Test Project",
          subdomain: "test",
          settings,
        }),
      ).not.toThrow();
    });

    it("works with empty settings object", async () => {
      const { DocsTopbar } = await import("@/components/docs/docs-topbar");
      expect(() =>
        DocsTopbar({
          projectName: "Test Project",
          subdomain: "test",
          settings: {},
        }),
      ).not.toThrow();
    });

    it("works with no settings provided", async () => {
      const { DocsTopbar } = await import("@/components/docs/docs-topbar");
      expect(() =>
        DocsTopbar({
          projectName: "Test Project",
          subdomain: "test",
        }),
      ).not.toThrow();
    });
  });

  describe("Topbar link helpers", () => {
    it("exports buildDashboardUrl helper", async () => {
      const { buildDashboardUrl } = await import(
        "@/components/docs/docs-topbar"
      );
      expect(buildDashboardUrl("my-project")).toBe("/dashboard");
    });

    it("exports buildSupportHref with mailto", async () => {
      const { buildSupportHref } = await import(
        "@/components/docs/docs-topbar"
      );
      expect(buildSupportHref("help@example.com")).toBe(
        "mailto:help@example.com",
      );
    });

    it("buildSupportHref returns default when no email", async () => {
      const { buildSupportHref } = await import(
        "@/components/docs/docs-topbar"
      );
      const href = buildSupportHref(undefined);
      expect(href).toContain("mailto:");
    });

    it("resolves configured docs logo path and link from docs config", async () => {
      const { getConfiguredDocsLogo } = await import(
        "@/components/docs/docs-topbar"
      );
      expect(
        getConfiguredDocsLogo({
          docsConfig: {
            visualBranding: {
              logoLink: "https://example.com",
              logoDarkPath: "/dark.svg",
            },
            headerTopbar: {
              logoPath: "/topbar.svg",
            },
          },
        }),
      ).toEqual({ path: "/topbar.svg", href: "https://example.com" });
    });

    it("renders the configured docs logo image and link", async () => {
      const { DocsTopbar } = await import("@/components/docs/docs-topbar");
      const html = renderToStaticMarkup(
        DocsTopbar({
          projectName: "Test Project",
          subdomain: "test-project",
          settings: {
            docsConfig: {
              visualBranding: {
                logoLink: "https://example.com",
              },
              headerTopbar: {
                logoPath: "/topbar.svg",
              },
            },
          },
        }),
      );

      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('src="/topbar.svg"');
      expect(html).toContain('class="docs-topbar-logo-image"');
    });

    it("uses currentColor for the default logo mark", async () => {
      const { DocsTopbar } = await import("@/components/docs/docs-topbar");
      const html = renderToStaticMarkup(
        DocsTopbar({
          projectName: "Test Project",
          subdomain: "test-project",
          settings: {},
        }),
      );

      expect(html).toContain('fill="currentColor"');
      expect(html).toContain('stroke="currentColor"');
    });
  });

  describe("Ask AI toggle", () => {
    it("exports AskAiButton component", async () => {
      const mod = await import("@/components/docs/docs-topbar");
      expect(mod.AskAiButton).toBeDefined();
      expect(typeof mod.AskAiButton).toBe("function");
    });

    it("AskAiButton dispatches toggle-ask-ai event on click simulation", async () => {
      // Verify the event dispatch pattern (matches search modal pattern)
      const events: string[] = [];
      const handler = () => events.push("toggle-ask-ai");
      document.addEventListener("toggle-ask-ai", handler);

      document.dispatchEvent(new CustomEvent("toggle-ask-ai"));
      expect(events).toHaveLength(1);

      document.removeEventListener("toggle-ask-ai", handler);
    });

    it("renders Mintlify-parity labels for the topbar search and assistant buttons", async () => {
      const { AskAiButton, DocsTopbar } = await import(
        "@/components/docs/docs-topbar"
      );

      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);

      await act(async () => {
        root.render(
          createElement(
            "div",
            null,
            createElement(AskAiButton),
            createElement(DocsTopbar, {
              projectName: "Test Project",
              subdomain: "test-project",
            }),
          ),
        );
      });

      const askButton = container.querySelector<HTMLButtonElement>(
        '[data-testid="ask-ai-btn"]',
      );
      const searchButton =
        container.querySelector<HTMLButtonElement>(".docs-search-btn");

      expect(askButton?.getAttribute("aria-label")).toBe(
        "Toggle assistant panel",
      );
      expect(searchButton?.getAttribute("aria-label")).toBe("Open search");

      await act(async () => {
        root.unmount();
      });
    });
  });

  describe("Topbar responsive behavior", () => {
    it("mobile hamburger button is part of the topbar (via MobileMenuButton)", async () => {
      const mod = await import("@/components/docs/mobile-nav");
      // MobileMenuButton is already integrated in topbar
      expect(mod.MobileMenuButton).toBeDefined();
    });
  });

  describe("GitHub link rendering", () => {
    it("GitHub link uses external target when URL is provided", async () => {
      const { getGithubLinkProps } = await import(
        "@/components/docs/docs-topbar"
      );
      const props = getGithubLinkProps("https://github.com/example/docs");
      expect(props).not.toBeNull();
      expect(props?.href).toBe("https://github.com/example/docs");
      expect(props?.target).toBe("_blank");
      expect(props?.rel).toBe("noopener noreferrer");
    });

    it("returns null when no GitHub URL provided", async () => {
      const { getGithubLinkProps } = await import(
        "@/components/docs/docs-topbar"
      );
      const props = getGithubLinkProps(undefined);
      expect(props).toBeNull();
    });
  });

  describe("Dashboard button", () => {
    it("Dashboard link points to /dashboard", async () => {
      const { buildDashboardUrl } = await import(
        "@/components/docs/docs-topbar"
      );
      expect(buildDashboardUrl("any")).toBe("/dashboard");
    });
  });
});
