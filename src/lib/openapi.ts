/**
 * openapi.ts — Auto-generate API reference pages from OpenAPI 3.x / AsyncAPI 3.0 specs.
 *
 * Core flow:
 * 1. Fetch spec from URL or use inline JSON
 * 2. Parse into flat endpoint list
 * 3. Generate virtual page entries for each endpoint (sidebar + content)
 * 4. Render endpoint pages on-the-fly (no DB pages needed)
 */

import { getCached, setCache } from "@/lib/cache/redis";
import { type OpenApiEndpoint, parseOpenApiSpec } from "@/lib/openapi-parser";

// ── Types ───────────────────────────────────────────────────────────────────────

export interface VirtualApiPage {
  /** Unique ID for nav keying (not a DB id) */
  id: string;
  /** URL path segment under api-reference/ (e.g. "get-plants") */
  path: string;
  /** Display title (e.g. "Get Plants") */
  title: string;
  /** Short description from the spec */
  description: string;
  /** HTTP method for sidebar badge */
  method: string;
  /** Full endpoint data for rendering */
  endpoint: OpenApiEndpoint;
  /** Group label for sidebar grouping (from tags or default "Endpoints") */
  group: string;
}

export interface AsyncApiChannel {
  name: string;
  description: string;
  subscribe?: { summary?: string; message?: Record<string, unknown> };
  publish?: { summary?: string; message?: Record<string, unknown> };
}

export interface VirtualAsyncApiPage {
  id: string;
  path: string;
  title: string;
  description: string;
  channel: AsyncApiChannel;
  group: string;
}

// ── Spec Fetching ───────────────────────────────────────────────────────────────

/**
 * Fetch an OpenAPI/AsyncAPI spec from a URL, with caching.
 * Returns parsed JSON or null on failure.
 */
export async function fetchSpecFromUrl(
  url: string,
): Promise<Record<string, unknown> | null> {
  if (!url.trim()) return null;

  const cacheKey = `spec:url:${url}`;
  const cached = await getCached<Record<string, unknown>>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json, application/yaml" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    const parsed = JSON.parse(text) as Record<string, unknown>;

    // Cache for 1 hour
    await setCache(cacheKey, parsed, 3600);
    return parsed;
  } catch {
    return null;
  }
}

// ── Slug Generation ─────────────────────────────────────────────────────────────

/**
 * Convert an operationId or method+path into a URL-safe slug.
 * "getUserById" → "get-user-by-id"
 * "GET /users/{id}" → "get-users-id"
 */
export function endpointToSlug(endpoint: OpenApiEndpoint): string {
  if (endpoint.operationId) {
    // Convert camelCase/PascalCase to kebab-case
    return endpoint.operationId
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
  }
  // Fallback: method + path
  const pathSlug = endpoint.path
    .replace(/\{[^}]+\}/g, "")
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${endpoint.method.toLowerCase()}-${pathSlug}`;
}

/**
 * Convert an operationId or summary into a human-readable title.
 * "getUserById" → "Get User By Id"
 * Falls back to "METHOD /path"
 */
export function endpointToTitle(endpoint: OpenApiEndpoint): string {
  if (endpoint.summary) return endpoint.summary;
  if (endpoint.operationId) {
    return endpoint.operationId
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
      .replace(/^./, (c) => c.toUpperCase());
  }
  return `${endpoint.method} ${endpoint.path}`;
}

// ── Virtual Page Generation ─────────────────────────────────────────────────────

/**
 * Extract tag from an endpoint's operation object for grouping.
 * Falls back to "Endpoints" if no tags found.
 */
function getEndpointGroup(
  endpoint: OpenApiEndpoint,
  spec: Record<string, unknown>,
): string {
  const paths = spec.paths as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (!paths) return "Endpoints";

  const pathItem = paths[endpoint.path];
  if (!pathItem) return "Endpoints";

  const operation = pathItem[endpoint.method.toLowerCase()] as
    | Record<string, unknown>
    | undefined;
  if (!operation) return "Endpoints";

  const tags = operation.tags as string[] | undefined;
  if (tags && tags.length > 0) {
    return tags[0];
  }
  return "Endpoints";
}

/**
 * Generate virtual API reference pages from an OpenAPI spec.
 * These are not stored in the DB — they're generated at request time.
 */
export function generateVirtualPages(
  spec: Record<string, unknown>,
): VirtualApiPage[] {
  const endpoints = parseOpenApiSpec(spec);
  if (endpoints.length === 0) return [];

  const pages: VirtualApiPage[] = [];
  const slugCounts = new Map<string, number>();

  for (const ep of endpoints) {
    let slug = endpointToSlug(ep);
    // Deduplicate slugs
    const count = slugCounts.get(slug) || 0;
    if (count > 0) {
      slug = `${slug}-${count}`;
    }
    slugCounts.set(slug, count + 1);

    pages.push({
      id: `openapi-${slug}`,
      path: `api-reference/${slug}`,
      title: endpointToTitle(ep),
      description: ep.description || ep.summary || "",
      method: ep.method,
      endpoint: ep,
      group: getEndpointGroup(ep, spec),
    });
  }

  return pages;
}

// ── AsyncAPI Support ────────────────────────────────────────────────────────────

/**
 * Detect whether a spec is AsyncAPI (has asyncapi version field).
 */
export function isAsyncApiSpec(spec: Record<string, unknown>): boolean {
  return typeof spec.asyncapi === "string";
}

/**
 * Parse AsyncAPI 3.0 spec channels into virtual pages.
 */
export function generateAsyncApiPages(
  spec: Record<string, unknown>,
): VirtualAsyncApiPage[] {
  if (!isAsyncApiSpec(spec)) return [];

  const channels = spec.channels as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (!channels) return [];

  const results: VirtualAsyncApiPage[] = [];

  for (const [channelName, channelDef] of Object.entries(channels)) {
    if (typeof channelDef !== "object" || channelDef === null) continue;

    const slug = channelName
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    const description = (channelDef.description as string) || "";

    const channel: AsyncApiChannel = {
      name: channelName,
      description,
      subscribe: channelDef.subscribe as AsyncApiChannel["subscribe"],
      publish: channelDef.publish as AsyncApiChannel["publish"],
    };

    // Determine group from tags or default
    const tags = channelDef.tags as Array<{ name: string }> | undefined;
    const group = tags && tags.length > 0 ? tags[0].name : "WebSocket Channels";

    results.push({
      id: `asyncapi-${slug}`,
      path: `api-reference/${slug}`,
      title: channelName,
      description,
      channel,
      group,
    });
  }

  return results;
}

// ── AsyncAPI HTML Rendering ─────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render an AsyncAPI channel page as HTML.
 */
export function renderAsyncApiChannelPage(page: VirtualAsyncApiPage): string {
  const ch = page.channel;

  let html = `<div class="api-ref-page asyncapi-channel" data-testid="asyncapi-channel-page">`;

  // Header
  html += `<div class="api-ref-header">
  <div class="api-ref-method-url">
    <span class="method-badge method-hook">WS</span>
    <span class="api-ref-path">${escapeHtml(ch.name)}</span>
  </div>
