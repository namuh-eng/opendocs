/**
 * API Reference Layout utilities — method badge mapping, cURL generation,
 * response schema rendering, and sidebar endpoint metadata extraction.
 */

import {
  type OpenApiEndpoint,
  type OpenApiParameter,
  generateExampleFromSchema,
} from "@/lib/openapi-parser";

// ── Method Badge Colors ──────────────────────────────────────────────────────

export interface MethodBadgeInfo {
  label: string;
  colorClass: string;
}

const METHOD_BADGES: Record<string, MethodBadgeInfo> = {
  GET: { label: "GET", colorClass: "method-get" },
  POST: { label: "POST", colorClass: "method-post" },
  PUT: { label: "PUT", colorClass: "method-put" },
  PATCH: { label: "PATCH", colorClass: "method-patch" },
  DELETE: { label: "DEL", colorClass: "method-delete" },
  HEAD: { label: "HEAD", colorClass: "method-head" },
  OPTIONS: { label: "OPT", colorClass: "method-options" },
};

/** Return display label and CSS class for an HTTP method. */
export function getMethodBadge(method: string): MethodBadgeInfo {
  return (
    METHOD_BADGES[method.toUpperCase()] || {
      label: method.toUpperCase(),
      colorClass: "method-get",
    }
  );
}

// ── Sidebar Endpoint Metadata ────────────────────────────────────────────────

export interface SidebarEndpoint {
  method: string;
  label: string;
  badgeLabel: string;
  colorClass: string;
}

/**
 * Parse an "api" frontmatter field (e.g. "GET /plants") into sidebar metadata.
 * Returns null if the string doesn't match the expected format.
 */
export function parseSidebarEndpoint(
  apiField: string,
  pageTitle: string,
): SidebarEndpoint | null {
  if (!apiField) return null;
  const trimmed = apiField.trim();
  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) return null;

  const method = trimmed.slice(0, spaceIdx).toUpperCase();
  const badge = getMethodBadge(method);
  return {
    method,
    label: pageTitle,
    badgeLabel: badge.label,
    colorClass: badge.colorClass,
  };
}

// ── Webhook Badge ────────────────────────────────────────────────────────────

/** Check if a method string represents a webhook. */
export function isWebhook(method: string): boolean {
  return method.toUpperCase() === "HOOK" || method.toUpperCase() === "WEBHOOK";
}

/** Get badge info for webhook entries. */
export function getWebhookBadge(): MethodBadgeInfo {
  return { label: "HOOK", colorClass: "method-hook" };
}

// ── cURL Code Generation ─────────────────────────────────────────────────────

export interface CodeExample {
  language: string;
  label: string;
  code: string;
}

/** Generate a cURL command for an endpoint. */
export function generateCurlExample(endpoint: OpenApiEndpoint): string {
  const lines: string[] = [];
  lines.push(`curl --request ${endpoint.method} \\`);
  lines.push(`  --url ${endpoint.baseUrl}${endpoint.path} \\`);

  if (endpoint.auth?.scheme === "bearer") {
    lines.push("  --header 'Authorization: Bearer <token>' \\");
  }

  if (endpoint.requestBody) {
    lines.push(
      `  --header 'Content-Type: ${endpoint.requestBody.contentType}' \\`,
    );
    if (endpoint.requestBody.schema) {
      const example = generateExampleFromSchema(endpoint.requestBody.schema);
      lines.push(`  --data '${JSON.stringify(example)}'`);
    } else {
      lines.push("  --data '{}'");
    }
  }

  // Remove trailing backslash from last line
  const lastIdx = lines.length - 1;
  if (lines[lastIdx].endsWith(" \\")) {
    lines[lastIdx] = lines[lastIdx].slice(0, -2);
  }

  return lines.join("\n");
}

