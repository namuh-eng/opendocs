import {
  extractResponseTabs,
  extractSchemaFields,
  formatSchemaType,
  generateCodeExamples,
  generateCurlExample,
  getMethodBadge,
  getStatusCodeClass,
  getWebhookBadge,
  isWebhook,
  parseSidebarEndpoint,
  renderApiReferencePage,
} from "@/lib/api-reference";
import type { OpenApiEndpoint } from "@/lib/openapi-parser";
import { describe, expect, it } from "vitest";

// ── Method Badge ─────────────────────────────────────────────────────────────

describe("getMethodBadge", () => {
  it("returns green class for GET", () => {
    const badge = getMethodBadge("GET");
    expect(badge.label).toBe("GET");
    expect(badge.colorClass).toBe("method-get");
  });

  it("returns blue class for POST", () => {
    const badge = getMethodBadge("POST");
    expect(badge.label).toBe("POST");
    expect(badge.colorClass).toBe("method-post");
  });

  it("returns red class for DELETE", () => {
    const badge = getMethodBadge("DELETE");
    expect(badge.label).toBe("DEL");
    expect(badge.colorClass).toBe("method-delete");
  });

  it("handles case-insensitive input", () => {
    expect(getMethodBadge("get").colorClass).toBe("method-get");
    expect(getMethodBadge("post").colorClass).toBe("method-post");
  });

  it("returns default for unknown methods", () => {
    const badge = getMethodBadge("CUSTOM");
    expect(badge.label).toBe("CUSTOM");
    expect(badge.colorClass).toBe("method-get");
  });
});

// ── Sidebar Endpoint ─────────────────────────────────────────────────────────

describe("parseSidebarEndpoint", () => {
  it("parses GET endpoint", () => {
    const result = parseSidebarEndpoint("GET /plants", "Get Plants");
    expect(result).not.toBeNull();
    expect(result?.method).toBe("GET");
    expect(result?.badgeLabel).toBe("GET");
    expect(result?.colorClass).toBe("method-get");
    expect(result?.label).toBe("Get Plants");
  });

  it("parses POST endpoint", () => {
    const result = parseSidebarEndpoint("POST /plants", "Create Plant");
    expect(result?.method).toBe("POST");
    expect(result?.badgeLabel).toBe("POST");
    expect(result?.colorClass).toBe("method-post");
  });

  it("parses DELETE endpoint", () => {
    const result = parseSidebarEndpoint("DELETE /plants/{id}", "Delete Plant");
    expect(result?.method).toBe("DELETE");
    expect(result?.badgeLabel).toBe("DEL");
    expect(result?.colorClass).toBe("method-delete");
  });

  it("returns null for empty string", () => {
    expect(parseSidebarEndpoint("", "Test")).toBeNull();
  });

  it("returns null for string without space", () => {
    expect(parseSidebarEndpoint("GET", "Test")).toBeNull();
  });
});

// ── Webhook ──────────────────────────────────────────────────────────────────

describe("isWebhook", () => {
  it("returns true for HOOK", () => {
    expect(isWebhook("HOOK")).toBe(true);
  });
  it("returns true for WEBHOOK", () => {
    expect(isWebhook("WEBHOOK")).toBe(true);
  });
  it("returns false for GET", () => {
    expect(isWebhook("GET")).toBe(false);
  });
});

describe("getWebhookBadge", () => {
  it("returns purple hook badge", () => {
    const badge = getWebhookBadge();
    expect(badge.label).toBe("HOOK");
    expect(badge.colorClass).toBe("method-hook");
  });
});

// ── cURL Generation ──────────────────────────────────────────────────────────

const makeEndpoint = (
  overrides: Partial<OpenApiEndpoint> = {},
): OpenApiEndpoint => ({
  method: "GET",
  path: "/plants",
  parameters: [],
  baseUrl: "http://sandbox.mintlify.com",
  ...overrides,
});

describe("generateCurlExample", () => {
  it("generates basic GET curl", () => {
    const curl = generateCurlExample(makeEndpoint());
    expect(curl).toContain("curl --request GET");
    expect(curl).toContain("--url http://sandbox.mintlify.com/plants");
  });

  it("includes Authorization header for bearer auth", () => {
    const curl = generateCurlExample(
      makeEndpoint({
        auth: { type: "http", scheme: "bearer" },
      }),
    );
    expect(curl).toContain("Authorization: Bearer <token>");
  });

  it("includes Content-Type and body for POST with request body", () => {
    const curl = generateCurlExample(
      makeEndpoint({
        method: "POST",
        requestBody: {
          contentType: "application/json",
          required: true,
          schema: {
            type: "object",
            properties: { name: { type: "string" } },
          },
        },
      }),
    );
    expect(curl).toContain("Content-Type: application/json");
    expect(curl).toContain("--data");
  });

  it("does not have trailing backslash", () => {
    const curl = generateCurlExample(makeEndpoint());
    const lines = curl.split("\n");
    expect(lines[lines.length - 1]).not.toContain("\\");
  });
});

// ── Code Examples ────────────────────────────────────────────────────────────

