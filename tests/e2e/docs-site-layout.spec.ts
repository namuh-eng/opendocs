import { expect, test } from "@playwright/test";

test.describe("Docs site layout — feature-014", () => {
  // These tests use the docs site route: /docs/{subdomain}/{slug}
  // They need a project with published pages in the DB

  test("renders 3-column layout (sidebar, content, TOC)", async ({ page }) => {
    await page.goto("/docs/test-project/quickstart");
    const sidebar = page.locator(".docs-sidebar");
    const main = page.locator(".docs-main");
    const toc = page.locator(".docs-toc");

    await expect(sidebar).toBeVisible();
    await expect(main).toBeVisible();
    // TOC may not be visible if no headings, but element should exist
    await expect(toc).toBeAttached();
  });

  test("sidebar shows navigation with active page highlighted", async ({
    page,
  }) => {
    await page.goto("/docs/test-project/quickstart");
    const activeItem = page.locator(".docs-nav-item.active");
    await expect(activeItem).toBeVisible();
  });

  test("theme toggle switches between light and dark", async ({ page }) => {
    await page.goto("/docs/test-project/quickstart");
    const toggle = page.locator("[data-testid='theme-toggle']");
    await expect(toggle).toBeVisible();

    // Default is dark
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "dark");

    // Click to toggle to light
    await toggle.click();
    await expect(html).toHaveAttribute("data-theme", "light");

    // Click again to toggle back to dark
    await toggle.click();
    await expect(html).toHaveAttribute("data-theme", "dark");
  });

  test("search modal opens with Cmd+K", async ({ page }) => {
    await page.goto("/docs/test-project/quickstart");
    await page.keyboard.press("Meta+k");
    const modal = page.locator("[data-testid='search-modal']");
    await expect(modal).toBeVisible();
  });

  test("search modal opens when clicking search button", async ({ page }) => {
    await page.goto("/docs/test-project/quickstart");
    await page.locator(".docs-search-btn").click();
    const modal = page.locator("[data-testid='search-modal']");
    await expect(modal).toBeVisible();
  });

  test("search modal closes with Escape", async ({ page }) => {
    await page.goto("/docs/test-project/quickstart");
    await page.keyboard.press("Meta+k");
    const modal = page.locator("[data-testid='search-modal']");
    await expect(modal).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
  });

  test("mobile hamburger menu shows on small viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/docs/test-project/quickstart");
    const hamburger = page.locator("[data-testid='mobile-menu-btn']");
    await expect(hamburger).toBeVisible();
    // Sidebar should be hidden on mobile
    const sidebar = page.locator(".docs-sidebar");
    await expect(sidebar).not.toBeVisible();
  });

  test("mobile menu opens sidebar overlay", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/docs/test-project/quickstart");
    await page.locator("[data-testid='mobile-menu-btn']").click();
    const mobileSidebar = page.locator("[data-testid='mobile-sidebar']");
    await expect(mobileSidebar).toBeVisible();
  });

  test("TOC waits for user or scroll selection before highlighting", async ({
    page,
  }) => {
    await page.goto("/docs/test-project/quickstart");
    const tocLinks = page.locator(".docs-toc-link");
    const count = await tocLinks.count();
    if (count > 0) {
      await expect(tocLinks.first()).not.toHaveClass(/active/);
    }
  });
});
