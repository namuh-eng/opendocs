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
const insertMock = vi.fn();
const deleteMock = vi.fn();
const transactionMock = vi.fn();
const executeMock = vi.fn();

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
    delete: deleteMock,
    transaction: transactionMock,
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

describe("Org Lifecycle Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
  });

  describe("POST /api/orgs", () => {
    it("returns 401 when unauthenticated", async () => {
      getSessionMock.mockResolvedValue(null);
      const { POST } = await import("@/app/api/orgs/route");
      const response = await POST(makeNextRequest("http://localhost/api/orgs", {
        method: "POST",
        body: JSON.stringify({ name: "New Org" })
      }));
      expect(response.status).toBe(401);
    });

    it("creates a new org and membership within a transaction", async () => {
      getSessionMock.mockResolvedValue({ user: { id: "user-1", name: "User 1" } });
      
      const mockTx = {
        execute: executeMock.mockResolvedValue(undefined),
        select: vi.fn(),
        insert: vi.fn(),
      };
      
      transactionMock.mockImplementation(async (callback) => {
        return await callback(mockTx);
      });

      // No existing membership
      mockTx.select.mockReturnValueOnce({ from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([]) });
      // No existing slug
      mockTx.select.mockReturnValueOnce({ from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([]) });
      
      const insertOrgReturning = vi.fn().mockResolvedValue([{ id: "org-1", name: "New Org" }]);
      const insertMembershipReturning = vi.fn().mockResolvedValue([{ orgId: "org-1", userId: "user-1", role: "admin" }]);

      mockTx.insert
        .mockReturnValueOnce({ values: vi.fn().mockReturnValue({ returning: insertOrgReturning }) })
        .mockReturnValueOnce({ values: vi.fn().mockReturnValue({ returning: insertMembershipReturning }) });

      const { POST } = await import("@/app/api/orgs/route");
      const response = await POST(makeNextRequest("http://localhost/api/orgs", {
        method: "POST",
        body: JSON.stringify({ name: "New Org" })
      }));

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.org.id).toBe("org-1");
      expect(transactionMock).toHaveBeenCalled();
    });
  });

  describe("DELETE /api/orgs/[id]", () => {
    it("returns 403 for non-admin members", async () => {
      getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
      
      selectMock.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ orgId: "org-1", role: "editor" }]),
      });

      const { DELETE } = await import("@/app/api/orgs/[id]/route");
      const response = await DELETE(makeNextRequest("http://localhost/api/orgs/org-1", {
        method: "DELETE",
        body: JSON.stringify({ reason: "Testing" })
      }), { params: Promise.resolve({ id: "org-1" }) });

      expect(response.status).toBe(403);
    });
  });
});
