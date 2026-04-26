import { beforeEach, describe, expect, it, vi } from "vitest";

const selectMock = vi.fn();
const whereMock = vi.fn();
const limitMock = vi.fn();
const orderByMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

describe("DocsIndex Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectMock.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: whereMock.mockReturnThis(),
      limit: limitMock.mockReturnThis(),
      orderBy: orderByMock.mockReturnThis(),
    });
  });

  it("redirects to introduction if present", async () => {
    const { redirect } = await import("next/navigation");
    const { default: DocsIndex } = await import("@/app/docs/[subdomain]/page");

    // Project lookup
    limitMock.mockResolvedValueOnce([{ id: "proj-1" }]);
    // Introduction lookup
    limitMock.mockResolvedValueOnce([{ path: "introduction" }]);

    await DocsIndex({ params: Promise.resolve({ subdomain: "test" }) });

    expect(redirect).toHaveBeenCalledWith("/docs/test/introduction");
  });

  it("falls back to alphabetically first page if introduction is missing", async () => {
    const { redirect } = await import("next/navigation");
    const { default: DocsIndex } = await import("@/app/docs/[subdomain]/page");

    // Project lookup
    limitMock.mockResolvedValueOnce([{ id: "proj-1" }]);
    // Introduction lookup (none)
    limitMock.mockResolvedValueOnce([]);
    // Alphabetical lookup
    limitMock.mockResolvedValueOnce([{ path: "aaa-page" }]);

    await DocsIndex({ params: Promise.resolve({ subdomain: "test" }) });

    expect(redirect).toHaveBeenCalledWith("/docs/test/aaa-page");
  });

  it("shows 404 if no pages exist", async () => {
    const { notFound } = await import("next/navigation");
    const { default: DocsIndex } = await import("@/app/docs/[subdomain]/page");

    // Project lookup
    limitMock.mockResolvedValueOnce([{ id: "proj-1" }]);
    // Introduction lookup (none)
    limitMock.mockResolvedValueOnce([]);
    // Alphabetical lookup (none)
    limitMock.mockResolvedValueOnce([]);

    await DocsIndex({ params: Promise.resolve({ subdomain: "test" }) });

    expect(notFound).toHaveBeenCalled();
  });
});
