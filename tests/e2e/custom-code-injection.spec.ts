import { expect, test } from "@playwright/test";

test.describe("Custom CSS and JS injection — Configurations panel", () => {
  test("Advanced section shows Custom CSS textarea", async ({ page }) => {
    await page.goto("/editor/main");
    // Open configs panel
    const configsBtn = page
      .getByTestId("configs-panel-toggle")
      .or(page.getByRole("button", { name: /configurations/i }));
    if (await configsBtn.isVisible()) {
      await configsBtn.click();
    }
    // Expand Advanced accordion
    const advancedTrigger = page.getByText("Advanced");
    if (await advancedTrigger.isVisible()) {
      await advancedTrigger.click();
    }
    const cssTextarea = page.getByTestId("config-adv-custom-css");
    await expect(cssTextarea).toBeVisible();
  });

  test("Advanced section shows Custom JavaScript textarea", async ({
    page,
  }) => {
    await page.goto("/editor/main");
    const configsBtn = page
      .getByTestId("configs-panel-toggle")
      .or(page.getByRole("button", { name: /configurations/i }));
    if (await configsBtn.isVisible()) {
      await configsBtn.click();
    }
    const advancedTrigger = page.getByText("Advanced");
    if (await advancedTrigger.isVisible()) {
      await advancedTrigger.click();
    }
    const jsTextarea = page.getByTestId("config-adv-custom-js");
    await expect(jsTextarea).toBeVisible();
  });

  test("Custom CSS textarea accepts input", async ({ page }) => {
    await page.goto("/editor/main");
    const configsBtn = page
      .getByTestId("configs-panel-toggle")
      .or(page.getByRole("button", { name: /configurations/i }));
    if (await configsBtn.isVisible()) {
      await configsBtn.click();
    }
    const advancedTrigger = page.getByText("Advanced");
    if (await advancedTrigger.isVisible()) {
      await advancedTrigger.click();
    }
    const cssTextarea = page.getByTestId("config-adv-custom-css");
    await cssTextarea.fill("body { background: red; }");
    await expect(cssTextarea).toHaveValue("body { background: red; }");
  });

  test("Custom JS textarea accepts input", async ({ page }) => {
    await page.goto("/editor/main");
    const configsBtn = page
      .getByTestId("configs-panel-toggle")
      .or(page.getByRole("button", { name: /configurations/i }));
    if (await configsBtn.isVisible()) {
      await configsBtn.click();
    }
    const advancedTrigger = page.getByText("Advanced");
    if (await advancedTrigger.isVisible()) {
      await advancedTrigger.click();
    }
    const jsTextarea = page.getByTestId("config-adv-custom-js");
    await jsTextarea.fill("console.log('test');");
    await expect(jsTextarea).toHaveValue("console.log('test');");
  });
});
