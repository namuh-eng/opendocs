import { slugToTitle } from "@/lib/mcp";

export interface PublicMcpDescriptorProject {
  name: string;
  subdomain: string;
}

export function toMcpToolLabel(subdomain: string) {
  return subdomain.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function buildPublicMcpDescriptor(
  project: PublicMcpDescriptorProject,
  origin: string,
) {
  const toolLabel = toMcpToolLabel(project.subdomain) || "docs";
  const title = project.name || slugToTitle(project.subdomain);
  const docsBaseUrl = `${origin.replace(/\/+$/, "")}/docs/${project.subdomain}`;

  return {
    server: {
      name: title,
      version: "1.0.0",
      transport: "http",
    },
    capabilities: {
      tools: {
        [`search_${toolLabel}`]: {
          name: `search_${toolLabel}`,
          description: `Search across the ${title} documentation knowledge base to find relevant pages, code examples, API references, and guides. Results should link back to ${docsBaseUrl}. Use query_docs_filesystem_${toolLabel} when full Markdown page content is needed.`,
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description:
                  "A query to search the documentation content with.",
              },
              language: {
                type: "string",
                description:
                  "Filter to a specific language code, such as 'en'. Defaults to 'en'.",
              },
            },
            required: ["query"],
          },
          operationId: `${toolLabel}_search`,
        },
        [`query_docs_filesystem_${toolLabel}`]: {
          name: `query_docs_filesystem_${toolLabel}`,
          description: `Run a read-only shell-like query against the ${title} documentation content. Use this tool for exact keyword matches, docs structure exploration, or reading full page content from ${docsBaseUrl} Markdown exports. Supported commands include rg, grep, find, tree, ls, cat, head, tail, stat, wc, sort, uniq, cut, sed, awk, and jq.`,
          inputSchema: {
            type: "object",
            properties: {
              command: {
                type: "string",
                description:
                  'A shell-like read-only command for the documentation content, such as `rg -il "keyword" /`, `tree / -L 2`, or `head -80 /introduction.md`.',
              },
            },
            required: ["command"],
          },
          operationId: `${toolLabel}_query_docs_filesystem`,
        },
      },
      resources: [
        {
          uri: `${docsBaseUrl}/llms.txt`,
          name: `${title} llms.txt`,
          description: `Machine-readable index for ${title} documentation pages.`,
          mimeType: "text/markdown",
        },
        {
          uri: `${docsBaseUrl}/llms-full.txt`,
          name: `${title} llms-full.txt`,
          description: `Full Markdown export for ${title} documentation pages.`,
          mimeType: "text/markdown",
        },
      ],
      prompts: [],
    },
  };
}
