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
const fromMock = vi.fn();
const whereMock = vi.fn();
const limitMock = vi.fn();
const orderByMock = vi.fn();

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

describe("GET /api/analytics/manual-handoffs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    headersMock.mockResolvedValue(new Headers());
    getSessionMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/analytics/manual-handoffs/route");
    const response = await GET(
      makeNextRequest("http://localhost:3000/api/analytics/manual-handoffs"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns recent handoff records for the current org", async () => {
    headersMock.mockResolvedValue(new Headers());
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    const membershipChain = {
      from: fromMock.mockReturnThis(),
      where: whereMock.mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    };

    const handoffsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: orderByMock.mockReturnThis(),
      limit: limitMock.mockResolvedValue([
        {
          id: "audit-1",
          action: "deployment_manual_handoff_required",
          userId: "user-1",
          details: { deploymentId: "dep-1", projectId: "proj-1" },
          createdAt: new Date("2026-04-22T11:00:00.000Z"),
        },
      ]),
    };

    const totalChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 1 }]),
    };

    selectMock
      .mockReturnValueOnce(membershipChain)
      .mockReturnValueOnce(handoffsChain)
      .mockReturnValueOnce(totalChain);

    const { GET } = await import("@/app/api/analytics/manual-handoffs/route");
    const response = await GET(
      makeNextRequest(
        "http://localhost:3000/api/analytics/manual-handoffs?limit=10",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      handoffs: [
        {
          id: "audit-1",
          action: "deployment_manual_handoff_required",
          userId: "user-1",
          details: { deploymentId: "dep-1", projectId: "proj-1" },
          createdAt: "2026-04-22T11:00:00.000Z",
        },
      ],
      total: 1,
      filters: {
        action: null,
        projectId: null,
        includeResolved: false,
        limit: 10,
      },
    });
  });

  it("returns applied filters metadata", async () => {
    headersMock.mockResolvedValue(new Headers());
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    const membershipChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    };

    const handoffsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    const totalChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 0 }]),
    };

    selectMock
      .mockReturnValueOnce(membershipChain)
      .mockReturnValueOnce(handoffsChain)
      .mockReturnValueOnce(totalChain);

    const { GET } = await import("@/app/api/analytics/manual-handoffs/route");
    const response = await GET(
      makeNextRequest(
        "http://localhost:3000/api/analytics/manual-handoffs?action=deployment_manual_handoff_required&projectId=proj-1&limit=5",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      handoffs: [],
      total: 0,
      filters: {
        action: "deployment_manual_handoff_required",
        projectId: "proj-1",
        includeResolved: false,
        limit: 5,
      },
    });
  });

  it("excludes handoffs that already have a resolution event", async () => {
    headersMock.mockResolvedValue(new Headers());
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    const membershipChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    };

    const handoffsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    const totalChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 0 }]),
    };

    selectMock
      .mockReturnValueOnce(membershipChain)
      .mockReturnValueOnce(handoffsChain)
      .mockReturnValueOnce(totalChain);

    const { GET } = await import("@/app/api/analytics/manual-handoffs/route");
    const response = await GET(
      makeNextRequest("http://localhost:3000/api/analytics/manual-handoffs"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      handoffs: [],
      total: 0,
      filters: {
        action: null,
        projectId: null,
        includeResolved: false,
        limit: 20,
      },
    });
  });

  it("can include resolved handoffs when requested", async () => {
    headersMock.mockResolvedValue(new Headers());
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    const membershipChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    };

    const handoffsChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: "audit-1",
          action: "deployment_manual_handoff_required",
          userId: "user-1",
          details: { deploymentId: "dep-1", projectId: "proj-1" },
          createdAt: new Date("2026-04-22T11:00:00.000Z"),
        },
      ]),
    };

    const totalChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 1 }]),
    };

    selectMock
      .mockReturnValueOnce(membershipChain)
      .mockReturnValueOnce(handoffsChain)
      .mockReturnValueOnce(totalChain);

    const { GET } = await import("@/app/api/analytics/manual-handoffs/route");
    const response = await GET(
      makeNextRequest(
        "http://localhost:3000/api/analytics/manual-handoffs?includeResolved=true",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      handoffs: [
        {
          id: "audit-1",
          action: "deployment_manual_handoff_required",
          userId: "user-1",
          details: { deploymentId: "dep-1", projectId: "proj-1" },
          createdAt: "2026-04-22T11:00:00.000Z",
        },
      ],
      total: 1,
      filters: {
        action: null,
        projectId: null,
        includeResolved: true,
        limit: 20,
      },
    });
  });
});
