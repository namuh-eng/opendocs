/**
 * Generates llms.txt and llms-full.txt content from published pages.
 * llms.txt: machine-readable index with page title + URL per line.
 * llms-full.txt: full markdown content of all pages concatenated.
 */

import { docsSiteUrl } from "@/lib/docs-url";

interface PageEntry {
  path: string;
  title: string;
  content: string | null;
}

/**
 * Build a base URL for the project from its domain/subdomain configuration.
 */
export function buildProjectBaseUrl(project: {
  customDomain: string | null;
  subdomain: string | null;
  slug: string;
}): string {
  if (project.customDomain) {
    return `https://${project.customDomain}`;
  }
  if (project.subdomain) {
    return `https://${project.subdomain}`;
  }
  return docsSiteUrl(project.slug);
}

/**
 * Generate llms.txt — one line per page: "- [title](url)"
 * Follows the llms.txt spec: https://llmstxt.org/
 */
export function generateLlmsTxt(
  projectName: string,
  baseUrl: string,
  publishedPages: PageEntry[],
): string {
  const lines: string[] = [];

  lines.push(`# ${projectName}`);
  lines.push("");
  lines.push("> Documentation index for LLM consumption");
  lines.push("");

  if (publishedPages.length === 0) {
    lines.push("No published pages.");
    return lines.join("\n");
  }

  for (const page of publishedPages) {
    const url = `${baseUrl}${page.path.startsWith("/") ? page.path : `/${page.path}`}`;
    lines.push(`- [${page.title}](${url})`);
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Generate llms-full.txt — full content of all pages concatenated.
 * Each page separated by a header with title and path.
 */
export function generateLlmsFullTxt(
  projectName: string,
  baseUrl: string,
  publishedPages: PageEntry[],
): string {
  const lines: string[] = [];

  lines.push(`# ${projectName} — Full Documentation`);
  lines.push("");

  if (publishedPages.length === 0) {
    lines.push("No published pages.");
    return lines.join("\n");
  }

  for (let i = 0; i < publishedPages.length; i++) {
    const page = publishedPages[i];
    const url = `${baseUrl}${page.path.startsWith("/") ? page.path : `/${page.path}`}`;

    lines.push(`## ${page.title}`);
    lines.push("");
    lines.push(`Source: ${url}`);
    lines.push("");
    lines.push(page.content || "*(empty page)*");
    lines.push("");

    if (i < publishedPages.length - 1) {
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}
