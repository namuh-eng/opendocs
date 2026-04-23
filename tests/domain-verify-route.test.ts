import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

function makeRequest(): NextRequest {
  return new Request("http://localhost:3000/api/projects/project-1/domain/verify", {
    method: "POST",
  }) as NextRequest;
}

const getSessionMock = vi.fn();
const headersMock = vi.fn();
const selectMock = vi.fn();
const updateMock = vi.fn();
const resolveCnameMock = vi.fn();

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
    update: updateMock,
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("node:dns", () => ({
  promises: {
    resolveCname: resolveCnameMock,
  },
}));

describe("POST /api/projects/[id]/domain/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    headersMock.mockResolvedValue(new Headers());
  });

  it("returns 403 when the user has no organization", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    });

    const { POST } = await import("@/app/api/projects/[id]/domain/verify/route");
    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: "project-1" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "No organization" });
  });

  it("returns 400 when no custom domain is configured", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });

    selectMock
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: "project-1",
            orgId: "org-1",
            slug: "docs",
            subdomain: "docs",
            customDomain: null,
            settings: {},
          },
        ]),
      });

    const { POST } = await import("@/app/api/projects/[id]/domain/verify/route");
    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: "project-1" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "No custom domain configured",
    });
  });

  it("marks the domain verified when DNS matches the expected target", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    resolveCnameMock.mockResolvedValue(["docs.mintlify-hosting.app"]);

    selectMock
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: "project-1",
            orgId: "org-1",
            slug: "docs",
            subdomain: "docs",
            customDomain: "docs.example.com",
            settings: { theme: "dark" },
          },
        ]),
      });

    const whereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    updateMock.mockReturnValue({ set: setMock });

    const { POST } = await import("@/app/api/projects/[id]/domain/verify/route");
    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: "project-1" }),
    });

    expect(resolveCnameMock).toHaveBeenCalledWith("docs.example.com");
    expect(setMock).toHaveBeenCalledWith({
      settings: {
        theme: "dark",
        domainVerifiedAt: expect.any(String),
      },
      updatedAt: expect.any(Date),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "verified",
      domain: "docs.example.com",
      cnameTarget: "docs.mintlify-hosting.app",
    });
  });

  it("returns pending when DNS does not match the expected target", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    resolveCnameMock.mockResolvedValue(["elsewhere.example.net"]);

    selectMock
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ orgId: "org-1" }]),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: "project-1",
            orgId: "org-1",
            slug: "docs",
            subdomain: "docs",
            customDomain: "docs.example.com",
            settings: {},
          },
        ]),
      });

    const { POST } = await import("@/app/api/projects/[id]/domain/verify/route");
    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: "project-1" }),
    });

    expect(updateMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "pending",
      domain: "docs.example.com",
      cnameTarget: "docs.mintlify-hosting.app",
      message:
        "CNAME record for docs.example.com does not point to docs.mintlify-hosting.app",
    });
  });
});
