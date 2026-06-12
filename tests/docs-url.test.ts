import { afterEach, describe, expect, it, vi } from "vitest";
import { docsDisplayUrl, docsSiteUrl } from "@/lib/docs-url";

// Both helpers treat empty strings as unset, so stubbing with "" exercises
// the fallback branches without mutating process.env directly.
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("docs site url helpers", () => {
  it("uses the docs root domain subdomain when configured", () => {
    vi.stubEnv("NEXT_PUBLIC_DOCS_ROOT_DOMAIN", "namuh.dev");
    expect(docsSiteUrl("acme-docs")).toBe("https://acme-docs.namuh.dev");
    expect(docsDisplayUrl("acme-docs")).toBe("acme-docs.namuh.dev");
  });

  it("falls back to a path-based URL on the app origin in dev", () => {
    vi.stubEnv("NEXT_PUBLIC_DOCS_ROOT_DOMAIN", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3015");
    expect(docsSiteUrl("acme-docs")).toBe(
      "http://localhost:3015/docs/acme-docs",
    );
    expect(docsDisplayUrl("acme-docs")).toBe("localhost:3015/docs/acme-docs");
  });

  it("trims stray dots and slashes from configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_DOCS_ROOT_DOMAIN", ".namuh.dev");
    expect(docsSiteUrl("acme-docs")).toBe("https://acme-docs.namuh.dev");
  });
});
