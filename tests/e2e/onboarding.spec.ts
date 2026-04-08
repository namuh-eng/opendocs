import { expect, test } from "@playwright/test";

test.describe("onboarding — org creation", () => {
  test.use({ storageState: "tests/e2e/.auth/user.json" });

  test("redirects new user without org to /onboarding", async ({ page }) => {
    await page.goto("/dashboard");
    // User with no org should be redirected to onboarding
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test("shows org creation form on /onboarding", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(
      page.getByRole("heading", { name: /create.*organization/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/organization name/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create/i })).toBeVisible();
  });

  test("creates org and redirects to dashboard", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByLabel(/organization name/i).fill("Test Org E2E");
    await page.getByRole("button", { name: /create/i }).click();
    // After creating org, should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("validates empty org name", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByRole("button", { name: /create/i }).click();
    await expect(page.getByText(/name is required/i)).toBeVisible();
  });
});
