/**
 * OpenAPI 3.x spec parser — extracts endpoints, parameters, request bodies,
 * and auth schemes into a flat list suitable for API playground rendering.
 */

// ── Types ───────────────────────────────────────────────────────────────────────

export interface OpenApiParameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required: boolean;
  description?: string;
  schema?: {
    type?: string;
    default?: unknown;
    format?: string;
    enum?: string[];
  };
}

export interface OpenApiRequestBody {
  contentType: string;
  required: boolean;
  schema?: Record<string, unknown>;
}

export interface OpenApiAuth {
  type: string;
  scheme?: string;
  name?: string;
  in?: string;
}

export interface OpenApiEndpoint {
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
  description?: string;
  parameters: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  baseUrl: string;
  auth?: OpenApiAuth;
  responses?: Record<string, { description?: string }>;
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

const HTTP_METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Generate example JSON from a JSON Schema object (shallow). */
export function generateExampleFromSchema(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const props = schema.properties as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (!props) return result;

  for (const [key, def] of Object.entries(props)) {
    if (def.default !== undefined) {
      result[key] = def.default;
    } else if (def.example !== undefined) {
      result[key] = def.example;
    } else {
      switch (def.type) {
        case "string":
          result[key] = def.format === "email" ? "user@example.com" : "string";
          break;
        case "integer":
        case "number":
          result[key] = 0;
          break;
        case "boolean":
          result[key] = false;
          break;
        case "array":
          result[key] = [];
          break;
        case "object":
          result[key] = {};
          break;
        default:
          result[key] = "";
      }
    }
  }
  return result;
}

// ── Parser ──────────────────────────────────────────────────────────────────────

/**
 * Parse an OpenAPI 3.x spec object into a flat list of endpoints.
 * Returns [] for invalid input.
 */
export function parseOpenApiSpec(spec: unknown): OpenApiEndpoint[] {
  if (!isRecord(spec)) return [];

  const paths = spec.paths;
  if (!isRecord(paths)) return [];

  // Extract base URL from servers
  const servers = Array.isArray(spec.servers) ? spec.servers : [];
  const baseUrl =
    servers.length > 0 &&
    isRecord(servers[0]) &&
    typeof servers[0].url === "string"
      ? servers[0].url
      : "";

  // Extract global security scheme
  let globalAuth: OpenApiAuth | undefined;
  const components = isRecord(spec.components) ? spec.components : {};
  const securitySchemes = isRecord(components.securitySchemes)
    ? components.securitySchemes
    : {};
  const securitySchemeName = Object.keys(securitySchemes)[0];
  if (securitySchemeName && isRecord(securitySchemes[securitySchemeName])) {
    const scheme = securitySchemes[securitySchemeName] as Record<
      string,
      unknown
    >;
    globalAuth = {
      type: (scheme.type as string) || "",
      scheme: scheme.scheme as string | undefined,
      name: scheme.name as string | undefined,
      in: scheme.in as string | undefined,
    };
  }

  // Check if global security is declared
  const hasSecurity = Array.isArray(spec.security) && spec.security.length > 0;

  const endpoints: OpenApiEndpoint[] = [];

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!isRecord(pathItem)) continue;

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method)) continue;
      if (!isRecord(operation)) continue;

      // Parameters
      const rawParams = Array.isArray(operation.parameters)
        ? operation.parameters
        : [];
      const parameters: OpenApiParameter[] = rawParams
        .filter(isRecord)
        .map((p) => ({
          name: (p.name as string) || "",
          in: (p.in as OpenApiParameter["in"]) || "query",
          required: Boolean(p.required),
          description: p.description as string | undefined,
          schema: isRecord(p.schema)
            ? {
                type: p.schema.type as string | undefined,
                default: p.schema.default,
                format: p.schema.format as string | undefined,
                enum: p.schema.enum as string[] | undefined,
              }
            : undefined,
        }));

      // Request body
      let requestBody: OpenApiRequestBody | undefined;
      if (isRecord(operation.requestBody)) {
        const rb = operation.requestBody;
        const content = isRecord(rb.content) ? rb.content : {};
        const firstContentType = Object.keys(content)[0];
        if (firstContentType && isRecord(content[firstContentType])) {
          const mediaType = content[firstContentType] as Record<
            string,
            unknown
          >;
          requestBody = {
            contentType: firstContentType,
            required: Boolean(rb.required),
            schema: isRecord(mediaType.schema)
              ? (mediaType.schema as Record<string, unknown>)
              : undefined,
          };
        }
      }

      // Responses
      const rawResponses = isRecord(operation.responses)
        ? operation.responses
        : {};
      const responses: Record<string, { description?: string }> = {};
      for (const [code, resp] of Object.entries(rawResponses)) {
        responses[code] = {
          description: isRecord(resp)
            ? (resp.description as string | undefined)
            : undefined,
        };
      }

      endpoints.push({
        method: method.toUpperCase(),
        path,
        operationId: operation.operationId as string | undefined,
        summary: operation.summary as string | undefined,
        description: operation.description as string | undefined,
        parameters,
        requestBody,
        baseUrl,
        auth: hasSecurity ? globalAuth : undefined,
        responses,
      });
    }
  }

  return endpoints;
}

