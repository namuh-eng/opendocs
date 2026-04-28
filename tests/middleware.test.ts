import type { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const getSessionCookieMock = vi.fn();

vi.mock("better-auth/cookies", () => ({
  getSessionCookie: getSessionCookieMock,
}));

function makeNextRequest(url: string): NextRequest {
  const request = new Request(url) as NextRequest;
  Object.defineProperty(request, "nextUrl", {
    value: new URL(url),
    configurable: true,
  });
  return request;
}

describe("Proxy", () => {
  it("redirects unauthenticated users to login for protected routes", async () => {
    getSessionCookieMock.mockReturnValue(null);
    const { proxy } = await import("@/proxy");
    const response = await proxy(makeNextRequest("http://localhost/dashboard"));

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toContain("/login");
  });

  it("adds Server-Timing header for performance monitoring", async () => {
    getSessionCookieMock.mockReturnValue({ session: { id: "session-1" } });
    const { proxy } = await import("@/proxy");
    const response = await proxy(makeNextRequest("http://localhost/dashboard"));

    expect(response?.headers.get("Server-Timing")).toContain("proxy;dur=");
  });

  it("allows access to unprotected routes", async () => {
    getSessionCookieMock.mockReturnValue(null);
    const { proxy } = await import("@/proxy");
    const response = await proxy(makeNextRequest("http://localhost/"));

    // NextResponse.next() in tests returns a response with status 200 or similar
    expect(response?.status).toBe(200);
  });
});
