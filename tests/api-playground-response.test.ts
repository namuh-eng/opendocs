import {
  apiPlaygroundStatusClass,
  normalizeApiPlaygroundProxyResult,
} from "@/lib/api-playground-response";
import { describe, expect, it } from "vitest";

describe("normalizeApiPlaygroundProxyResult", () => {
  it("keeps upstream response status, body, and headers", () => {
    expect(
      normalizeApiPlaygroundProxyResult(
        {
          status: 404,
          body: '{"error":"missing"}',
          headers: { "content-type": "application/json" },
        },
        200,
      ),
    ).toEqual({
      status: 404,
      body: '{"error":"missing"}',
      headers: { "content-type": "application/json" },
    });
  });

  it("uses the proxy HTTP status and error message for proxy errors", () => {
    expect(
      normalizeApiPlaygroundProxyResult(
        { error: "Too many proxy requests" },
        429,
      ),
    ).toEqual({
      status: 429,
      body: "Too many proxy requests",
      headers: {},
    });
  });

  it("uses proxy HTTP status when the proxy payload has status zero", () => {
    expect(
      normalizeApiPlaygroundProxyResult(
        { status: 0, body: "fetch failed", headers: {} },
        502,
      ),
    ).toEqual({
      status: 502,
      body: "fetch failed",
      headers: {},
    });
  });
});

describe("apiPlaygroundStatusClass", () => {
  it("maps HTTP status classes", () => {
    expect(apiPlaygroundStatusClass(202)).toBe("api-status-code status-2xx");
    expect(apiPlaygroundStatusClass(429)).toBe("api-status-code status-4xx");
  });

  it("falls back to an error style for invalid statuses", () => {
    expect(apiPlaygroundStatusClass(0)).toBe("api-status-code status-5xx");
  });
});
