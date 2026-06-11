import { expect, test } from "@playwright/test";

test.describe("landing page (warm craft)", () => {
  test("renders hero above the fold for logged-out visitors", async ({
    page,
  }) => {
    await page.goto("/");

    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
    await expect(h1).toContainText("Documentation that");

    // Guards against layout regressions pushing the hero off-screen.
    const box = await h1.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(900);
  });

  test("shows primary navigation and CTAs", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator('a[href="/login"]').first()).toBeVisible();
    await expect(page.locator('a[href="/onboarding"]').first()).toBeVisible();
    await expect(page.locator('a[href="/dashboard"]').first()).toBeVisible();
  });

  test("renders the rethemed dashboard mock and key sections", async ({
    page,
  }) => {
    await page.goto("/");

    // Dashboard mock mirrors the real app shell.
    await expect(page.getByText("Recent deployments")).toBeVisible();
    await expect(page.getByText("acme-docs")).toBeVisible();

    // Feature and CTA sections.
    await expect(
      page.getByText("Ask-AI Assistant", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Your docs deserve")).toBeVisible();
  });
});
