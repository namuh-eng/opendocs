import { getClientRateLimitKey } from "@/lib/client-rate-limit-key";
import { describe, expect, it } from "vitest";

describe("getClientRateLimitKey", () => {
  it("normalizes the first valid forwarded IP", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    });

    expect(getClientRateLimitKey(headers, "docs-proxy")).toBe(
      "docs-proxy:ip:203.0.113.10",
    );
  });

  it("prefers proxy-provided single client IP headers over forwarded chains", () => {
    const headers = new Headers({
      "cf-connecting-ip": "2001:db8::1",
      "x-forwarded-for": "198.51.100.20",
    });

    expect(getClientRateLimitKey(headers, "github-webhook")).toBe(
      "github-webhook:ip:2001:db8::1",
    );
  });

  it("falls back for malformed forwarded headers", () => {
    const headers = new Headers({ "x-forwarded-for": "not an ip" });

    expect(getClientRateLimitKey(headers, "docs-proxy")).toBe(
      "docs-proxy:ip:unknown",
    );
  });
});
