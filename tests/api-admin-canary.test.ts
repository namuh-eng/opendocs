import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

function makeNextRequest(url: string, init: RequestInit = {}): NextRequest {
  const request = new Request(url, init) as NextRequest;
  Object.defineProperty(request, "nextUrl", {
    value: new URL(url),
    configurable: true,
  });
  return request;
}

const getSessionMock = vi.fn();
const headersMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

describe("POST /api/admin/canary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
  });

  it("returns 401 when unauthenticated", async () => {
    getSessionMock.mockResolvedValue(null);
    const { POST } = await import("@/app/api/admin/canary/route");
    const response = await POST(
      makeNextRequest("http://localhost/api/admin/canary", {
        method: "POST",
        body: JSON.stringify({ action: "promote" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 for non-admin members", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ role: "editor", orgId: "org-1" }]),
    });

    const { POST } = await import("@/app/api/admin/canary/route");
    const response = await POST(
      makeNextRequest("http://localhost/api/admin/canary", {
        method: "POST",
        body: JSON.stringify({ action: "promote" }),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("returns 200 for valid promote action by admin", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ role: "admin", orgId: "org-1" }]),
    });

    const { POST } = await import("@/app/api/admin/canary/route");
    const response = await POST(
      makeNextRequest("http://localhost/api/admin/canary", {
        method: "POST",
        body: JSON.stringify({ action: "promote", version: "v1.2.3" }),
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.action).toBe("promote");
    expect(data.status).toBe("in_progress");
  });

  it("returns 400 for invalid action", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ role: "admin", orgId: "org-1" }]),
    });

    const { POST } = await import("@/app/api/admin/canary/route");
    const response = await POST(
      makeNextRequest("http://localhost/api/admin/canary", {
        method: "POST",
        body: JSON.stringify({ action: "delete-everything" }),
      }),
    );
    expect(response.status).toBe(400);
  });
});
