import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/docs/test-project/quickstart",
}));

// React 19 requires this flag for act() in non-testing-library environments.
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("Docs site layout — feature-014", () => {
  describe("ThemeProvider", () => {
    it("defaults to dark theme", async () => {
      const { getThemeFromStorage } = await import(
        "@/components/docs/theme-provider"
      );
      // localStorage empty → should default to "dark"
      expect(getThemeFromStorage()).toBe("dark");
    });

    it("persists theme choice to localStorage", async () => {
      const { setThemeInStorage, getThemeFromStorage } = await import(
        "@/components/docs/theme-provider"
      );
      setThemeInStorage("light");
      expect(getThemeFromStorage()).toBe("light");
      setThemeInStorage("dark");
      expect(getThemeFromStorage()).toBe("dark");
    });

    it("validates theme values (rejects invalid values)", async () => {
      const { getThemeFromStorage } = await import(
        "@/components/docs/theme-provider"
      );
      localStorage.setItem("docs-theme", "invalid-value");
      expect(getThemeFromStorage()).toBe("dark");
    });
  });

  describe("SearchModal", () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement("div");
      document.body.appendChild(container);
      localStorage.removeItem("docs-recent-searches");
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it("exports SearchModal component", async () => {
      const mod = await import("@/components/docs/search-modal");
      expect(mod.SearchModal).toBeDefined();
      expect(typeof mod.SearchModal).toBe("function");
    });

    it("opens on Cmd+K / Ctrl+K keyboard shortcut", async () => {
      const { handleSearchShortcut } = await import(
        "@/components/docs/search-modal"
      );
      // Simulate Cmd+K
      const event = new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        bubbles: true,
      });
      const result = handleSearchShortcut(event);
      expect(result).toBe(true); // should signal to open modal
    });

    it("does NOT open on just K key without modifier", async () => {
      const { handleSearchShortcut } = await import(
        "@/components/docs/search-modal"
      );
      const event = new KeyboardEvent("keydown", {
        key: "k",
        metaKey: false,
        ctrlKey: false,
        bubbles: true,
      });
      const result = handleSearchShortcut(event);
      expect(result).toBe(false);
    });

    it("filters pages by search query", async () => {
      const { filterPages } = await import("@/components/docs/search-modal");
      const pages = [
        { path: "quickstart", title: "Quickstart" },
        { path: "essentials/markdown", title: "Markdown Basics" },
        { path: "essentials/code", title: "Code Blocks" },
        { path: "api-reference/intro", title: "API Reference" },
      ];
      const results = filterPages(pages, "markdown");
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Markdown Basics");
    });

    it("returns all pages on empty query", async () => {
      const { filterPages } = await import("@/components/docs/search-modal");
      const pages = [
        { path: "quickstart", title: "Quickstart" },
        { path: "essentials/markdown", title: "Markdown Basics" },
      ];
      const results = filterPages(pages, "");
      expect(results).toHaveLength(2);
    });

    it("search is case-insensitive", async () => {
      const { filterPages } = await import("@/components/docs/search-modal");
      const pages = [{ path: "quickstart", title: "Quickstart Guide" }];
      expect(filterPages(pages, "QUICK")).toHaveLength(1);
      expect(filterPages(pages, "quick")).toHaveLength(1);
    });

    it("renders search dialog with combobox and listbox semantics", async () => {
      const { SearchModal } = await import("@/components/docs/search-modal");
      const root = createRoot(container);

      await act(async () => {
        root.render(
          createElement(SearchModal, {
            subdomain: "test-project",
            pages: [
              { path: "introduction", title: "Introduction" },
              { path: "quickstart", title: "Quickstart" },
            ],
          }),
        );
      });

      await act(async () => {
        document.dispatchEvent(new CustomEvent("open-search"));
      });

      const input = container.querySelector<HTMLInputElement>(
        '[data-testid="search-input"]',
      );
      const results = container.querySelector<HTMLElement>(
        '[data-testid="search-results"]',
      );
      const firstOption =
        container.querySelector<HTMLElement>('[role="option"]');

      expect(input?.getAttribute("role")).toBe("combobox");
      expect(input?.getAttribute("aria-autocomplete")).toBe("list");
      expect(input?.getAttribute("aria-expanded")).toBe("true");
      expect(input?.getAttribute("aria-controls")).toBe(results?.id);
      expect(input?.getAttribute("aria-activedescendant")).toBe(
        firstOption?.id,
      );
      expect(results?.getAttribute("role")).toBe("listbox");
      expect(firstOption?.getAttribute("aria-selected")).toBe("true");

      await act(async () => {
        root.unmount();
      });
    });

    it("moves active selection through default results with arrow keys", async () => {
      const { SearchModal } = await import("@/components/docs/search-modal");
      const root = createRoot(container);

      await act(async () => {
        root.render(
          createElement(SearchModal, {
            subdomain: "test-project",
            pages: [
              { path: "introduction", title: "Introduction" },
              { path: "quickstart", title: "Quickstart" },
            ],
          }),
        );
      });

      await act(async () => {
        document.dispatchEvent(new CustomEvent("open-search"));
      });

      const input = container.querySelector<HTMLInputElement>(
        '[data-testid="search-input"]',
      );
      const options =
        container.querySelectorAll<HTMLElement>('[role="option"]');

      expect(input?.getAttribute("aria-activedescendant")).toBe(options[0].id);
      expect(options[0].getAttribute("aria-selected")).toBe("true");

      await act(async () => {
        input?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
        );
      });

      expect(input?.getAttribute("aria-activedescendant")).toBe(options[1].id);
      expect(options[0].getAttribute("aria-selected")).toBe("false");
      expect(options[1].getAttribute("aria-selected")).toBe("true");

      await act(async () => {
        root.unmount();
      });
    });

    it("moves active selection through recent searches with arrow keys", async () => {
      const { SearchModal } = await import("@/components/docs/search-modal");
      localStorage.setItem(
        "docs-recent-searches",
        JSON.stringify(["plants", "quickstart"]),
      );
      const root = createRoot(container);

      await act(async () => {
        root.render(
          createElement(SearchModal, {
            subdomain: "test-project",
            pages: [
              { path: "introduction", title: "Introduction" },
              { path: "quickstart", title: "Quickstart" },
            ],
          }),
        );
      });

      await act(async () => {
        document.dispatchEvent(new CustomEvent("open-search"));
      });

      const input = container.querySelector<HTMLInputElement>(
        '[data-testid="search-input"]',
      );
      const options =
        container.querySelectorAll<HTMLElement>('[role="option"]');

      expect(
        container.querySelector('[data-testid="recent-searches"]'),
      ).not.toBeNull();
      expect(input?.getAttribute("aria-activedescendant")).toBe(options[0].id);
      expect(options[0].getAttribute("aria-selected")).toBe("true");

      await act(async () => {
        input?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
        );
      });

      expect(input?.getAttribute("aria-activedescendant")).toBe(options[1].id);
      expect(options[0].getAttribute("aria-selected")).toBe("false");
      expect(options[1].getAttribute("aria-selected")).toBe("true");

      await act(async () => {
        root.unmount();
      });
    });

    it("returns focus to the opener when Escape closes search", async () => {
      const { SearchModal } = await import("@/components/docs/search-modal");
      const opener = document.createElement("button");
      const appRoot = document.createElement("div");
      opener.type = "button";
      opener.textContent = "Search documentation";
      container.append(opener, appRoot);
      opener.focus();

      const root = createRoot(appRoot);

      await act(async () => {
        root.render(
          createElement(SearchModal, {
            subdomain: "test-project",
            pages: [
              { path: "introduction", title: "Introduction" },
              { path: "quickstart", title: "Quickstart" },
            ],
          }),
        );
      });

      await act(async () => {
        document.dispatchEvent(new CustomEvent("open-search"));
      });

      const input = appRoot.querySelector<HTMLInputElement>(
        '[data-testid="search-input"]',
      );

      expect(document.activeElement).toBe(input);

      await act(async () => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(appRoot.querySelector('[data-testid="search-modal"]')).toBeNull();
      expect(document.activeElement).toBe(opener);

      await act(async () => {
        root.unmount();
      });
    });

    it("traps Tab focus inside the open search dialog", async () => {
      const { SearchModal } = await import("@/components/docs/search-modal");
      const root = createRoot(container);

      await act(async () => {
        root.render(
          createElement(SearchModal, {
            subdomain: "test-project",
            pages: [
              { path: "introduction", title: "Introduction" },
              { path: "quickstart", title: "Quickstart" },
            ],
          }),
        );
      });

      await act(async () => {
        document.dispatchEvent(new CustomEvent("open-search"));
      });

      const input = container.querySelector<HTMLInputElement>(
        '[data-testid="search-input"]',
      );
      const options =
        container.querySelectorAll<HTMLElement>('[role="option"]');
      const lastOption = options[options.length - 1];

      lastOption.focus();

      await act(async () => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
        );
      });

      expect(document.activeElement).toBe(input);

      await act(async () => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Tab",
            shiftKey: true,
            bubbles: true,
          }),
        );
      });

      expect(document.activeElement).toBe(lastOption);

      await act(async () => {
        root.unmount();
      });
    });
  });

  describe("MobileNav", () => {
    it("exports MobileMenuButton component", async () => {
      const mod = await import("@/components/docs/mobile-nav");
      expect(mod.MobileMenuButton).toBeDefined();
    });

    it("exports MobileSidebar component", async () => {
      const mod = await import("@/components/docs/mobile-nav");
      expect(mod.MobileSidebar).toBeDefined();
    });

    it("opens mobile navigation as a labelled dialog and closes on Escape", async () => {
      const { MobileMenuButton, MobileSidebar } = await import(
        "@/components/docs/mobile-nav"
      );
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);

      await act(async () => {
        root.render(
          createElement(
            "div",
            null,
            createElement(MobileMenuButton),
            createElement(MobileSidebar, {
              nav: [
                {
                  type: "item",
                  label: "Introduction",
                  path: "introduction",
                  pageId: "intro",
                },
              ],
              activePath: "introduction",
              subdomain: "test-project",
              projectName: "Test Project",
            }),
          ),
        );
      });

      await act(async () => {
        container
          .querySelector<HTMLButtonElement>('[data-testid="mobile-menu-btn"]')
          ?.click();
      });

      const dialog = container.querySelector<HTMLElement>(
        '[data-testid="mobile-sidebar"]',
      );
      expect(dialog?.tagName).toBe("DIALOG");
      expect(dialog?.getAttribute("aria-modal")).toBe("true");
      expect(dialog?.getAttribute("aria-label")).toBe(
        "Test Project navigation",
      );
      expect(document.body.style.overflow).toBe("hidden");

      await act(async () => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      });

      expect(
        container.querySelector('[data-testid="mobile-sidebar"]'),
      ).toBeNull();
      expect(document.body.style.overflow).toBe("");

      await act(async () => {
        root.unmount();
      });
      container.remove();
    });
  });

  describe("Layout structure", () => {
    it("TOC width constant is 240px per spec", async () => {
      const { LAYOUT_WIDTHS } = await import(
        "@/components/docs/layout-constants"
      );
      expect(LAYOUT_WIDTHS.sidebar).toBe(260);
      expect(LAYOUT_WIDTHS.toc).toBe(240);
      expect(LAYOUT_WIDTHS.maxContent).toBe(1440);
    });
  });
});
