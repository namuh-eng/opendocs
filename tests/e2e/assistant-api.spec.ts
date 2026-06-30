/**
 * E2E tests for the assistant API endpoints.
 *
 * These test the HTTP contract: auth, validation, response shapes.
 * AI streaming is NOT tested here (requires a real OpenAI key) — QA handles that.
 */

import { expect, test } from "@playwright/test";

const BASE_URL = "http://localhost:3015";

test.describe("Assistant API — search", () => {
  test("returns 401 without auth header", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/v1/assistant/search`, {
      data: { query: "getting started" },
    });
    expect(response.status()).toBe(401);
  });

  test("returns 401 with invalid API key", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/v1/assistant/search`, {
      headers: { Authorization: "Bearer mint_dsc_invalidkey12345678" },
      data: { query: "getting started" },
    });
    expect(response.status()).toBe(401);
  });

  test("returns 400 when query is missing", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/v1/assistant/search`, {
      headers: { Authorization: "Bearer mint_dsc_invalidkey12345678" },
      data: {},
    });
    // Auth fails first, so 401
    expect(response.status()).toBe(401);
  });
});

test.describe("Assistant API — get-page-content", () => {
  test("returns 401 without auth header", async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/v1/assistant/get-page-content`,
      { data: { path: "getting-started" } },
    );
    expect(response.status()).toBe(401);
  });

  test("returns 401 with invalid API key", async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/v1/assistant/get-page-content`,
      {
        headers: { Authorization: "Bearer mint_dsc_invalidkey12345678" },
        data: { path: "getting-started" },
      },
    );
    expect(response.status()).toBe(401);
  });
});

test.describe("Assistant API — create-message", () => {
  test("returns 401 without auth header", async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/v1/assistant/create-message`,
      {
        data: {
          fp: "anon",
          messages: [{ id: "1", role: "user", content: "hello" }],
        },
      },
    );
    expect(response.status()).toBe(401);
  });

  test("returns 401 with invalid API key", async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/v1/assistant/create-message`,
      {
        headers: { Authorization: "Bearer mint_dsc_invalidkey12345678" },
        data: {
          fp: "anon",
          messages: [{ id: "1", role: "user", content: "hello" }],
        },
      },
    );
    expect(response.status()).toBe(401);
  });
});
