import { expect, test } from "@playwright/test";

const FIXTURE_BASE = "/docs/feature004-qa";

test.describe("MDX Component Library (feature-004a)", () => {
  test("docs site renders the QA fixture without server errors", async ({
    page,
  }) => {
    const response = await page.goto(`${FIXTURE_BASE}/introduction`);
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId("page-title")).toHaveText("Introduction");
  });

  test("card links navigate to the linked docs pages", async ({ page }) => {
    await page.goto(`${FIXTURE_BASE}/introduction`);
    await page.locator(".card-group .card-link").first().click();
    await expect(page).toHaveURL(/\/docs\/feature004-qa\/quickstart$/);
    await expect(page.getByTestId("page-title")).toHaveText("Quickstart");
  });

  test("code blocks render filename tabs and action buttons", async ({
    page,
  }) => {
    await page.goto(`${FIXTURE_BASE}/introduction`);
    await expect(page.locator(".code-lang").first()).toHaveText("app.ts");
    await expect(page.locator(".code-copy").first()).toBeVisible();
    await expect(page.locator(".code-ask-ai").first()).toBeVisible();
  });

  test("code-block Ask AI opens the assistant with code context", async ({
    page,
  }) => {
    await page.goto(`${FIXTURE_BASE}/introduction`);
    await page.locator(".code-ask-ai").first().click();

    const panel = page.getByTestId("chat-panel");
    await expect(panel).toBeVisible();
    await expect(page.getByTestId("chat-input")).toHaveValue(
      /Explain this ts code:/,
    );
    await expect(page.getByTestId("chat-input")).toHaveValue(
      /export function greet\(name: string\)/,
    );
  });

  test("docs site handles malformed slugs gracefully", async ({ page }) => {
    const response = await page.goto(`${FIXTURE_BASE}/../../malicious-path`);
    const status = response?.status() ?? 500;
    expect(status).not.toBe(500);
  });
});