/** Generate code examples in multiple languages. */
export function generateCodeExamples(endpoint: OpenApiEndpoint): CodeExample[] {
  const curl = generateCurlExample(endpoint);

  const pythonLines: string[] = [];
  pythonLines.push("import requests");
  pythonLines.push("");
  pythonLines.push(`url = "${endpoint.baseUrl}${endpoint.path}"`);
  if (endpoint.auth?.scheme === "bearer") {
    pythonLines.push("headers = {");
    pythonLines.push('    "Authorization": "Bearer <token>"');
    pythonLines.push("}");
  }
  if (endpoint.requestBody) {
    pythonLines.push(`payload = ${JSON.stringify({}, null, 4)}`);
    pythonLines.push(
      `response = requests.${endpoint.method.toLowerCase()}(url${endpoint.auth ? ", headers=headers" : ""}${endpoint.requestBody ? ", json=payload" : ""})`,
    );
  } else {
    pythonLines.push(
      `response = requests.${endpoint.method.toLowerCase()}(url${endpoint.auth ? ", headers=headers" : ""})`,
    );
  }

  const jsLines: string[] = [];
  jsLines.push(
    `const response = await fetch("${endpoint.baseUrl}${endpoint.path}", {`,
  );
  jsLines.push(`  method: "${endpoint.method}",`);
  if (endpoint.auth?.scheme === "bearer") {
    jsLines.push("  headers: {");
    jsLines.push('    "Authorization": "Bearer <token>",');
    if (endpoint.requestBody) {
      jsLines.push(
        `    "Content-Type": "${endpoint.requestBody.contentType}",`,
      );
    }
    jsLines.push("  },");
  }
  if (endpoint.requestBody) {
    jsLines.push("  body: JSON.stringify({}),");
  }
  jsLines.push("});");

  return [
    { language: "curl", label: "cURL", code: curl },
    { language: "python", label: "Python", code: pythonLines.join("\n") },
    {
      language: "javascript",
      label: "JavaScript",
      code: jsLines.join("\n"),
    },
  ];
}

// ── Response Schema Rendering ────────────────────────────────────────────────

export interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

/** Extract fields from a JSON Schema properties object. */
export function extractSchemaFields(
  schema: Record<string, unknown>,
): SchemaField[] {
  const props = schema.properties as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (!props) return [];

  const required = Array.isArray(schema.required)
    ? new Set(schema.required as string[])
    : new Set<string>();

  return Object.entries(props).map(([name, def]) => ({
    name,
    type: formatSchemaType(def),
    required: required.has(name),
    description: (def.description as string) || undefined,
  }));
}

/** Format a schema type for display (e.g. "string", "integer (int32)"). */
export function formatSchemaType(schema: Record<string, unknown>): string {
  const type = (schema.type as string) || "unknown";
  const format = schema.format as string | undefined;
  if (format) return `${type} (${format})`;
  if (schema.enum) return `enum: ${(schema.enum as string[]).join(" | ")}`;
  if (type === "array") {
    const items = schema.items as Record<string, unknown> | undefined;
    if (items?.type) return `${items.type as string}[]`;
    return "array";
  }
  return type;
}

// ── Response Tab Rendering ───────────────────────────────────────────────────

export interface ResponseTab {
  statusCode: string;
  description?: string;
  schema?: Record<string, unknown>;
  example?: unknown;
}

/** Extract response tabs from an endpoint's responses map. */
export function extractResponseTabs(endpoint: OpenApiEndpoint): ResponseTab[] {
  if (!endpoint.responses) return [];

  return Object.entries(endpoint.responses)
    .filter(([code]) => /^\d{3}$/.test(code))
    .map(([code, resp]) => ({
      statusCode: code,
      description: resp.description,
    }))
    .sort((a, b) => a.statusCode.localeCompare(b.statusCode));
}

/** Return CSS class for a status code. */
export function getStatusCodeClass(code: string): string {
  const num = Number.parseInt(code, 10);
  if (num >= 200 && num < 300) return "status-2xx";
  if (num >= 300 && num < 400) return "status-3xx";
  if (num >= 400 && num < 500) return "status-4xx";
  if (num >= 500) return "status-5xx";
  return "";
}

// ── Endpoint Page HTML Rendering ─────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render a full API reference endpoint page as HTML.
 * Includes: method+URL header, cURL code block with language selector,
 * response status tabs, auth section, parameters, response schema.
 */
