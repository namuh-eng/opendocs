import { describe, expect, it } from "vitest";

// ── OpenAPI Parser Tests ────────────────────────────────────────────────────────

// We'll test the parseOpenApiSpec utility that extracts endpoints from an OpenAPI spec

import {
  type OpenApiEndpoint,
  type OpenApiParameter,
  parseOpenApiSpec,
  renderApiPlaygroundHtml,
} from "@/lib/openapi-parser";

const SAMPLE_OPENAPI_SPEC = {
  openapi: "3.0.0",
  info: { title: "Test API", version: "1.0.0" },
  servers: [{ url: "https://api.example.com/v1" }],
  paths: {
    "/users": {
      get: {
        operationId: "listUsers",
        summary: "List all users",
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", default: 10 },
            description: "Max items to return",
          },
          {
            name: "offset",
            in: "query",
            required: false,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": { description: "Successful response" },
        },
      },
      post: {
        operationId: "createUser",
        summary: "Create a user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                },
                required: ["name", "email"],
              },
            },
          },
        },
        responses: {
          "201": { description: "Created" },
        },
      },
    },
    "/users/{id}": {
      get: {
        operationId: "getUser",
        summary: "Get a user by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Successful response" },
        },
      },
      put: {
        operationId: "updateUser",
        summary: "Update a user",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated" },
        },
      },
      delete: {
        operationId: "deleteUser",
        summary: "Delete a user",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "204": { description: "Deleted" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

describe("OpenAPI Parser", () => {
  describe("parseOpenApiSpec", () => {
    it("extracts all endpoints from a valid OpenAPI spec", () => {
      const endpoints = parseOpenApiSpec(SAMPLE_OPENAPI_SPEC);
      expect(endpoints).toHaveLength(5);
    });

    it("parses method, path, and summary for each endpoint", () => {
      const endpoints = parseOpenApiSpec(SAMPLE_OPENAPI_SPEC);
      const listUsers = endpoints.find((e) => e.operationId === "listUsers");
      expect(listUsers).toBeDefined();
      expect(listUsers?.method).toBe("GET");
      expect(listUsers?.path).toBe("/users");
      expect(listUsers?.summary).toBe("List all users");
    });

    it("extracts query parameters with types and defaults", () => {
      const endpoints = parseOpenApiSpec(SAMPLE_OPENAPI_SPEC);
      const listUsers = endpoints.find(
        (e) => e.operationId === "listUsers",
      ) as OpenApiEndpoint;
      expect(listUsers.parameters).toHaveLength(2);

      const limitParam = listUsers.parameters.find(
        (p) => p.name === "limit",
      ) as OpenApiParameter;
      expect(limitParam.in).toBe("query");
      expect(limitParam.required).toBe(false);
      expect(limitParam.schema?.type).toBe("integer");
      expect(limitParam.schema?.default).toBe(10);
      expect(limitParam.description).toBe("Max items to return");
    });

    it("extracts path parameters", () => {
      const endpoints = parseOpenApiSpec(SAMPLE_OPENAPI_SPEC);
      const getUser = endpoints.find(
        (e) => e.operationId === "getUser",
      ) as OpenApiEndpoint;
      expect(getUser.parameters).toHaveLength(1);
      expect(getUser.parameters[0].name).toBe("id");
      expect(getUser.parameters[0].in).toBe("path");
      expect(getUser.parameters[0].required).toBe(true);
    });

    it("extracts request body schema for POST/PUT", () => {
      const endpoints = parseOpenApiSpec(SAMPLE_OPENAPI_SPEC);
      const createUser = endpoints.find(
        (e) => e.operationId === "createUser",
      ) as OpenApiEndpoint;
      expect(createUser.requestBody).toBeDefined();
      expect(createUser.requestBody?.contentType).toBe("application/json");
      expect(createUser.requestBody?.schema?.properties).toHaveProperty("name");
      expect(createUser.requestBody?.schema?.properties).toHaveProperty(
        "email",
      );
      expect(createUser.requestBody?.required).toBe(true);
    });

    it("extracts server base URL", () => {
      const endpoints = parseOpenApiSpec(SAMPLE_OPENAPI_SPEC);
      expect(endpoints[0].baseUrl).toBe("https://api.example.com/v1");
    });

    it("extracts security scheme info", () => {
      const endpoints = parseOpenApiSpec(SAMPLE_OPENAPI_SPEC);
      expect(endpoints[0].auth).toEqual({
        type: "http",
        scheme: "bearer",
      });
    });

    it("returns empty array for empty paths", () => {
      const spec = { openapi: "3.0.0", info: {}, paths: {} };
      expect(parseOpenApiSpec(spec)).toEqual([]);
    });

    it("returns empty array for invalid input", () => {
      expect(parseOpenApiSpec(null)).toEqual([]);
      expect(parseOpenApiSpec(undefined)).toEqual([]);
      expect(parseOpenApiSpec("not an object")).toEqual([]);
    });

    it("handles endpoints without parameters or request body", () => {
      const endpoints = parseOpenApiSpec(SAMPLE_OPENAPI_SPEC);
      const deleteUser = endpoints.find(
        (e) => e.operationId === "deleteUser",
      ) as OpenApiEndpoint;
      expect(deleteUser.parameters).toHaveLength(1); // just the path param
      expect(deleteUser.requestBody).toBeUndefined();
    });

    it("handles spec without servers (defaults to empty base URL)", () => {
      const spec = {
        openapi: "3.0.0",
        info: {},
        paths: {
          "/test": {
            get: { summary: "Test", responses: { "200": {} } },
          },
        },
      };
      const endpoints = parseOpenApiSpec(spec);
      expect(endpoints[0].baseUrl).toBe("");
    });
  });
});

// ── API Playground HTML Renderer Tests ──────────────────────────────────────────

describe("API Playground HTML Renderer", () => {
  it("renders a playground container with method badge", () => {
    const endpoints = parseOpenApiSpec(SAMPLE_OPENAPI_SPEC);
    const getUser = endpoints.find(
      (e) => e.operationId === "getUser",
    ) as OpenApiEndpoint;
    const html = renderApiPlaygroundHtml(getUser);
    expect(html).toContain('class="api-playground"');
    expect(html).toContain('class="method-badge method-get"');
    expect(html).toContain("GET");
    expect(html).toContain("/users/{id}");
  });

  it("renders parameter inputs for path params", () => {
    const endpoints = parseOpenApiSpec(SAMPLE_OPENAPI_SPEC);
    const getUser = endpoints.find(
      (e) => e.operationId === "getUser",
    ) as OpenApiEndpoint;
    const html = renderApiPlaygroundHtml(getUser);
    expect(html).toContain('data-param-name="id"');
    expect(html).toContain('data-param-in="path"');
  });

  it("renders parameter inputs for query params", () => {
    const endpoints = parseOpenApiSpec(SAMPLE_OPENAPI_SPEC);
    const listUsers = endpoints.find(
      (e) => e.operationId === "listUsers",
    ) as OpenApiEndpoint;
    const html = renderApiPlaygroundHtml(listUsers);
    expect(html).toContain('data-param-name="limit"');
    expect(html).toContain('data-param-in="query"');
  });

  it("renders request body editor for POST endpoints", () => {
    const endpoints = parseOpenApiSpec(SAMPLE_OPENAPI_SPEC);
    const createUser = endpoints.find(
      (e) => e.operationId === "createUser",
    ) as OpenApiEndpoint;
    const html = renderApiPlaygroundHtml(createUser);
    expect(html).toContain('class="request-body-editor"');
    expect(html).toContain("Body");
  });

  it("renders auth header input when endpoint has auth", () => {
    const endpoints = parseOpenApiSpec(SAMPLE_OPENAPI_SPEC);
    const html = renderApiPlaygroundHtml(endpoints[0]);
    expect(html).toContain("auth-header-input");
    expect(html).toContain("Authorization");
    expect(html).toContain("Bearer");
  });

  it("renders Send button", () => {
    const endpoints = parseOpenApiSpec(SAMPLE_OPENAPI_SPEC);
    const html = renderApiPlaygroundHtml(endpoints[0]);
    expect(html).toContain('class="api-send-btn"');
    expect(html).toContain("Send");
  });

  it("renders response area", () => {
    const endpoints = parseOpenApiSpec(SAMPLE_OPENAPI_SPEC);
    const html = renderApiPlaygroundHtml(endpoints[0]);
    expect(html).toContain('class="api-response"');
  });

  it("renders different method badges with correct classes", () => {
    const endpoints = parseOpenApiSpec(SAMPLE_OPENAPI_SPEC);
    const postEndpoint = endpoints.find(
      (e) => e.method === "POST",
    ) as OpenApiEndpoint;
    const deleteEndpoint = endpoints.find(
      (e) => e.method === "DELETE",
    ) as OpenApiEndpoint;
    expect(renderApiPlaygroundHtml(postEndpoint)).toContain("method-post");
    expect(renderApiPlaygroundHtml(deleteEndpoint)).toContain("method-delete");
  });

  it("generates example body JSON from schema", () => {
    const endpoints = parseOpenApiSpec(SAMPLE_OPENAPI_SPEC);
    const createUser = endpoints.find(
      (e) => e.operationId === "createUser",
    ) as OpenApiEndpoint;
    const html = renderApiPlaygroundHtml(createUser);
    // Should contain example JSON generated from schema
    expect(html).toContain('"name"');
    expect(html).toContain('"email"');
  });
});
