import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

function makeNextRequest(
  url: string,
  method = "GET",
  body?: unknown,
): NextRequest {
  const request = new Request(url, {
    method,
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
const deleteMock = vi.fn();
const fromMock = vi.fn();
const whereMock = vi.fn();
const limitMock = vi.fn();
const returningMock = vi.fn();

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
    delete: deleteMock,
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

describe("DELETE /api/analytics/manual-handoffs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    headersMock.mockResolvedValue(new Headers());
    getSessionMock.mockResolvedValue(null);

    const { DELETE } = await import(
      "@/app/api/analytics/manual-handoffs/[id]/route"
    );
    const response = await DELETE(
      makeNextRequest(
        "http://localhost:3000/api/analytics/manual-handoffs/handoff-1",
        "DELETE",
      ),
      { params: Promise.resolve({ id: "handoff-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when user is not an admin", async () => {
    headersMock.mockResolvedValue(new Headers());
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock.mockReturnValue({
      from: fromMock.mockReturnThis(),
      where: whereMock.mockReturnThis(),
      limit: limitMock.mockResolvedValue([{ orgId: "org-1", role: "editor" }]),
    });

    const { DELETE } = await import(
      "@/app/api/analytics/manual-handoffs/[id]/route"
    );
    const response = await DELETE(
      makeNextRequest(
        "http://localhost:3000/api/analytics/manual-handoffs/handoff-1",
        "DELETE",
      ),
      { params: Promise.resolve({ id: "handoff-1" }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Forbidden - Admin required",
    });
  });

  it("returns 404 when handoff record does not exist or user doesn't have access", async () => {
    headersMock.mockResolvedValue(new Headers());
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock.mockReturnValue({
      from: fromMock.mockReturnThis(),
      where: whereMock.mockReturnThis(),
      limit: limitMock.mockResolvedValue([{ orgId: "org-1", role: "admin" }]),
    });

    deleteMock.mockReturnValue({
      where: whereMock.mockReturnThis(),
      returning: returningMock.mockResolvedValue([]),
    });

    const { DELETE } = await import(
      "@/app/api/analytics/manual-handoffs/[id]/route"
    );
    const response = await DELETE(
      makeNextRequest(
        "http://localhost:3000/api/analytics/manual-handoffs/handoff-1",
        "DELETE",
      ),
      { params: Promise.resolve({ id: "handoff-1" }) },
    );

    expect(response.status).toBe(404);
  });

  it("deletes the handoff record and returns 200 for admins", async () => {
    headersMock.mockResolvedValue(new Headers());
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock.mockReturnValue({
      from: fromMock.mockReturnThis(),
      where: whereMock.mockReturnThis(),
      limit: limitMock.mockResolvedValue([{ orgId: "org-1", role: "admin" }]),
    });

    deleteMock.mockReturnValue({
      where: whereMock.mockReturnThis(),
      returning: returningMock.mockResolvedValue([{ id: "handoff-1" }]),
    });

    const { DELETE } = await import(
      "@/app/api/analytics/manual-handoffs/[id]/route"
    );
    const response = await DELETE(
      makeNextRequest(
        "http://localhost:3000/api/analytics/manual-handoffs/handoff-1",
        "DELETE",
      ),
      { params: Promise.resolve({ id: "handoff-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      deletedId: "handoff-1",
    });
  });
});
