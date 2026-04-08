import { expect, test } from "@playwright/test";

const BASE = "http://localhost:3015";

const ENDPOINTS = [
  "/api/v1/analytics/views",
  "/api/v1/analytics/visitors",
  "/api/v1/analytics/feedback",
  "/api/v1/analytics/searches",
  "/api/v1/analytics/assistant-conversations",
  "/api/v1/analytics/assistant-caller-stats",
  "/api/v1/analytics/feedback-by-page",
];

test.describe("Analytics Export API — auth", () => {
  for (const ep of ENDPOINTS) {
    test(`${ep} rejects unauthenticated requests`, async ({ request }) => {
      const res = await request.get(`${BASE}${ep}?projectId=test`);
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.error).toContain("Unauthorized");
    });
  }
});

test.describe("Analytics Export API — missing projectId", () => {
  // These need a valid API key, so they'll return 401 without one.
  // We test the auth gate first — projectId validation is covered by unit tests.
  for (const ep of ENDPOINTS) {
    test(`${ep} returns 401 without API key`, async ({ request }) => {
      const res = await request.get(`${BASE}${ep}`);
      expect(res.status()).toBe(401);
    });
  }
});

test.describe("Analytics Export API — response shape", () => {
  // Without a valid API key in the test env, we verify the endpoints respond and reject properly.
  for (const ep of ENDPOINTS) {
    test(`${ep} returns JSON error object`, async ({ request }) => {
      const res = await request.get(`${BASE}${ep}?projectId=fake-id`, {
        headers: { Authorization: "Bearer invalid_key" },
      });
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });
  }
});