export function renderApiReferencePage(endpoint: OpenApiEndpoint): string {
  const methodLower = endpoint.method.toLowerCase();
  const badge = getMethodBadge(endpoint.method);

  // Method + URL header with Try it button
  const header = `<div class="api-ref-header" data-testid="api-ref-header">
  <div class="api-ref-method-url">
    <span class="method-badge ${badge.colorClass}">${escapeHtml(badge.label)}</span>
    <span class="api-ref-path">${escapeHtml(endpoint.path)}</span>
  </div>
  <button class="api-ref-tryit-btn" data-testid="tryit-btn">Try it ▶</button>
</div>`;

  // Code examples with language selector
  const examples = generateCodeExamples(endpoint);
  const langTabs = examples
    .map(
      (ex, i) =>
        `<button class="api-ref-lang-tab${i === 0 ? " active" : ""}" data-lang="${escapeHtml(ex.language)}">${escapeHtml(ex.label)}</button>`,
    )
    .join("\n  ");

  const codeBlocks = examples
    .map(
      (ex, i) =>
        `<div class="api-ref-code-block${i === 0 ? " active" : ""}" data-lang="${escapeHtml(ex.language)}">
    <pre><code>${escapeHtml(ex.code)}</code></pre>
  </div>`,
    )
    .join("\n");

  const codeSection = `<div class="api-ref-code-section" data-testid="code-section">
  <div class="api-ref-code-header">
    <div class="api-ref-lang-tabs">
      ${langTabs}
    </div>
    <div class="api-ref-code-actions">
      <button class="api-ref-copy-btn" data-testid="copy-btn" title="Copy code">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span>cURL</span>
      </button>
      <button class="api-ref-askai-btn" data-testid="askai-btn" title="Ask AI">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Ask AI
      </button>
    </div>
  </div>
  ${codeBlocks}
</div>`;

  // Response status tabs
  const responseTabs = extractResponseTabs(endpoint);
  let responseSection = "";
  if (responseTabs.length > 0) {
    const tabs = responseTabs
      .map(
        (tab, i) =>
          `<button class="api-ref-status-tab${i === 0 ? " active" : ""}" data-status="${escapeHtml(tab.statusCode)}">${escapeHtml(tab.statusCode)}</button>`,
      )
      .join("\n    ");

    const panels = responseTabs
      .map(
        (tab, i) =>
          `<div class="api-ref-status-panel${i === 0 ? " active" : ""}" data-status="${escapeHtml(tab.statusCode)}">
      ${tab.description ? `<p class="api-ref-status-desc">${escapeHtml(tab.description)}</p>` : ""}
      <pre><code class="api-ref-response-example">${escapeHtml(getExampleResponse(tab.statusCode))}</code></pre>
    </div>`,
      )
      .join("\n");

    responseSection = `<div class="api-ref-responses" data-testid="response-tabs">
  <div class="api-ref-status-tabs">
    ${tabs}
  </div>
  ${panels}
</div>`;
  }

  // Authorization section
  let authSection = "";
  if (endpoint.auth) {
    const scheme =
      endpoint.auth.scheme === "bearer" ? "Bearer token" : "API key";
    authSection = `<div class="api-ref-auth-section" data-testid="auth-section">
  <h3 class="api-ref-section-heading">Authorizations</h3>
  <div class="api-ref-auth-row">
    <span class="api-ref-auth-label">${escapeHtml(scheme)}</span>
    <span class="api-ref-auth-type">${escapeHtml(endpoint.auth.type)} (${escapeHtml(endpoint.auth.scheme || "key")})</span>
  </div>
</div>`;
  }

  // Parameters section
  const allParams = endpoint.parameters.filter((p) => p.in !== "header");
  let paramsSection = "";
  if (allParams.length > 0) {
    const rows = allParams.map((p) => renderParameterRow(p)).join("\n");
    paramsSection = `<div class="api-ref-params-section" data-testid="params-section">
  <h3 class="api-ref-section-heading">Parameters</h3>
  <div class="api-ref-params-table">
    ${rows}
  </div>
</div>`;
  }

  // Response schema section (from first 2xx response)
  const schemaSection = "";
  // We render the response section's schema if available from the spec
  // For now, just show the response tabs which contain example responses

  return `<div class="api-ref-page" data-testid="api-ref-page">
${header}
${codeSection}
${responseSection}
${authSection}
${paramsSection}
${schemaSection}
</div>`;
}

/** Render a single parameter row. */
function renderParameterRow(param: OpenApiParameter): string {
  const typeStr = param.schema?.type || "string";
  const format = param.schema?.format;
  const displayType = format ? `${typeStr} (${format})` : typeStr;

  return `<div class="api-ref-param-row">
  <div class="api-ref-param-name">
    <code>${escapeHtml(param.name)}</code>
    ${param.required ? '<span class="api-ref-param-required">required</span>' : ""}
  </div>
  <div class="api-ref-param-meta">
    <span class="api-ref-param-type">${escapeHtml(displayType)}</span>
    <span class="api-ref-param-in">${escapeHtml(param.in)}</span>
  </div>
  ${param.description ? `<div class="api-ref-param-desc">${escapeHtml(param.description)}</div>` : ""}
</div>`;
}

/** Generate a placeholder response example based on status code. */
function getExampleResponse(statusCode: string): string {
  const code = Number.parseInt(statusCode, 10);
  if (code >= 200 && code < 300) {
    return JSON.stringify(
      {
        name: "<string>",
        tag: "<string>",
      },
      null,
      2,
    );
  }
  if (code >= 400 && code < 500) {
    return JSON.stringify(
      {
        error: "<string>",
        message: "<string>",
      },
      null,
      2,
    );
  }
  return "{}";
}
