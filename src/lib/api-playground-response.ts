export interface ApiPlaygroundProxyResult {
  status: number;
  body: string;
  headers: Record<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringifyBody(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function normalizeHeaders(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};

  const headers: Record<string, string> = {};
  for (const [key, headerValue] of Object.entries(value)) {
    headers[key] = String(headerValue);
  }
  return headers;
}

export function normalizeApiPlaygroundProxyResult(
  value: unknown,
  fallbackStatus: number,
): ApiPlaygroundProxyResult {
  if (!isRecord(value)) {
    return {
      status: fallbackStatus,
      body: stringifyBody(value),
      headers: {},
    };
  }

  const payloadStatus =
    typeof value.status === "number" && value.status > 0
      ? value.status
      : undefined;
  const body =
    value.body !== undefined
      ? stringifyBody(value.body)
      : stringifyBody(value.error);

  return {
    status: payloadStatus ?? fallbackStatus,
    body,
    headers: normalizeHeaders(value.headers),
  };
}

export function apiPlaygroundStatusClass(status: number): string {
  if (!Number.isFinite(status) || status <= 0) {
    return "api-status-code status-5xx";
  }
  return `api-status-code status-${Math.floor(status / 100)}xx`;
}
