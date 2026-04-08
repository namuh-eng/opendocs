import { expect, test } from "@playwright/test";

test.describe("Workflows template picker", () => {
  test("renders page heading", async ({ page }) => {
    await page.goto("/products/workflows");
    await expect(
      page.getByRole("heading", {
        name: "What do you want to automate?",
      }),
    ).toBeVisible();
  });

  test("renders all 9 template cards", async ({ page }) => {
    await page.goto("/products/workflows");
    const cards = page.locator("[data-testid^='template-card-']");
    await expect(cards).toHaveCount(9);
  });

  test("displays template names", async ({ page }) => {
    await page.goto("/products/workflows");
    await expect(page.getByText("Changelog")).toBeVisible();
    await expect(page.getByText("API docs sync")).toBeVisible();
    await expect(page.getByText("Custom workflow")).toBeVisible();
  });

  test("clicking a template navigates to creation form", async ({ page }) => {
    await page.goto("/products/workflows");
    await page.getByTestId("template-card-changelog").click();
    await page.waitForURL("**/products/workflows/new?template=changelog");
    await expect(
      page.getByRole("heading", { name: /New workflow: Changelog/ }),
    ).toBeVisible();
  });

  test("creation form pre-fills template name", async ({ page }) => {
    await page.goto("/products/workflows/new?template=api-docs-sync");
    const nameInput = page.locator("#workflow-name");
    await expect(nameInput).toHaveValue("API docs sync");
  });

  test("custom template shows empty prompt", async ({ page }) => {
    await page.goto("/products/workflows/new?template=custom");
    const promptTextarea = page.locator("#workflow-prompt");
    await expect(promptTextarea).toHaveValue("");
  });

  test("back link navigates to template picker", async ({ page }) => {
    await page.goto("/products/workflows/new?template=changelog");
    await page.getByText("Back to templates").click();
    await page.waitForURL("**/products/workflows");
    await expect(
      page.getByRole("heading", {
        name: "What do you want to automate?",
      }),
    ).toBeVisible();
  });
});
