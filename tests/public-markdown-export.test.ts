import { parsePublicMarkdownExportPath } from "@/lib/public-markdown-export";
import { describe, expect, it } from "vitest";

describe("parsePublicMarkdownExportPath", () => {
  it("parses a top-level docs markdown export path", () => {
    expect(parsePublicMarkdownExportPath("/docs/acme/introduction.md")).toEqual(
      {
        subdomain: "acme",
        pagePath: "introduction",
      },
    );
  });

  it("parses nested docs markdown export paths", () => {
    expect(
      parsePublicMarkdownExportPath("/docs/acme/guides/quickstart.md"),
    ).toEqual({
      subdomain: "acme",
      pagePath: "guides/quickstart",
    });
  });

  it("ignores normal docs pages and non-markdown assets", () => {
    expect(parsePublicMarkdownExportPath("/docs/acme/introduction")).toBeNull();
    expect(parsePublicMarkdownExportPath("/docs/acme/llms.txt")).toBeNull();
  });
});