// ── HTML Renderer ───────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escape for textarea content — only & and < need escaping, not quotes. */
function escapeTextarea(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

/**
 * Render a single OpenAPI endpoint as an interactive API playground HTML block.
 * Client-side JS wires up the Send button and response display.
 */
export function renderApiPlaygroundHtml(endpoint: OpenApiEndpoint): string {
  const methodLower = endpoint.method.toLowerCase();

  // URL bar
  const urlBar = `<div class="api-url-bar">
  <span class="method-badge method-${methodLower}">${endpoint.method}</span>
  <span class="api-path">${escapeHtml(endpoint.baseUrl)}${escapeHtml(endpoint.path)}</span>
</div>`;

  // Summary
  const summaryHtml = endpoint.summary
    ? `<p class="api-summary">${escapeHtml(endpoint.summary)}</p>`
    : "";

  // Auth header
  let authHtml = "";
  if (endpoint.auth) {
    const placeholder =
      endpoint.auth.scheme === "bearer"
        ? "Bearer your-token-here"
        : "your-api-key";
    authHtml = `<div class="api-section">
  <h4 class="api-section-title">Authorization</h4>
  <div class="api-param-row auth-header-input">
    <label class="api-param-label">Authorization</label>
    <input type="text" class="api-param-input" data-param-name="Authorization" data-param-in="header" placeholder="${escapeHtml(placeholder)}" value="${endpoint.auth.scheme === "bearer" ? "Bearer " : ""}" />
  </div>
</div>`;
  }

  // Path parameters
  const pathParams = endpoint.parameters.filter((p) => p.in === "path");
  let pathParamsHtml = "";
  if (pathParams.length > 0) {
    const rows = pathParams
      .map(
        (p) =>
          `<div class="api-param-row">
    <label class="api-param-label">${escapeHtml(p.name)} <span class="param-required">required</span></label>
    ${p.description ? `<span class="param-description">${escapeHtml(p.description)}</span>` : ""}
    <input type="text" class="api-param-input" data-param-name="${escapeHtml(p.name)}" data-param-in="path" placeholder="${p.schema?.type || "string"}" />
  </div>`,
      )
      .join("\n");
    pathParamsHtml = `<div class="api-section">
  <h4 class="api-section-title">Path Parameters</h4>
  ${rows}
</div>`;
  }

  // Query parameters
  const queryParams = endpoint.parameters.filter((p) => p.in === "query");
  let queryParamsHtml = "";
  if (queryParams.length > 0) {
    const rows = queryParams
      .map(
        (p) =>
          `<div class="api-param-row">
    <label class="api-param-label">${escapeHtml(p.name)}${p.required ? ' <span class="param-required">required</span>' : ""}</label>
    ${p.description ? `<span class="param-description">${escapeHtml(p.description)}</span>` : ""}
    <input type="text" class="api-param-input" data-param-name="${escapeHtml(p.name)}" data-param-in="query" placeholder="${p.schema?.type || "string"}${p.schema?.default !== undefined ? ` (default: ${p.schema.default})` : ""}" />
  </div>`,
      )
      .join("\n");
    queryParamsHtml = `<div class="api-section">
  <h4 class="api-section-title">Query Parameters</h4>
  ${rows}
</div>`;
  }

  // Request body
  let bodyHtml = "";
  if (endpoint.requestBody) {
    const exampleJson = endpoint.requestBody.schema
      ? JSON.stringify(
          generateExampleFromSchema(endpoint.requestBody.schema),
          null,
          2,
        )
      : "{}";
    bodyHtml = `<div class="api-section">
  <h4 class="api-section-title">Body</h4>
  <div class="request-body-editor">
    <textarea class="api-body-textarea" data-content-type="${escapeHtml(endpoint.requestBody.contentType)}" rows="8" spellcheck="false">${escapeTextarea(exampleJson)}</textarea>
  </div>
</div>`;
  }

  // Send button
  const sendBtn = `<div class="api-send-section">
  <button class="api-send-btn" data-method="${methodLower}" data-path="${escapeHtml(endpoint.path)}" data-base-url="${escapeHtml(endpoint.baseUrl)}">Send</button>
</div>`;

  // Response area
  const responseArea = `<div class="api-response" style="display:none">
  <div class="api-response-header">
    <h4 class="api-section-title">Response</h4>
    <span class="api-status-code"></span>
    <span class="api-response-time"></span>
  </div>
  <div class="api-response-tabs">
    <button class="api-resp-tab active" data-resp-tab="body">Body</button>
    <button class="api-resp-tab" data-resp-tab="headers">Headers</button>
  </div>
  <div class="api-response-body">
    <pre><code class="api-response-content"></code></pre>
  </div>
  <div class="api-response-headers" style="display:none">
    <pre><code class="api-response-headers-content"></code></pre>
  </div>
</div>`;

  return `<div class="api-playground" data-operation-id="${escapeHtml(endpoint.operationId || "")}">
${summaryHtml}
${urlBar}
${authHtml}
${pathParamsHtml}
${queryParamsHtml}
${bodyHtml}
${sendBtn}
${responseArea}
</div>`;
}
