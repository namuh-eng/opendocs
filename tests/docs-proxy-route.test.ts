import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

function makeRequest(body: Record<string, unknown>, headers?: HeadersInit): NextRequest {
  return new Request("http://localhost:3000/api/docs/proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
  }) as NextRequest;
}

const applyRateLimitMock = vi.fn();
const buildRateLimitHeadersMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  applyRateLimit: applyRateLimitMock,
  buildRateLimitHeaders: buildRateLimitHeadersMock,
}));

describe("POST /api/docs/proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    applyRateLimitMock.mockReturnValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      resetTime: Date.now() + 60_000,
    });
    buildRateLimitHeadersMock.mockReturnValue({
      "x-ratelimit-limit": "20",
      "x-ratelimit-remaining": "19",
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("blocks requests to .local hosts", async () => {
    const { POST } = await import("@/app/api/docs/proxy/route");
    const response = await POST(
      makeRequest({
        method: "GET",
        url: "http://printer.local/status",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Requests to internal addresses are not allowed",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("strips host/origin/referer headers when forwarding requests", async () => {
    fetchMock.mockResolvedValue(
      new Response("{\"ok\":true}", {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    const { POST } = await import("@/app/api/docs/proxy/route");
    const response = await POST(
      makeRequest(
        {
          method: "POST",
          url: "https://example.com/api/test",
          headers: {
            Host: "malicious.internal",
            Origin: "https://evil.example",
            Referer: "https://evil.example/path",
            Authorization: "Bearer token",
            Accept: "application/json",
          },
          body: '{"hello":"world"}',
        },
        { "x-forwarded-for": "203.0.113.10" },
      ),
    );

    expect(fetchMock).toHaveBeenCalledWith("https://example.com/api/test", {
      method: "POST",
      headers: {
        Authorization: "Bearer token",
        Accept: "application/json",
      },
      body: '{"hello":"world"}',
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 200,
      body: '{"ok":true}',
      headers: {
        "content-type": "application/json",
      },
      requestId: expect.any(String),
    });
  });

  it("does not forward a body for GET requests", async () => {
    fetchMock.mockResolvedValue(
      new Response("ok", {
        status: 200,
        headers: {
          "content-type": "text/plain",
        },
      }),
    );

    const { POST } = await import("@/app/api/docs/proxy/route");
    const response = await POST(
      makeRequest({
        method: "GET",
        url: "https://example.com/docs.json",
        body: "should-not-forward",
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith("https://example.com/docs.json", {
      method: "GET",
      headers: {},
    });
    expect(response.status).toBe(200);
  });
});
