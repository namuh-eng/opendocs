import {
  isValidDateString,
  paginatedResponse,
  parseExportParams,
} from "@/lib/analytics-export";
import { describe, expect, it } from "vitest";

/** Helper to create a fake NextRequest with the given search params. */
function fakeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost:3015/api/v1/analytics/views");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return { nextUrl: url } as { nextUrl: URL };
}

describe("parseExportParams", () => {
  it("parses projectId, dateFrom, dateTo, limit, offset", () => {
    const req = fakeRequest({
      projectId: "abc-123",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      limit: "50",
      offset: "10",
    });
    // biome-ignore lint/suspicious/noExplicitAny: test helper cast
    const result = parseExportParams(req as any);
    expect(result.projectId).toBe("abc-123");
    expect(result.dateFrom).toEqual(new Date("2026-01-01T00:00:00Z"));
    expect(result.dateTo).toEqual(new Date("2026-01-31T23:59:59.999Z"));
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(10);
  });

  it("returns null projectId if missing", () => {
    const req = fakeRequest({});
    // biome-ignore lint/suspicious/noExplicitAny: test helper cast
    const result = parseExportParams(req as any);
    expect(result.projectId).toBeNull();
  });

  it("returns null dates if not provided", () => {
    const req = fakeRequest({ projectId: "x" });
    // biome-ignore lint/suspicious/noExplicitAny: test helper cast
    const result = parseExportParams(req as any);
    expect(result.dateFrom).toBeNull();
    expect(result.dateTo).toBeNull();
  });

  it("defaults limit to 100 and offset to 0", () => {
    const req = fakeRequest({ projectId: "x" });
    // biome-ignore lint/suspicious/noExplicitAny: test helper cast
    const result = parseExportParams(req as any);
    expect(result.limit).toBe(100);
    expect(result.offset).toBe(0);
  });

  it("clamps limit to MAX_LIMIT (1000)", () => {
    const req = fakeRequest({ projectId: "x", limit: "5000" });
    // biome-ignore lint/suspicious/noExplicitAny: test helper cast
    const result = parseExportParams(req as any);
    expect(result.limit).toBe(1000);
  });

  it("resets negative limit to default", () => {
    const req = fakeRequest({ projectId: "x", limit: "-5" });
    // biome-ignore lint/suspicious/noExplicitAny: test helper cast
    const result = parseExportParams(req as any);
    expect(result.limit).toBe(100);
  });

  it("resets NaN limit to default", () => {
    const req = fakeRequest({ projectId: "x", limit: "abc" });
    // biome-ignore lint/suspicious/noExplicitAny: test helper cast
    const result = parseExportParams(req as any);
    expect(result.limit).toBe(100);
  });

  it("resets negative offset to 0", () => {
    const req = fakeRequest({ projectId: "x", offset: "-10" });
    // biome-ignore lint/suspicious/noExplicitAny: test helper cast
    const result = parseExportParams(req as any);
    expect(result.offset).toBe(0);
  });
});

describe("paginatedResponse", () => {
  it("wraps data with pagination metadata", () => {
    const data = [{ id: 1 }, { id: 2 }];
    const result = paginatedResponse(data, 100, 10, 20);
    expect(result).toEqual({
      data: [{ id: 1 }, { id: 2 }],
      pagination: { total: 100, limit: 10, offset: 20 },
    });
  });

  it("handles empty data array", () => {
    const result = paginatedResponse([], 0, 50, 0);
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });
});

describe("isValidDateString", () => {
  it("accepts valid YYYY-MM-DD dates", () => {
    expect(isValidDateString("2026-01-15")).toBe(true);
    expect(isValidDateString("2025-12-31")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidDateString("01-15-2026")).toBe(false);
    expect(isValidDateString("2026/01/15")).toBe(false);
    expect(isValidDateString("not-a-date")).toBe(false);
    expect(isValidDateString("")).toBe(false);
  });

  it("rejects partial date strings", () => {
    expect(isValidDateString("2026-01")).toBe(false);
    expect(isValidDateString("2026")).toBe(false);
  });
});
