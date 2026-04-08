import { expect, test } from "@playwright/test";

test.describe("API Playground", () => {
  test("proxy endpoint returns error for missing method/url", async ({
    request,
  }) => {
    const response = await request.post("/api/docs/proxy", {
      data: {},
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Missing method or url");
  });

  test("proxy endpoint blocks requests to localhost", async ({ request }) => {
    const response = await request.post("/api/docs/proxy", {
      data: {
        method: "GET",
        url: "http://localhost:3015/api/health",
      },
    });
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("internal addresses");
  });

  test("proxy endpoint blocks requests to 127.0.0.1", async ({ request }) => {
    const response = await request.post("/api/docs/proxy", {
      data: {
        method: "GET",
        url: "http://127.0.0.1:8080/",
      },
    });
    expect(response.status()).toBe(403);
  });

  test("proxy endpoint rejects invalid URLs", async ({ request }) => {
    const response = await request.post("/api/docs/proxy", {
      data: {
        method: "GET",
        url: "not-a-valid-url",
      },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid URL");
  });

  test("proxy endpoint forwards valid external GET request", async ({
    request,
  }) => {
    const response = await request.post("/api/docs/proxy", {
      data: {
        method: "GET",
        url: "https://httpbin.org/get",
        headers: { Accept: "application/json" },
      },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe(200);
    expect(body.body).toBeTruthy();
    expect(body.headers).toBeTruthy();
  });
});
