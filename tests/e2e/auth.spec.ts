import { expect, test } from "@playwright/test";

test.describe("auth-001: authentication flow", () => {
  test("login page renders with Google OAuth button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText(/sign in|log in|welcome/i);
    const googleBtn = page.getByRole("button", { name: /google/i });
    await expect(googleBtn).toBeVisible();
  });

  test("signup page renders with Google OAuth button", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("h1")).toContainText(
      /sign up|create|get started|make your docs/i,
    );
    const googleBtn = page.getByRole("button", { name: /google/i });
    await expect(googleBtn).toBeVisible();
  });

  test("unauthenticated user is redirected from dashboard to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login?returnTo=%2Fdashboard");
  });

  test("unauthenticated user is redirected from settings to login", async ({
    page,
  }) => {
    await page.goto("/settings/general");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login?returnTo=%2Fsettings%2Fgeneral");
  });

  test("auth API session endpoint returns unauthenticated", async ({
    request,
  }) => {
    const res = await request.get("/api/auth/get-session");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeNull();
  });
});
