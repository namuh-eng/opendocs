import { buildPublicMcpDescriptor, toMcpToolLabel } from "@/lib/public-mcp";
import { describe, expect, it } from "vitest";

describe("toMcpToolLabel", () => {
  it("converts docs subdomains to MCP-safe tool labels", () => {
    expect(toMcpToolLabel("test-project")).toBe("test_project");
    expect(toMcpToolLabel("docs.example")).toBe("docs_example");
  });
});

describe("buildPublicMcpDescriptor", () => {
  it("builds Mintlify-style server metadata and tools", () => {
    const descriptor = buildPublicMcpDescriptor(
      { name: "Test Project", subdomain: "test-project" },
      "https://opendocs.namuh.co/",
    );

    expect(descriptor.server).toEqual({
      name: "Test Project",
      version: "1.0.0",
      transport: "http",
    });
    expect(descriptor.capabilities.tools.search_test_project).toMatchObject({
      name: "search_test_project",
      operationId: "test_project_search",
    });
    expect(
      descriptor.capabilities.tools.query_docs_filesystem_test_project,
    ).toMatchObject({
      name: "query_docs_filesystem_test_project",
      operationId: "test_project_query_docs_filesystem",
    });
    expect(
      descriptor.capabilities.tools.search_test_project.inputSchema.properties,
    ).toHaveProperty("language");
    expect(descriptor.capabilities.resources[0].uri).toBe(
      "https://opendocs.namuh.co/docs/test-project/llms.txt",
    );
  });
});
