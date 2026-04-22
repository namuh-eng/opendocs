import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

function makeNextRequest(url: string, body?: Record<string, unknown>): NextRequest {
  const request = new Request(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }) as NextRequest;
  Object.defineProperty(request, "nextUrl", {
    value: new URL(url),
    configurable: true,
  });
  return request;
}

const getSessionMock = vi.fn();
const headersMock = vi.fn();
const selectMock = vi.fn();
const insertMock = vi.fn();

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
    insert: insertMock,
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

describe("POST /api/analytics/manual-handoffs/[id]/resolve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
  });

  it("returns 401 when unauthenticated", async () => {
    getSessionMock.mockResolvedValue(null);

    const { POST } = await import(
      "@/app/api/analytics/manual-handoffs/[id]/resolve/route"
    );
    const response = await POST(makeNextRequest("http://localhost:3000"), {
      params: Promise.resolve({ id: "audit-1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("creates a resolution audit record", async () => {
    getSessionMock.mockResolvedValue({
      user: { id: "user-1", name: "Test User" },
    });

    const membershipChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    };

    const handoffChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: "audit-1",
          orgId: "org-1",
          action: "deployment_manual_handoff_required",
          details: { deploymentId: "dep-1" },
        },
      ]),
    };

    const returningMock = vi.fn().mockResolvedValue([
      {
        id: "audit-2",
        action: "deployment_manual_handoff_required_resolved",
        createdAt: new Date("2026-04-22T12:00:00.000Z"),
      },
    ]);

    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    insertMock.mockReturnValue({ values: valuesMock });

    selectMock.mockReturnValueOnce(membershipChain).mockReturnValueOnce(handoffChain);

    const { POST } = await import(
      "@/app/api/analytics/manual-handoffs/[id]/resolve/route"
    );
    const response = await POST(makeNextRequest("http://localhost:3000"), {
      params: Promise.resolve({ id: "audit-1" }),
    });

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({
          handoffId: "audit-1",
          resolvedByUserId: "user-1",
          resolvedByName: "Test User",
          resolvedAt: expect.any(String),
          resolutionNote: null,
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      resolution: {
        id: "audit-2",
        action: "deployment_manual_handoff_required_resolved",
        createdAt: "2026-04-22T12:00:00.000Z",
      },
    });
  });

  it("stores an optional resolution note", async () => {
    getSessionMock.mockResolvedValue({
      user: { id: "user-1", name: "Test User" },
    });

    const membershipChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
    };

    const handoffChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: "audit-1",
          orgId: "org-1",
          action: "deployment_manual_handoff_required",
          details: { deploymentId: "dep-1" },
        },
      ]),
    };

    const returningMock = vi.fn().mockResolvedValue([
      {
        id: "audit-2",
        action: "deployment_manual_handoff_required_resolved",
        createdAt: new Date("2026-04-22T12:00:00.000Z"),
      },
    ]);

    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    insertMock.mockReturnValue({ values: valuesMock });

    selectMock
      .mockReturnValueOnce(membershipChain)
      .mockReturnValueOnce(handoffChain);

    const { POST } = await import(
      "@/app/api/analytics/manual-handoffs/[id]/resolve/route"
    );
    const response = await POST(
      makeNextRequest("http://localhost:3000", {
        note: "Resolved after confirming deploy completed manually.",
      }),
      {
        params: Promise.resolve({ id: "audit-1" }),
      },
    );

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({
          resolutionNote: "Resolved after confirming deploy completed manually.",
        }),
      }),
    );

    expect(response.status).toBe(200);
  });
});
