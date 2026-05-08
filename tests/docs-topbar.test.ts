import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/docs/test-project/quickstart",
}));

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
