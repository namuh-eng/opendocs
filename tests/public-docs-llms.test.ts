import { buildPublicDocsBaseUrl } from "@/lib/public-docs-llms";
import { describe, expect, it } from "vitest";

describe("buildPublicDocsBaseUrl", () => {
  it("builds the docs-site base URL from the request origin", () => {
    expect(buildPublicDocsBaseUrl("https://opendocs.namuh.co", "acme")).toBe(
      "https://opendocs.namuh.co/docs/acme",
    );
  });

  it("normalizes trailing slashes on the origin", () => {
    expect(buildPublicDocsBaseUrl("https://example.com/", "docs")).toBe(
      "https://example.com/docs/docs",
    );
  });
});
