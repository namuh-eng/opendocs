/**
 * Shared utilities for v1 analytics export endpoints.
 *
 * All endpoints accept dateFrom/dateTo query params and limit/offset pagination.
 * Auth is via admin API key (Bearer token).
 */

import type { NextRequest } from "next/server";

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface DateRangeParams {
  dateFrom: Date | null;
  dateTo: Date | null;
}

export interface ExportParams extends PaginationParams, DateRangeParams {
  projectId: string;
}

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

/**
 * Parse common export query params from the request URL.
 * Returns null projectId if missing.
 */
export function parseExportParams(request: NextRequest): {
  projectId: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  limit: number;
  offset: number;
} {
  const sp = request.nextUrl.searchParams;
  const projectId = sp.get("projectId");
  const dateFromRaw = sp.get("dateFrom");
  const dateToRaw = sp.get("dateTo");
  const limitRaw = sp.get("limit");
  const offsetRaw = sp.get("offset");

  const dateFrom = dateFromRaw ? new Date(`${dateFromRaw}T00:00:00Z`) : null;
  const dateTo = dateToRaw ? new Date(`${dateToRaw}T23:59:59.999Z`) : null;

  let limit = limitRaw ? Number.parseInt(limitRaw, 10) : DEFAULT_LIMIT;
  if (Number.isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  let offset = offsetRaw ? Number.parseInt(offsetRaw, 10) : 0;
  if (Number.isNaN(offset) || offset < 0) offset = 0;

  return { projectId, dateFrom, dateTo, limit, offset };
}

/**
 * Format a paginated response envelope.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number,
) {
  return {
    data,
    pagination: { total, limit, offset },
  };
}

/**
 * Validate that a date string is a valid YYYY-MM-DD format.
 */
export function isValidDateString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}
