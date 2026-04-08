import { expect, test } from "@playwright/test";

test.describe("Health check API", () => {
  test("GET /api/health returns 200 with status fields", async ({
    request,
  }) => {
    const response = await request.get("/api/health");
    // May be 200 (ok) or 503 (degraded) depending on DB connectivity
    expect([200, 503]).toContain(response.status());

    const body = await response.json();
    expect(body.status).toBeDefined();
    expect(["ok", "degraded", "error"]).toContain(body.status);
    expect(body.version).toBeDefined();
    expect(body.timestamp).toBeDefined();
    expect(typeof body.uptime).toBe("number");
    expect(body.checks).toBeDefined();
    expect(body.checks.database).toBeDefined();
    expect(body.checks.storage).toBeDefined();
  });

  test("GET /api/health returns valid ISO timestamp", async ({ request }) => {
    const response = await request.get("/api/health");
    const body = await response.json();
    const date = new Date(body.timestamp);
    expect(date.getTime()).not.toBeNaN();
  });

  test("GET /api/health is publicly accessible without auth", async ({
    request,
  }) => {
    // No cookies, no auth headers — should still respond
    const response = await request.get("/api/health", {
      headers: {},
    });
    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    expect(body.status).toBeDefined();
  });

  test("GET /api/health has non-negative uptime", async ({ request }) => {
    const response = await request.get("/api/health");
    const body = await response.json();
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  test("GET /api/health returns version string", async ({ request }) => {
    const response = await request.get("/api/health");
    const body = await response.json();
    expect(typeof body.version).toBe("string");
    expect(body.version.length).toBeGreaterThan(0);
  });
});
