import { describe, expect, it } from "vitest";

const nextConfig = await import("../next.config.js");

describe("security headers", () => {
  it("applies production security headers globally", async () => {
    expect(nextConfig.default.headers).toBeDefined();
    const headersConfig = await nextConfig.default.headers?.();
    if (!headersConfig) throw new Error("Security headers config is missing");
    const globalHeaders = headersConfig.find(
      (entry: { source: string }) => entry.source === "/(.*)",
    );

    expect(globalHeaders).toBeDefined();
    if (!globalHeaders) throw new Error("Global security headers are missing");
    const headers = Object.fromEntries(
      globalHeaders.headers.map((header: { key: string; value: string }) => [
        header.key,
        header.value,
      ]),
    );

    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(headers["Content-Security-Policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["Content-Security-Policy"]).toContain("base-uri 'self'");
    expect(headers["Strict-Transport-Security"]).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
  });
});
