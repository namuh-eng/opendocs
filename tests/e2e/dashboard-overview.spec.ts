import { expect, test } from "@playwright/test";

test.describe("Dashboard overview", () => {
  test("shows project name and status badge", async ({ page }) => {
    await page.goto("/dashboard");
    // Should show project name
    const heading = page.locator("h2").first();
    await expect(heading).toBeVisible();
    // Status badge should be present
    const badge = page.locator('[data-testid="project-status-badge"]');
    await expect(badge).toBeVisible();
  });

  test("displays quick action cards", async ({ page }) => {
    await page.goto("/dashboard");
    const cards = page.locator('[data-testid="quick-action-card"]');
    await expect(cards).toHaveCount(4);
  });

  test("open editor card navigates to /editor/main", async ({ page }) => {
    await page.goto("/dashboard");
    const editorCard = page.locator(
      '[data-testid="quick-action-card-open-editor"]',
    );
    await expect(editorCard).toBeVisible();
    await editorCard.click();
    await page.waitForURL("**/editor/main");
    expect(page.url()).toContain("/editor/main");
  });

  test("settings card navigates to settings page", async ({ page }) => {
    await page.goto("/dashboard");
    const settingsCard = page.locator(
      '[data-testid="quick-action-card-settings"]',
    );
    await expect(settingsCard).toBeVisible();
    await settingsCard.click();
    await page.waitForURL("**/settings/**");
    expect(page.url()).toContain("/settings/");
  });

  test("site URL link opens docs in new tab", async ({ page }) => {
    await page.goto("/dashboard");
    const siteLink = page.locator('[data-testid="site-url-link"]');
    await expect(siteLink).toBeVisible();
    // Should have target=_blank
    await expect(siteLink).toHaveAttribute("target", "_blank");
  });
});