describe("generateCodeExamples", () => {
  it("returns cURL, Python, and JavaScript examples", () => {
    const examples = generateCodeExamples(makeEndpoint());
    expect(examples).toHaveLength(3);
    expect(examples[0].language).toBe("curl");
    expect(examples[1].language).toBe("python");
    expect(examples[2].language).toBe("javascript");
  });

  it("cURL example matches generateCurlExample output", () => {
    const endpoint = makeEndpoint();
    const examples = generateCodeExamples(endpoint);
    expect(examples[0].code).toBe(generateCurlExample(endpoint));
  });

  it("Python example uses requests library", () => {
    const examples = generateCodeExamples(makeEndpoint());
    expect(examples[1].code).toContain("import requests");
    expect(examples[1].code).toContain("requests.get");
  });

  it("JavaScript example uses fetch", () => {
    const examples = generateCodeExamples(makeEndpoint());
    expect(examples[2].code).toContain("fetch(");
    expect(examples[2].code).toContain('"GET"');
  });
});

// ── Response Schema ──────────────────────────────────────────────────────────

describe("extractSchemaFields", () => {
  it("extracts fields with types and required", () => {
    const fields = extractSchemaFields({
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "Plant name" },
        tag: { type: "string" },
        id: { type: "integer", format: "int32" },
      },
    });
    expect(fields).toHaveLength(3);
    expect(fields[0].name).toBe("name");
    expect(fields[0].required).toBe(true);
    expect(fields[0].description).toBe("Plant name");
    expect(fields[1].name).toBe("tag");
    expect(fields[1].required).toBe(false);
    expect(fields[2].type).toBe("integer (int32)");
  });

  it("returns empty array for schema without properties", () => {
    expect(extractSchemaFields({ type: "object" })).toEqual([]);
  });
});

describe("formatSchemaType", () => {
  it("shows format in parentheses", () => {
    expect(formatSchemaType({ type: "integer", format: "int32" })).toBe(
      "integer (int32)",
    );
  });

  it("shows enum values", () => {
    expect(
      formatSchemaType({ type: "string", enum: ["active", "inactive"] }),
    ).toBe("enum: active | inactive");
  });

  it("shows array item type", () => {
    expect(formatSchemaType({ type: "array", items: { type: "string" } })).toBe(
      "string[]",
    );
  });

  it("returns plain type for simple schema", () => {
    expect(formatSchemaType({ type: "string" })).toBe("string");
  });
});

// ── Response Tabs ────────────────────────────────────────────────────────────

describe("extractResponseTabs", () => {
  it("extracts sorted status codes", () => {
    const tabs = extractResponseTabs(
      makeEndpoint({
        responses: {
          "400": { description: "Bad request" },
          "200": { description: "Success" },
        },
      }),
    );
    expect(tabs).toHaveLength(2);
    expect(tabs[0].statusCode).toBe("200");
    expect(tabs[0].description).toBe("Success");
    expect(tabs[1].statusCode).toBe("400");
  });

  it("returns empty array when no responses", () => {
    expect(extractResponseTabs(makeEndpoint())).toEqual([]);
  });
});

describe("getStatusCodeClass", () => {
  it("returns correct class for each range", () => {
    expect(getStatusCodeClass("200")).toBe("status-2xx");
    expect(getStatusCodeClass("301")).toBe("status-3xx");
    expect(getStatusCodeClass("400")).toBe("status-4xx");
    expect(getStatusCodeClass("500")).toBe("status-5xx");
  });
});

// ── Full Page Rendering ──────────────────────────────────────────────────────

describe("renderApiReferencePage", () => {
  const endpoint = makeEndpoint({
    method: "GET",
    path: "/plants",
    summary: "Returns all plants",
    auth: { type: "http", scheme: "bearer" },
    parameters: [
      {
        name: "limit",
        in: "query",
        required: false,
        description: "Max results",
        schema: { type: "integer", format: "int32" },
      },
    ],
    responses: {
      "200": { description: "Success" },
      "400": { description: "Bad request" },
    },
  });

  it("renders method badge and path", () => {
    const html = renderApiReferencePage(endpoint);
    expect(html).toContain("method-get");
    expect(html).toContain("/plants");
  });

  it("renders Try it button", () => {
    const html = renderApiReferencePage(endpoint);
    expect(html).toContain("Try it");
    expect(html).toContain("tryit-btn");
  });

  it("renders code section with language tabs", () => {
    const html = renderApiReferencePage(endpoint);
    expect(html).toContain("api-ref-lang-tab");
    expect(html).toContain("cURL");
    expect(html).toContain("Python");
    expect(html).toContain("JavaScript");
  });

  it("renders response status tabs 200 and 400", () => {
    const html = renderApiReferencePage(endpoint);
    expect(html).toContain('data-status="200"');
    expect(html).toContain('data-status="400"');
  });

  it("renders auth section for bearer token", () => {
    const html = renderApiReferencePage(endpoint);
    expect(html).toContain("Authorizations");
    expect(html).toContain("Bearer token");
  });

  it("renders parameters section", () => {
    const html = renderApiReferencePage(endpoint);
    expect(html).toContain("Parameters");
    expect(html).toContain("limit");
    expect(html).toContain("integer (int32)");
    expect(html).toContain("Max results");
  });

  it("does not render auth section when no auth", () => {
    const noAuth = makeEndpoint({ responses: { "200": {} } });
    const html = renderApiReferencePage(noAuth);
    expect(html).not.toContain("Authorizations");
  });
});
