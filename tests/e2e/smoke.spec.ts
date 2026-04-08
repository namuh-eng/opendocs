import { expect, test } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("homepage loads and shows heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("page returns 200 status", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });

  test("login page loads", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("signup page loads", async ({ page }) => {
    const response = await page.goto("/signup");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("dashboard page loads (authenticated)", async ({ page }) => {
    const response = await page.goto("/dashboard");
    expect(response?.status()).toBe(200);
  });

  test("settings page loads (authenticated)", async ({ page }) => {
    const response = await page.goto("/settings/organization/api-keys");
    expect(response?.status()).toBe(200);
  });

  test("editor page loads (authenticated)", async ({ page }) => {
    const response = await page.goto("/editor/main");
    expect(response?.status()).toBe(200);
  });

  test("analytics page loads (authenticated)", async ({ page }) => {
    const response = await page.goto("/analytics");
    expect(response?.status()).toBe(200);
  });
});
