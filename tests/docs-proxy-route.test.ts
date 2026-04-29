import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

function makeRequest(
  body: Record<string, unknown>,
  headers?: HeadersInit,
): NextRequest {
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

  it("returns 429 when rate limited", async () => {
    applyRateLimitMock.mockReturnValue({
      allowed: false,
      limit: 20,
      remaining: 0,
      resetTime: Date.now() + 60_000,
    });
    buildRateLimitHeadersMock.mockReturnValue({
      "x-ratelimit-limit": "20",
      "x-ratelimit-remaining": "0",
    });

    const { POST } = await import("@/app/api/docs/proxy/route");
    const response = await POST(
      makeRequest(
        {
          method: "GET",
          url: "https://example.com/docs.json",
        },
        { "x-forwarded-for": "203.0.113.10" },
      ),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Too many proxy requests",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 when method or url is missing", async () => {
    const { POST } = await import("@/app/api/docs/proxy/route");
    const response = await POST(
      makeRequest({
        method: "",
        url: "",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Missing method or url",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid urls", async () => {
    const { POST } = await import("@/app/api/docs/proxy/route");
    const response = await POST(
      makeRequest({
        method: "GET",
        url: "not-a-url",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid URL",
    });
    expect(fetchMock).not.toHaveBeenCalled();
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
      new Response('{"ok":true}', {
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
      redirect: "manual",
      signal: expect.any(AbortSignal),
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

  it("returns 502 when the upstream request fails", async () => {
    fetchMock.mockRejectedValue(new Error("upstream failed"));

    const { POST } = await import("@/app/api/docs/proxy/route");
    const response = await POST(
      makeRequest({
        method: "POST",
        url: "https://example.com/api/test",
        body: '{"hello":"world"}',
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      status: 0,
      body: "upstream failed",
      headers: {},
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
      redirect: "manual",
      signal: expect.any(AbortSignal),
    });
    expect(response.status).toBe(200);
  });

  it("blocks redirects to internal addresses", async () => {
    fetchMock.mockResolvedValue(
      new Response("", {
        status: 302,
        headers: {
          location: "http://169.254.169.254/latest/meta-data",
        },
      }),
    );

    const { POST } = await import("@/app/api/docs/proxy/route");
    const response = await POST(
      makeRequest({
        method: "GET",
        url: "https://example.com/redirect",
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Redirect target is not allowed",
    });
  });
});
