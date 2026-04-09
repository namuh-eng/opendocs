import {
  type APIRequestContext,
  type Page,
  expect,
  test,
} from "@playwright/test";
import { parseSetCookieHeader } from "better-auth/cookies";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function createSession(
  page: Page,
  request: APIRequestContext,
  baseURL: string | undefined,
  options?: {
    name?: string;
    withOrg?: boolean;
  },
) {
  const email = `onboarding-e2e+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const response = await request.post("/api/test/create-session", {
    data: {
      email,
      name: options?.name ?? "Onboarding E2E User",
      withOrg: options?.withOrg ?? false,
    },
  });

  expect(response.ok()).toBeTruthy();
  const data = (await response.json()) as {
    expiresAt: string;
    setCookie: string;
  };
  const [cookieName, cookieValue] = Array.from(
    parseSetCookieHeader(data.setCookie).entries(),
  ).map(([name, value]) => [name, value.value] as const)[0] ?? ["", ""];

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
}

test.describe("onboarding wizard — multi-step flow", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page, request, baseURL }) => {
    await page.context().clearCookies();
    await createSession(page, request, baseURL);
  });

  test("shows step 1 (org creation) on /onboarding", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(
      page.getByRole("heading", { name: /create.*organization/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/organization name/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /continue/i })).toBeVisible();
  });

  test("shows progress indicator with 4 steps", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.getByText("Organization", { exact: true })).toBeVisible();
    await expect(page.getByText("GitHub", { exact: true })).toBeVisible();
    await expect(page.getByText("Project", { exact: true })).toBeVisible();
    await expect(page.getByText("Complete", { exact: true })).toBeVisible();
  });

  test("validates empty org name on step 1", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(/name is required/i)).toBeVisible();
  });

  test("shows a validation error when slug generation would be empty", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await page.getByLabel(/organization name/i).fill("!!!");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(
      page.getByText(/could not generate a valid slug/i),
    ).toBeVisible();
  });

  test("step 2 shows GitHub connection with skip option", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByLabel(/organization name/i).fill("Test Wizard Org");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(
      page.getByRole("heading", { name: /connect.*repository/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: /skip for now/i }),
    ).toBeVisible();
  });

  test("step 3 shows project creation after skipping GitHub", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await page.getByLabel(/organization name/i).fill("Test Wizard Org 2");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(
      page.getByRole("button", { name: /skip for now/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /skip for now/i }).click();
    await expect(
      page.getByRole("heading", { name: /create.*first project/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/project name/i)).toBeVisible();
  });

  test("validates empty project name on step 3", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByLabel(/organization name/i).fill("Test Wizard Org 3");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("button", { name: /skip for now/i }).click({
      timeout: 10000,
    });
    await page.getByRole("button", { name: /create project/i }).click();
    await expect(page.getByText(/name is required/i)).toBeVisible();
  });

  test("rejects non-GitHub repository URLs on step 2", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByLabel(/organization name/i).fill("Repo Validation Org");
    await page.getByRole("button", { name: /continue/i }).click();
    await page
      .getByLabel(/GitHub repository URL/i)
      .fill("https://example.com/repo");
    await page.getByRole("button", { name: /connect repository/i }).click();
    await expect(
      page.getByText(/repository url must be a github repository/i),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /connect.*repository/i }),
    ).toBeVisible();
  });

  test("resumes onboarding after refresh when the org exists but the project does not", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await page
      .getByLabel(/organization name/i)
      .fill(`Resume Org ${Date.now()}`);
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(
      page.getByRole("heading", { name: /connect.*repository/i }),
    ).toBeVisible({ timeout: 10000 });

    await page.reload();

    await expect(
      page.getByRole("heading", { name: /connect.*repository/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: /skip for now/i }),
    ).toBeVisible();
  });

  test("shows a live subdomain preview while typing the project name", async ({
    page,
  }) => {
    const orgName = `Preview Org ${Date.now()}`;

    await page.goto("/onboarding");
    await page.getByLabel(/organization name/i).fill(orgName);
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("button", { name: /skip for now/i }).click({
      timeout: 10000,
    });

    await page.getByLabel(/project name/i).fill("Live Docs");

    await expect(
      page.getByText(`${slugify(orgName)}-live-docs.mintlify.app`),
    ).toBeVisible();
  });

  test("full wizard flow: org → skip GitHub → project → success", async ({
    page,
  }) => {
    await page.goto("/onboarding");

    // Step 1: Create org
    await page.getByLabel(/organization name/i).fill("Full Flow Org");
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 2: Skip GitHub
    await expect(
      page.getByRole("button", { name: /skip for now/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /skip for now/i }).click();

    // Step 3: Create project
    await page.getByLabel(/project name/i).fill("My Docs");
    await page.getByRole("button", { name: /create project/i }).click();

    // Step 4: Success screen
    await expect(page.getByRole("heading", { name: /all set/i })).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole("button", { name: /go to dashboard/i }),
    ).toBeVisible();
  });

  test("stores the GitHub repo URL and creates an initial deployment", async ({
    page,
  }) => {
    const orgName = `Deployment Org ${Date.now()}`;
    const repoUrl = "https://github.com/acme/docs";

    await page.goto("/onboarding");
    await page.getByLabel(/organization name/i).fill(orgName);
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByLabel(/GitHub repository URL/i).fill(repoUrl);
    await page.getByRole("button", { name: /connect repository/i }).click();
    await page.getByLabel(/project name/i).fill("Initial Deploy");
    await page.getByRole("button", { name: /create project/i }).click();

    await expect(page.getByRole("heading", { name: /all set/i })).toBeVisible({
      timeout: 10000,
    });

    const projectData = await page.evaluate(async () => {
      const response = await fetch("/api/projects", { credentials: "include" });
      return response.json();
    });

    expect(projectData.projects).toHaveLength(1);
    expect(projectData.projects[0].repoUrl).toBe(repoUrl);

    const deploymentData = await page.evaluate(async () => {
      const response = await fetch("/api/deployments", {
        credentials: "include",
      });
      return response.json();
    });

    expect(deploymentData.deployments).toHaveLength(1);
    expect(["queued", "in_progress", "succeeded"]).toContain(
      deploymentData.deployments[0].status,
    );
  });

  test("back button navigates to previous step", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByLabel(/organization name/i).fill("Back Test Org");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(
      page.getByRole("heading", { name: /connect.*repository/i }),
    ).toBeVisible({ timeout: 10000 });

    // Click back
    await page.getByRole("button", { name: /back/i }).click();
    await expect(
      page.getByRole("heading", { name: /create.*organization/i }),
    ).toBeVisible();
  });

  test("user with an existing org is redirected to dashboard", async ({
    page,
    request,
    baseURL,
  }) => {
    await page.context().clearCookies();
    await createSession(page, request, baseURL, {
      name: "Existing Org User",
      withOrg: true,
    });

    await page.goto("/onboarding");
    await page.waitForURL(/\/dashboard/);
    expect(page.url()).toContain("/dashboard");
  });

  test("concurrent org creation only creates one org for a first-time user", async ({
    page,
  }) => {
    await page.goto("/onboarding");

    const results = await page.evaluate(async () =>
      Promise.all(
        [1, 2].map(() =>
          fetch("/api/orgs", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Concurrent Org Test" }),
          }).then(async (response) => ({
            status: response.status,
            text: await response.text(),
          })),
        ),
      ),
    );

    const statuses = results.map((result) => result.status).sort();
    expect(statuses).toEqual([201, 409]);
  });
});
