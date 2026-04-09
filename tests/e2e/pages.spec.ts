import { expect, test } from "@playwright/test";
import { parseSetCookieHeader } from "better-auth/cookies";

test.beforeEach(async ({ page, request, baseURL }) => {
  const email = `pages-e2e+${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const response = await request.post("/api/test/create-session", {
    data: {
      email,
      name: "Pages E2E User",
    },
  });

  expect(response.ok()).toBeTruthy();

  const data = (await response.json()) as {
    setCookie: string;
    expiresAt: string;
  };
  const [cookieName, cookieValue] = Array.from(
    parseSetCookieHeader(data.setCookie).entries(),
  ).map(([name, value]) => [name, value.value] as const)[0] ?? ["", ""];

  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: cookieName,
      value: cookieValue,
      url: baseURL ?? "http://localhost:3015",
      httpOnly: true,
      sameSite: "Lax",
      expires: Math.floor(new Date(data.expiresAt).getTime() / 1000),
    },
  ]);
});

test.describe("Page management (Editor)", () => {
  test("editor page loads with Navigation and Files tabs", async ({ page }) => {
    await page.goto("/editor/main");
    await expect(page.getByTestId("editor-page")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Navigation" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Files" })).toBeVisible();
  });

  test("shows empty state when no pages exist", async ({ page }) => {
    await page.goto("/editor/main");
    await expect(page.getByText("No pages yet.")).toBeVisible();
    await expect(page.getByText("Start writing your docs")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create a page" }),
    ).toBeVisible();
  });

  test("can open create page modal", async ({ page }) => {
    await page.goto("/editor/main");
    await page.getByTestId("add-page-btn").click();
    await expect(page.getByText("Create new page")).toBeVisible();
    await expect(
      page.getByPlaceholder("e.g. getting-started/quickstart"),
    ).toBeVisible();
    await expect(page.getByPlaceholder("e.g. Quickstart")).toBeVisible();
  });

  test("can switch between Navigation and Files tabs", async ({ page }) => {
    await page.goto("/editor/main");
    await page.getByRole("button", { name: "Files" }).click();
    await expect(page.getByTestId("file-list")).toBeVisible();
    await page.getByRole("button", { name: "Navigation" }).click();
    // Navigation view should be showing again
    await expect(page.getByText("No pages yet.")).toBeVisible();
  });

  test("create page modal validates required fields", async ({ page }) => {
    await page.goto("/editor/main");
    await page.getByTestId("add-page-btn").click();
    // Create button should be disabled when fields are empty
    const createBtn = page.getByRole("button", { name: "Create page" });
    await expect(createBtn).toBeDisabled();
  });

  test("can create and open a page in the visual editor", async ({ page }) => {
    const suffix = Date.now().toString();
    const path = `qa-${suffix}/intro`;
    const title = `QA Intro ${suffix}`;

    await page.goto("/editor/main");
    await page.getByTestId("add-page-btn").click();
    await page.getByLabel("Path").fill(path);
    await page.getByLabel("Title").fill(title);
    await page.getByRole("button", { name: "Create page" }).click();

    await page.getByRole("button", { name: title }).click();
    await expect(page.getByTestId("page-title")).toHaveText(title);
    await expect(page.getByTestId("visual-editor")).toBeVisible();

    await page.getByTestId("delete-page-btn").click();
    await page
      .locator("div.fixed")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(page.getByTestId("page-title")).not.toBeVisible();
  });
});
