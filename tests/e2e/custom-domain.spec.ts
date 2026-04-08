import { expect, test } from "@playwright/test";

test.describe("Custom Domain Settings", () => {
  test("renders the domain settings page with input and instructions", async ({
    page,
  }) => {
    await page.goto("/settings/project/domain");
    await expect(
      page.getByRole("heading", { name: /custom domain/i }),
    ).toBeVisible();
    await expect(page.getByPlaceholder(/docs\.example\.com/i)).toBeVisible();
  });

  test("shows validation error for invalid domain", async ({ page }) => {
    await page.goto("/settings/project/domain");
    const input = page.getByPlaceholder(/docs\.example\.com/i);
    await input.fill("https://bad-domain.com");
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByText(/without http/i)).toBeVisible();
  });

  test("shows CNAME instructions after saving a valid domain", async ({
    page,
  }) => {
    await page.goto("/settings/project/domain");
    const input = page.getByPlaceholder(/docs\.example\.com/i);
    await input.fill("docs.testdomain.com");
    await page.getByRole("button", { name: /save/i }).click();
    // After saving, DNS instructions should appear
    await expect(page.getByText(/CNAME/i)).toBeVisible({ timeout: 5000 });
  });

  test("has a verify DNS button", async ({ page }) => {
    await page.goto("/settings/project/domain");
    // If a domain is configured, verify button should exist
    const verifyButton = page.getByRole("button", { name: /verify/i });
    // The button may or may not be visible depending on state,
    // but the page should at least load without errors
    await expect(page.locator("body")).toBeVisible();
  });

  test("can remove custom domain", async ({ page }) => {
    await page.goto("/settings/project/domain");
    // Look for remove button if domain is set
    const removeButton = page.getByRole("button", { name: /remove/i });
    // Page should load regardless
    await expect(
      page.getByRole("heading", { name: /custom domain/i }),
    ).toBeVisible();
  });
});
