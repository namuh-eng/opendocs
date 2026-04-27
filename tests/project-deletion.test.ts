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
const deleteMock = vi.fn();

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

describe("DELETE /api/projects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
  });

  it("returns 401 when unauthenticated", async () => {
    getSessionMock.mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/projects/[id]/route");
    const response = await DELETE(
      makeNextRequest("http://localhost/api/projects/proj-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "proj-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when user is not an admin", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    // getUserOrgRole
    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1", role: "editor" }]),
    });

    const { DELETE } = await import("@/app/api/projects/[id]/route");
    const response = await DELETE(
      makeNextRequest("http://localhost/api/projects/proj-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "proj-1" }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Only admins can delete projects",
    });
  });

  it("returns 400 when confirmation name mismatch", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    // getUserOrgRole
    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1", role: "admin" }]),
    });

    // Check project exists
    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi
        .fn()
        .mockResolvedValue([
          { id: "proj-1", name: "Correct Name", orgId: "org-1" },
        ]),
    });

    const { DELETE } = await import("@/app/api/projects/[id]/route");
    const response = await DELETE(
      makeNextRequest("http://localhost/api/projects/proj-1", {
        method: "DELETE",
        body: JSON.stringify({ confirmName: "Wrong Name", reason: "Testing" }),
      }),
      { params: Promise.resolve({ id: "proj-1" }) },
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Project name confirmation does not match");
  });

  it("successfully deletes when name matches and not the last project", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    // getUserOrgRole
    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ orgId: "org-1", role: "admin" }]),
    });

    // Check project exists
    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi
        .fn()
        .mockResolvedValue([
          { id: "proj-1", name: "My Project", orgId: "org-1" },
        ]),
    });

    // Count projects (2 total)
    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: 2 }]),
    });

    deleteMock.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    const { DELETE } = await import("@/app/api/projects/[id]/route");
    const response = await DELETE(
      makeNextRequest("http://localhost/api/projects/proj-1", {
        method: "DELETE",
        body: JSON.stringify({
          confirmName: "My Project",
          reason: "No longer needed",
        }),
      }),
      { params: Promise.resolve({ id: "proj-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ success: true }),
    );
  });
});
