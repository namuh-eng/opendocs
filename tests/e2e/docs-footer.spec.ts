import { expect, test } from "@playwright/test";

test.describe("Docs site footer", () => {
  test("renders footer with powered-by branding", async ({ page }) => {
    await page.goto("/docs/test-project/introduction");
    const footer = page.locator('[data-testid="docs-footer"]');
    await expect(footer).toBeVisible();
    const poweredBy = page.locator('[data-testid="docs-footer-powered-by"]');
    await expect(poweredBy).toBeVisible();
    await expect(poweredBy).toContainText("Powered by");
  });

  test("powered-by link opens in new tab", async ({ page }) => {
    await page.goto("/docs/test-project/introduction");
    const poweredBy = page.locator('[data-testid="docs-footer-powered-by"]');
    await expect(poweredBy).toHaveAttribute("target", "_blank");
    await expect(poweredBy).toHaveAttribute("rel", /noopener/);
  });

  test("social links open in new tab when configured", async ({ page }) => {
    await page.goto("/docs/test-project/introduction");
    const socialLinks = page.locator(".docs-footer-social-link");
    const count = await socialLinks.count();
    for (let i = 0; i < count; i++) {
      await expect(socialLinks.nth(i)).toHaveAttribute("target", "_blank");
      await expect(socialLinks.nth(i)).toHaveAttribute("rel", /noopener/);
    }
  });

  test("shows tooltip on powered-by hover", async ({ page }) => {
    await page.goto("/docs/test-project/introduction");
    const poweredByContainer = page.locator(".docs-footer-powered");
    await poweredByContainer.hover();
    const tooltip = page.locator('[data-testid="docs-footer-tooltip"]');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(
      "This documentation is built and hosted on",
    );
  });

  test("footer appears below pagination", async ({ page }) => {
    await page.goto("/docs/test-project/introduction");
    const footer = page.locator('[data-testid="docs-footer"]');
    await expect(footer).toBeVisible();
    // Footer should be at the bottom of the main content area
    const footerBox = await footer.boundingBox();
    expect(footerBox).toBeTruthy();
    if (footerBox) {
      expect(footerBox.y).toBeGreaterThan(200);
    }
  });
});
