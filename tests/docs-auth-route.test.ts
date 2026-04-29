import { normalizeDocsReturnTo } from "@/app/api/docs/[subdomain]/auth/route";
import { describe, expect, it } from "vitest";

describe("docs auth route", () => {
  it("allows same-site docs return paths", () => {
    expect(normalizeDocsReturnTo("/docs/acme/intro", "acme")).toBe(
      "/docs/acme/intro",
    );
  });

  it("falls back when returnTo points outside the docs site", () => {
    expect(normalizeDocsReturnTo("/settings", "acme")).toBe("/docs/acme");
    expect(normalizeDocsReturnTo("https://evil.test", "acme")).toBe(
      "/docs/acme",
    );
    expect(normalizeDocsReturnTo("//evil.test", "acme")).toBe("/docs/acme");
  });
});
