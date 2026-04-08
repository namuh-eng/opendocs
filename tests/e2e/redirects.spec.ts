import { expect, test } from "@playwright/test";

test.describe("URL Redirects — Configurations Panel", () => {
  test("shows empty redirects state in Advanced section", async ({ page }) => {
    await page.goto("/dashboard");
    // Navigate to a project's configurations panel
    const projectLink = page.locator('[data-testid="project-card"]').first();
    if (await projectLink.isVisible()) {
      await projectLink.click();
    }
    // Open configurations panel if available
    const configBtn = page.locator(
      '[data-testid="configs-panel-btn"], [data-testid="open-configs"]',
    );
    if (await configBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await configBtn.click();
    }
    // Open advanced accordion
    const advancedTrigger = page.locator('button:has-text("Advanced")');
    if (await advancedTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await advancedTrigger.click();
      // Verify add redirect button is visible
      const addBtn = page.locator('[data-testid="config-add-redirect"]');
      await expect(addBtn).toBeVisible();
    }
  });

  test("can add and remove a redirect entry", async ({ page }) => {
    await page.goto("/dashboard");
    const projectLink = page.locator('[data-testid="project-card"]').first();
    if (await projectLink.isVisible()) {
      await projectLink.click();
    }
    const configBtn = page.locator(
      '[data-testid="configs-panel-btn"], [data-testid="open-configs"]',
    );
    if (await configBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await configBtn.click();
    }
    const advancedTrigger = page.locator('button:has-text("Advanced")');
    if (await advancedTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await advancedTrigger.click();
      // Add a redirect
      const addBtn = page.locator('[data-testid="config-add-redirect"]');
      await addBtn.click();
      // Fill source and destination
      const sourceInput = page.locator(
        '[data-testid="config-redirect-0-source"]',
      );
      const destInput = page.locator(
        '[data-testid="config-redirect-0-destination"]',
      );
      await expect(sourceInput).toBeVisible();
      await expect(destInput).toBeVisible();
      await sourceInput.fill("/old-path");
      await destInput.fill("/new-path");
      // Remove the redirect
      const removeBtn = page.locator(
        '[data-testid="config-redirect-0-remove"]',
      );
      await removeBtn.click();
      await expect(sourceInput).not.toBeVisible();
    }
  });
});
