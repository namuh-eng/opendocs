/**
 * MCP server page utilities — derives MCP URL and available tools from project slug.
 */

/** Build the hosted MCP server URL for a project */
export function getMcpServerUrl(projectSlug: string): string {
  return `https://${projectSlug}.mintlify.app/mcp`;
}

export interface McpTool {
  name: string;
  description: string;
}

/** Generate the standard MCP tool definitions from a project slug */
export function getMcpTools(projectSlug: string): McpTool[] {
  const label = projectSlug.replace(/-/g, "_");
  return [
    {
      name: `search_${label}`,
      description: `Search across the ${projectSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} knowledge base to find relevant information, code examples, API references, and guides. Use this tool when you need to answer questions about ${projectSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}, find specific documentation, understand how features work, or locate implementation details. The search returns contextual content with titles and direct links to the documentation pages. If you need the full content of a specific page, use the get_page tool with the page path from the search results.`,
    },
    {
      name: `get_page_${label}`,
      description: `Retrieve the full content of a specific documentation page from ${projectSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} by its path. Use this tool when you already know the page path (e.g., from search results) and need the complete content of that page rather than just a snippet.`,
    },
  ];
}

/** Convert slug to title case label */
export function slugToTitle(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
