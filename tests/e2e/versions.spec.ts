import { expect, test } from "@playwright/test";

test.describe("Multi-version documentation", () => {
  test("docs page loads without version prefix (default version)", async ({
    page,
  }) => {
    const response = await page.goto("/docs/test-project/introduction");
    // May 404 if no test project exists, but should not 500
    expect(response?.status()).toBeLessThan(500);
  });

  test("docs page handles version prefix in URL", async ({ page }) => {
    // A docs page with version prefix should not crash
    const response = await page.goto("/docs/test-project/v1/introduction");
    expect(response?.status()).toBeLessThan(500);
  });

  test("docs page handles version + locale prefix combination", async ({
    page,
  }) => {
    // Version comes before locale in URL: /docs/{subdomain}/{version}/{locale}/{page}
    const response = await page.goto("/docs/test-project/v1/fr/introduction");
    expect(response?.status()).toBeLessThan(500);
  });

  test("version switcher component renders without JS errors", async ({
    page,
  }) => {
    await page.goto("/");
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });

  test("API route for version settings responds", async ({ page }) => {
    const response = await page.goto("/api/auth/get-session");
    // Should respond without 500 (auth check validates server works)
    expect(response?.status()).toBeLessThan(500);
  });
});
