import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

function makeNextRequest(url: string): NextRequest {
  const request = new Request(url) as NextRequest;
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

describe("GET /api/admin/audit-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    headersMock.mockResolvedValue(new Headers());
    getSessionMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/admin/audit-logs/route");
    const response = await GET(
      makeNextRequest("http://localhost/api/admin/audit-logs"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 403 for non-admins", async () => {
    headersMock.mockResolvedValue(new Headers());
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1", role: "viewer" }]),
    });

    const { GET } = await import("@/app/api/admin/audit-logs/route");
    const response = await GET(
      makeNextRequest("http://localhost/api/admin/audit-logs"),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Admin role required",
    });
  });

  it("returns recent logs for the current org for admins", async () => {
    headersMock.mockResolvedValue(new Headers());
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    const membershipLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1", role: "admin" }]),
    };

    const logsLookup = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: "log-1",
          action: "project_created",
          createdAt: new Date("2026-04-23T01:00:00Z"),
        },
      ]),
    };

    selectMock
      .mockReturnValueOnce(membershipLookup)
      .mockReturnValueOnce(logsLookup);

    const { GET } = await import("@/app/api/admin/audit-logs/route");
    const response = await GET(
      makeNextRequest("http://localhost/api/admin/audit-logs?limit=10"),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.logs).toHaveLength(1);
    expect(data.logs[0].id).toBe("log-1");
  });
});
