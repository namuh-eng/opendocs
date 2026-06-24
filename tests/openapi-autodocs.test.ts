import { describe, expect, it } from "vitest";
import {
  buildVirtualApiNav,
  endpointToSlug,
  endpointToTitle,
  fetchSpecFromUrl,
  findVirtualAsyncApiPage,
  findVirtualPage,
  generateAsyncApiPages,
  generateGoExample,
  generateVirtualPages,
  isAsyncApiSpec,
  renderAsyncApiChannelPage,
  type VirtualAsyncApiPage,
} from "@/lib/openapi";
import type { OpenApiEndpoint } from "@/lib/openapi-parser";

// ── Sample Specs ────────────────────────────────────────────────────────────────

const PETSTORE_SPEC = {
  openapi: "3.0.0",
  info: { title: "Pet Store", version: "1.0.0" },
  servers: [{ url: "https://api.petstore.io/v1" }],
  paths: {
    "/pets": {
      get: {
        operationId: "listPets",
        summary: "List all pets",
        tags: ["Pets"],
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": { description: "A list of pets" },
          "400": { description: "Bad request" },
        },
      },
      post: {
        operationId: "createPet",
        summary: "Create a pet",
        tags: ["Pets"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  tag: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created" },
        },
      },
    },
    "/pets/{petId}": {
      get: {
        operationId: "getPetById",
        summary: "Get a pet by ID",
        tags: ["Pets"],
        parameters: [
          {
            name: "petId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "A pet" },
          "404": { description: "Not found" },
        },
      },
      delete: {
        operationId: "deletePet",
        summary: "Delete a pet",
        tags: ["Pets"],
        parameters: [
          {
            name: "petId",
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
    "/users": {
      get: {
        operationId: "listUsers",
        summary: "List users",
        tags: ["Users"],
        responses: {
          "200": { description: "Users" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer" },
    },
  },
  security: [{ bearerAuth: [] }],
};

const ASYNCAPI_SPEC = {
  asyncapi: "3.0.0",
  info: { title: "Chat API", version: "1.0.0" },
  channels: {
    "chat/messages": {
      description: "Channel for chat messages",
      tags: [{ name: "Chat" }],
      subscribe: {
        summary: "Receive chat messages",
        message: { payload: { type: "object" } },
      },
      publish: {
        summary: "Send chat messages",
        message: { payload: { type: "object" } },
      },
    },
    "user/status": {
      description: "User online status updates",
      subscribe: {
        summary: "Receive status updates",
        message: { payload: { type: "object" } },
      },
    },
  },
};

// ── Tests ────────────────────────────────────────────────────────────────────────

describe("endpointToSlug", () => {
  it("converts operationId from camelCase to kebab-case", () => {
    const ep: OpenApiEndpoint = {
      method: "GET",
      path: "/pets",
      operationId: "listPets",
      parameters: [],
      baseUrl: "",
    };
    expect(endpointToSlug(ep)).toBe("list-pets");
  });

  it("converts PascalCase operationId", () => {
    const ep: OpenApiEndpoint = {
      method: "GET",
      path: "/pets",
      operationId: "GetPetById",
      parameters: [],
      baseUrl: "",
    };
    expect(endpointToSlug(ep)).toBe("get-pet-by-id");
  });

  it("falls back to method + path when no operationId", () => {
    const ep: OpenApiEndpoint = {
      method: "POST",
      path: "/users/{id}/pets",
      parameters: [],
      baseUrl: "",
    };
    expect(endpointToSlug(ep)).toBe("post-users-pets");
  });

  it("handles special characters in path", () => {
    const ep: OpenApiEndpoint = {
      method: "GET",
      path: "/api/v2/items",
      parameters: [],
      baseUrl: "",
    };
    expect(endpointToSlug(ep)).toBe("get-api-v2-items");
  });
});

describe("endpointToTitle", () => {
  it("uses summary when available", () => {
    const ep: OpenApiEndpoint = {
      method: "GET",
      path: "/pets",
      summary: "List all pets",
      operationId: "listPets",
      parameters: [],
      baseUrl: "",
    };
    expect(endpointToTitle(ep)).toBe("List all pets");
  });

  it("converts operationId to title when no summary", () => {
    const ep: OpenApiEndpoint = {
      method: "GET",
      path: "/pets",
      operationId: "getPetById",
      parameters: [],
      baseUrl: "",
    };
    expect(endpointToTitle(ep)).toBe("Get Pet By Id");
  });

  it("falls back to METHOD /path", () => {
    const ep: OpenApiEndpoint = {
      method: "DELETE",
      path: "/pets/{id}",
      parameters: [],
      baseUrl: "",
    };
    expect(endpointToTitle(ep)).toBe("DELETE /pets/{id}");
  });
});

describe("generateVirtualPages", () => {
  it("generates one virtual page per endpoint", () => {
    const pages = generateVirtualPages(PETSTORE_SPEC);
    // 5 endpoints: GET /pets, POST /pets, GET /pets/{petId}, DELETE /pets/{petId}, GET /users
    expect(pages).toHaveLength(5);
  });

  it("sets correct path under api-reference/", () => {
    const pages = generateVirtualPages(PETSTORE_SPEC);
    const listPets = pages.find((p) => p.id === "openapi-list-pets");
    expect(listPets).toBeDefined();
    expect(listPets?.path).toBe("api-reference/list-pets");
  });

  it("sets correct method for sidebar badges", () => {
    const pages = generateVirtualPages(PETSTORE_SPEC);
    const createPet = pages.find((p) => p.id === "openapi-create-pet");
    expect(createPet?.method).toBe("POST");
  });

  it("uses summary as title", () => {
    const pages = generateVirtualPages(PETSTORE_SPEC);
    const listPets = pages.find((p) => p.id === "openapi-list-pets");
    expect(listPets?.title).toBe("List all pets");
  });

  it("groups endpoints by tag", () => {
    const pages = generateVirtualPages(PETSTORE_SPEC);
    const petPages = pages.filter((p) => p.group === "Pets");
    const userPages = pages.filter((p) => p.group === "Users");
    expect(petPages).toHaveLength(4);
    expect(userPages).toHaveLength(1);
  });

  it("assigns endpoint data for rendering", () => {
    const pages = generateVirtualPages(PETSTORE_SPEC);
    const getPet = pages.find((p) => p.id === "openapi-get-pet-by-id");
    expect(getPet?.endpoint.method).toBe("GET");
    expect(getPet?.endpoint.path).toBe("/pets/{petId}");
    expect(getPet?.endpoint.parameters).toHaveLength(1);
    expect(getPet?.endpoint.parameters[0].name).toBe("petId");
  });

  it("returns empty array for invalid spec", () => {
    expect(generateVirtualPages({})).toEqual([]);
    expect(generateVirtualPages({ openapi: "3.0.0" })).toEqual([]);
  });

  it("deduplicates slugs when operationId collision would occur", () => {
    const spec = {
      openapi: "3.0.0",
      info: { title: "Test", version: "1.0" },
      paths: {
        "/a": {
          get: { operationId: "doThing", responses: {} },
          post: { operationId: "doThing", responses: {} },
        },
      },
    };
    const pages = generateVirtualPages(spec);
    const slugs = pages.map((p) => p.path);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("defaults group to 'Endpoints' when no tags", () => {
    const spec = {
      openapi: "3.0.0",
      info: { title: "Test", version: "1.0" },
      paths: {
        "/health": {
          get: { operationId: "healthCheck", responses: {} },
        },
      },
    };
    const pages = generateVirtualPages(spec);
    expect(pages[0].group).toBe("Endpoints");
  });
});

describe("isAsyncApiSpec", () => {
  it("returns true for AsyncAPI specs", () => {
    expect(isAsyncApiSpec(ASYNCAPI_SPEC)).toBe(true);
  });

  it("returns false for OpenAPI specs", () => {
    expect(isAsyncApiSpec(PETSTORE_SPEC)).toBe(false);
  });

  it("returns false for empty objects", () => {
    expect(isAsyncApiSpec({})).toBe(false);
  });
});

describe("generateAsyncApiPages", () => {
  it("generates pages from AsyncAPI channels", () => {
    const pages = generateAsyncApiPages(ASYNCAPI_SPEC);
    expect(pages).toHaveLength(2);
  });

  it("uses channel name as title", () => {
    const pages = generateAsyncApiPages(ASYNCAPI_SPEC);
    const chatPage = pages.find((p) => p.title === "chat/messages");
    expect(chatPage).toBeDefined();
    expect(chatPage?.path).toBe("api-reference/chat-messages");
  });

  it("extracts subscribe and publish operations", () => {
    const pages = generateAsyncApiPages(ASYNCAPI_SPEC);
    const chatPage = pages.find((p) => p.title === "chat/messages");
    expect(chatPage?.channel.subscribe?.summary).toBe("Receive chat messages");
    expect(chatPage?.channel.publish?.summary).toBe("Send chat messages");
  });

  it("uses tag for group when available", () => {
    const pages = generateAsyncApiPages(ASYNCAPI_SPEC);
    const chatPage = pages.find((p) => p.title === "chat/messages");
    expect(chatPage?.group).toBe("Chat");
  });

  it("defaults group to 'WebSocket Channels'", () => {
    const pages = generateAsyncApiPages(ASYNCAPI_SPEC);
    const statusPage = pages.find((p) => p.title === "user/status");
    expect(statusPage?.group).toBe("WebSocket Channels");
  });

  it("returns empty for non-AsyncAPI spec", () => {
    expect(generateAsyncApiPages(PETSTORE_SPEC)).toEqual([]);
  });
});

describe("renderAsyncApiChannelPage", () => {
  it("renders channel HTML with WS badge", () => {
    const pages = generateAsyncApiPages(ASYNCAPI_SPEC);
    const chatPage = pages[0];
    const html = renderAsyncApiChannelPage(chatPage);
    expect(html).toContain("method-hook");
    expect(html).toContain("WS");
    expect(html).toContain(chatPage.channel.name);
  });

  it("renders subscribe section", () => {
    const pages = generateAsyncApiPages(ASYNCAPI_SPEC);
    const chatPage = pages.find((p) => p.title === "chat/messages");
    expect(chatPage).toBeDefined();
    const html = renderAsyncApiChannelPage(chatPage as VirtualAsyncApiPage);
    expect(html).toContain("Subscribe");
    expect(html).toContain("Receive chat messages");
  });

  it("renders publish section", () => {
    const pages = generateAsyncApiPages(ASYNCAPI_SPEC);
    const chatPage = pages.find((p) => p.title === "chat/messages");
    expect(chatPage).toBeDefined();
    const html = renderAsyncApiChannelPage(chatPage as VirtualAsyncApiPage);
    expect(html).toContain("Publish");
    expect(html).toContain("Send chat messages");
  });

  it("omits publish section when not present", () => {
    const pages = generateAsyncApiPages(ASYNCAPI_SPEC);
    const statusPage = pages.find((p) => p.title === "user/status");
    expect(statusPage).toBeDefined();
    const html = renderAsyncApiChannelPage(statusPage as VirtualAsyncApiPage);
    expect(html).toContain("Subscribe");
    expect(html).not.toContain("Publish");
  });
});

describe("generateGoExample", () => {
  it("generates Go code for GET request", () => {
    const ep: OpenApiEndpoint = {
      method: "GET",
      path: "/pets",
      baseUrl: "https://api.example.com",
      parameters: [],
    };
    const code = generateGoExample(ep);
    expect(code).toContain("package main");
    expect(code).toContain("net/http");
    expect(code).toContain('"GET"');
    expect(code).toContain("https://api.example.com/pets");
    expect(code).toContain("http.DefaultClient.Do(req)");
  });

  it("includes auth header for bearer auth", () => {
    const ep: OpenApiEndpoint = {
      method: "GET",
      path: "/pets",
      baseUrl: "https://api.example.com",
      parameters: [],
      auth: { type: "http", scheme: "bearer" },
    };
    const code = generateGoExample(ep);
    expect(code).toContain("Authorization");
    expect(code).toContain("Bearer <token>");
  });

  it("includes body and strings import for POST requests", () => {
    const ep: OpenApiEndpoint = {
      method: "POST",
      path: "/pets",
      baseUrl: "https://api.example.com",
      parameters: [],
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    };
    const code = generateGoExample(ep);
    expect(code).toContain('"strings"');
    expect(code).toContain("strings.NewReader");
    expect(code).toContain('"POST"');
    expect(code).toContain("Content-Type");
  });
});

describe("buildVirtualApiNav", () => {
  it("groups pages by group label", () => {
    const pages = generateVirtualPages(PETSTORE_SPEC);
    const nav = buildVirtualApiNav(pages);
    expect(nav).toHaveLength(2); // Pets + Users
    const petsGroup = nav.find((g) => g.groupLabel === "Pets");
    expect(petsGroup?.items).toHaveLength(4);
    const usersGroup = nav.find((g) => g.groupLabel === "Users");
    expect(usersGroup?.items).toHaveLength(1);
  });

  it("preserves method for sidebar badges", () => {
    const pages = generateVirtualPages(PETSTORE_SPEC);
    const nav = buildVirtualApiNav(pages);
    const petsGroup = nav.find((g) => g.groupLabel === "Pets");
    expect(petsGroup).toBeDefined();
    const getMethods = (
      petsGroup as NonNullable<typeof petsGroup>
    ).items.filter((i) => i.method === "GET").length;
    expect(getMethods).toBe(2);
  });
});

describe("findVirtualPage", () => {
  it("finds page by target path", () => {
    const pages = generateVirtualPages(PETSTORE_SPEC);
    const found = findVirtualPage(pages, "api-reference/list-pets");
    expect(found).toBeDefined();
    expect(found?.title).toBe("List all pets");
  });

  it("returns undefined for unknown path", () => {
    const pages = generateVirtualPages(PETSTORE_SPEC);
    expect(findVirtualPage(pages, "api-reference/nonexistent")).toBeUndefined();
  });
});

describe("findVirtualAsyncApiPage", () => {
  it("finds async page by target path", () => {
    const pages = generateAsyncApiPages(ASYNCAPI_SPEC);
    const found = findVirtualAsyncApiPage(pages, "api-reference/chat-messages");
    expect(found).toBeDefined();
    expect(found?.title).toBe("chat/messages");
  });
});

describe("fetchSpecFromUrl", () => {
  it("returns null for empty URL", async () => {
    const result = await fetchSpecFromUrl("");
    expect(result).toBeNull();
  });

  it("returns null for whitespace-only URL", async () => {
    const result = await fetchSpecFromUrl("   ");
    expect(result).toBeNull();
  });
});
