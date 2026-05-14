import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authenticateApiKeyMock, selectMock } = vi.hoisted(() => ({
  authenticateApiKeyMock: vi.fn(),
  selectMock: vi.fn(),
}));

vi.mock("@/lib/api-key-auth", () => ({
  authenticateApiKey: authenticateApiKeyMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
  },
}));

function makeRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/v1/assistant/search", {
    method: "POST",
    headers: { authorization: "Bearer mint_dsc_test" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

function mockOrgProjectLookup(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  };
}

function mockPageSearch(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
}

describe("POST /api/v1/assistant/search", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authenticateApiKeyMock.mockResolvedValue({
      type: "assistant",
      orgId: "org-1",
    });
  });

  it("searches published docs pages for assistant API keys", async () => {
    selectMock
      .mockReturnValueOnce(mockOrgProjectLookup([{ id: "project-1" }]))
      .mockReturnValueOnce(
        mockPageSearch([
          {
            path: "quickstart",
            title: "Quickstart",
            description: "Get started fast",
            content: "Install the SDK and make your first request.",
          },
        ]),
      );

    const { POST } = await import("@/app/api/v1/assistant/search/route");
    const response = await POST(makeRequest({ query: "quickstart" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      expect.objectContaining({
        path: "quickstart",
        content: expect.stringContaining("Install the SDK"),
        metadata: expect.objectContaining({ title: "Quickstart" }),
      }),
    ]);
  });

  it("rejects non-assistant API keys", async () => {
    authenticateApiKeyMock.mockResolvedValue({ type: "admin", orgId: "org-1" });

    const { POST } = await import("@/app/api/v1/assistant/search/route");
    const response = await POST(makeRequest({ query: "quickstart" }));

    expect(response.status).toBe(403);
  });
});
