import { getMcpServerUrl, getMcpTools, slugToTitle } from "@/lib/mcp";
import { describe, expect, it } from "vitest";

describe("getMcpServerUrl", () => {
  it("returns correct URL for a simple slug", () => {
    expect(getMcpServerUrl("mint-starter-kit")).toBe(
      "https://mint-starter-kit.mintlify.app/mcp",
    );
  });

  it("returns correct URL for a single-word slug", () => {
    expect(getMcpServerUrl("acme")).toBe("https://acme.mintlify.app/mcp");
  });
});

describe("getMcpTools", () => {
  it("returns exactly 2 tools", () => {
    const tools = getMcpTools("my-project");
    expect(tools).toHaveLength(2);
  });

  it("generates search tool with underscored slug", () => {
    const tools = getMcpTools("mint-starter-kit");
    expect(tools[0].name).toBe("search_mint_starter_kit");
  });

  it("generates get_page tool with underscored slug", () => {
    const tools = getMcpTools("mint-starter-kit");
    expect(tools[1].name).toBe("get_page_mint_starter_kit");
  });

  it("search tool description mentions project title", () => {
    const tools = getMcpTools("mint-starter-kit");
    expect(tools[0].description).toContain("Mint Starter Kit");
  });

  it("get_page tool description mentions project title", () => {
    const tools = getMcpTools("mint-starter-kit");
    expect(tools[1].description).toContain("Mint Starter Kit");
  });

  it("handles single-word slugs", () => {
    const tools = getMcpTools("acme");
    expect(tools[0].name).toBe("search_acme");
    expect(tools[1].name).toBe("get_page_acme");
  });

  it("search description includes guidance about get_page", () => {
    const tools = getMcpTools("docs");
    expect(tools[0].description).toContain("get_page");
  });

  it("get_page description mentions path-based retrieval", () => {
    const tools = getMcpTools("docs");
    expect(tools[1].description).toContain("page path");
  });
});

describe("slugToTitle", () => {
  it("converts hyphenated slug to title case", () => {
    expect(slugToTitle("mint-starter-kit")).toBe("Mint Starter Kit");
  });

  it("capitalizes single-word slug", () => {
    expect(slugToTitle("acme")).toBe("Acme");
  });

  it("handles multiple hyphens", () => {
    expect(slugToTitle("my-cool-docs-project")).toBe("My Cool Docs Project");
  });
});
