import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { hasValidDocsAccessMock, selectMock } = vi.hoisted(() => ({
  hasValidDocsAccessMock: vi.fn(),
  selectMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock("@/lib/project-docs-access", () => ({
  getDocsAccessCookieName: (subdomain: string) => `docs_access_${subdomain}`,
  hasValidDocsAccess: hasValidDocsAccessMock,
}));

function makeRequest(url: string): NextRequest {
  const request = new Request(url) as NextRequest;
  Object.defineProperty(request, "cookies", {
    value: { get: vi.fn().mockReturnValue(undefined) },
    configurable: true,
  });
  return request;
}

function mockProjectLookup(settings: Record<string, unknown>) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: "project-1", settings }]),
  };
}

function mockPageSearch(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
}

describe("GET /api/docs/[subdomain]/search", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    hasValidDocsAccessMock.mockReturnValue(true);
  });

  it("includes generated OpenAPI pages when the query matches endpoint metadata", async () => {
    const openApiSpec = {
      openapi: "3.0.0",
      info: { title: "Plants API", version: "1.0.0" },
      paths: {
        "/plants": {
          get: {
            operationId: "getPlants",
            summary: "Get Plants",
            description: "Returns a list of plants.",
            responses: { "200": { description: "OK" } },
          },
        },
      },
    };

    selectMock
      .mockReturnValueOnce(mockProjectLookup({ openApiSpec }))
      .mockReturnValueOnce(
        mockPageSearch([
          {
            path: "quickstart",
            title: "Quickstart",
            description: null,
            content: "Make your first request to the Plants API.",
          },
        ]),
      );

    const { GET } = await import("@/app/api/docs/[subdomain]/search/route");
    const response = await GET(
      makeRequest("http://localhost/api/docs/test-project/search?q=plants"),
      { params: Promise.resolve({ subdomain: "test-project" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "api-reference/get-plants",
          title: "Get Plants",
          snippet: expect.stringContaining("GET /plants"),
        }),
      ]),
    );
    expect(body[0]).toMatchObject({
      path: "api-reference/get-plants",
      title: "Get Plants",
    });
  });
});