</div>`;

  // Description
  if (ch.description) {
    html += `<div class="api-ref-description"><p>${escapeHtml(ch.description)}</p></div>`;
  }

  // Subscribe operation
  if (ch.subscribe) {
    html += `<div class="api-ref-params-section" data-testid="subscribe-section">
  <h3 class="api-ref-section-heading">Subscribe</h3>`;
    if (ch.subscribe.summary) {
      html += `<p class="api-ref-status-desc">${escapeHtml(ch.subscribe.summary)}</p>`;
    }
    if (ch.subscribe.message) {
      html += `<pre><code>${escapeHtml(JSON.stringify(ch.subscribe.message, null, 2))}</code></pre>`;
    }
    html += "</div>";
  }

  // Publish operation
  if (ch.publish) {
    html += `<div class="api-ref-params-section" data-testid="publish-section">
  <h3 class="api-ref-section-heading">Publish</h3>`;
    if (ch.publish.summary) {
      html += `<p class="api-ref-status-desc">${escapeHtml(ch.publish.summary)}</p>`;
    }
    if (ch.publish.message) {
      html += `<pre><code>${escapeHtml(JSON.stringify(ch.publish.message, null, 2))}</code></pre>`;
    }
    html += "</div>";
  }

  html += "</div>";
  return html;
}

// ── Go Code Example ─────────────────────────────────────────────────────────────

/**
 * Generate a Go code example for an endpoint.
 */
export function generateGoExample(endpoint: OpenApiEndpoint): string {
  const lines: string[] = [];
  lines.push("package main");
  lines.push("");
  lines.push("import (");
  lines.push('	"fmt"');
  lines.push('	"io"');
  lines.push('	"net/http"');
  if (endpoint.requestBody) {
    lines.push('	"strings"');
  }
  lines.push(")");
  lines.push("");
  lines.push("func main() {");

  const url = `${endpoint.baseUrl}${endpoint.path}`;

  if (endpoint.requestBody) {
    lines.push("\tbody := strings.NewReader(`{}`)");
    lines.push(
      `	req, _ := http.NewRequest("${endpoint.method}", "${url}", body)`,
    );
  } else {
    lines.push(
      `	req, _ := http.NewRequest("${endpoint.method}", "${url}", nil)`,
    );
  }

  if (endpoint.auth?.scheme === "bearer") {
    lines.push(`	req.Header.Set("Authorization", "Bearer <token>")`);
  }
  if (endpoint.requestBody) {
    lines.push(
      `	req.Header.Set("Content-Type", "${endpoint.requestBody.contentType}")`,
    );
  }

  lines.push("	resp, _ := http.DefaultClient.Do(req)");
  lines.push("	defer resp.Body.Close()");
  lines.push("	data, _ := io.ReadAll(resp.Body)");
  lines.push("	fmt.Println(string(data))");
  lines.push("}");

  return lines.join("\n");
}

// ── Nav Builder Integration ─────────────────────────────────────────────────────

export interface VirtualNavGroup {
  groupLabel: string;
  items: Array<{
    id: string;
    path: string;
    title: string;
    method: string;
  }>;
}

/**
 * Build nav groups from virtual API pages for sidebar integration.
 * Groups endpoints by their tag/group label.
 */
export function buildVirtualApiNav(
  virtualPages: VirtualApiPage[],
): VirtualNavGroup[] {
  const groupMap = new Map<string, VirtualNavGroup>();

  for (const page of virtualPages) {
    let group = groupMap.get(page.group);
    if (!group) {
      group = { groupLabel: page.group, items: [] };
      groupMap.set(page.group, group);
    }
    group.items.push({
      id: page.id,
      path: page.path,
      title: page.title,
      method: page.method,
    });
  }

  return Array.from(groupMap.values());
}

/**
 * Find a virtual page by its slug path.
 */
export function findVirtualPage(
  virtualPages: VirtualApiPage[],
  targetPath: string,
): VirtualApiPage | undefined {
  return virtualPages.find((p) => p.path === targetPath);
}

/**
 * Find a virtual AsyncAPI page by its slug path.
 */
export function findVirtualAsyncApiPage(
  asyncPages: VirtualAsyncApiPage[],
  targetPath: string,
): VirtualAsyncApiPage | undefined {
  return asyncPages.find((p) => p.path === targetPath);
}
