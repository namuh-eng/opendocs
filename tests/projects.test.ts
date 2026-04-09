import { describe, expect, it } from "vitest";

// ── Project slug generation ────────────────────────────────────────────────

describe("project slug generation", () => {
  async function getSlugifyProject() {
    const mod = await import("@/lib/projects");
    return mod.slugifyProject;
  }

  it("converts project name to lowercase kebab-case", async () => {
    const slugify = await getSlugifyProject();
    expect(slugify("My Docs Site")).toBe("my-docs-site");
  });

  it("strips special characters", async () => {
    const slugify = await getSlugifyProject();
    expect(slugify("Hello & World!")).toBe("hello-world");
  });

  it("collapses multiple hyphens", async () => {
    const slugify = await getSlugifyProject();
    expect(slugify("foo---bar")).toBe("foo-bar");
  });

  it("trims leading/trailing hyphens", async () => {
    const slugify = await getSlugifyProject();
    expect(slugify("--hello--")).toBe("hello");
  });

  it("handles numbers in names", async () => {
    const slugify = await getSlugifyProject();
    expect(slugify("Docs V2")).toBe("docs-v2");
  });
});

// ── Project name validation ────────────────────────────────────────────────

describe("project name validation", () => {
  async function getValidateProjectName() {
    const mod = await import("@/lib/projects");
    return mod.validateProjectName;
  }

  it("accepts valid project names", async () => {
    const validate = await getValidateProjectName();
    expect(validate("My Docs")).toBeNull();
    expect(validate("API Reference")).toBeNull();
    expect(validate("AB")).toBeNull();
  });

  it("rejects empty names", async () => {
    const validate = await getValidateProjectName();
    expect(validate("")).toBe("Project name is required");
    expect(validate("   ")).toBe("Project name is required");
  });

  it("rejects names that are too short", async () => {
    const validate = await getValidateProjectName();
    expect(validate("A")).toBe("Name must be at least 2 characters");
  });

  it("rejects names that are too long", async () => {
    const validate = await getValidateProjectName();
    const longName = "a".repeat(129);
    expect(validate(longName)).toBe("Name must be at most 128 characters");
  });
});

// ── Subdomain generation ───────────────────────────────────────────────────

describe("subdomain generation", () => {
  async function getGenerateSubdomain() {
    const mod = await import("@/lib/projects");
    return mod.generateSubdomain;
  }

  it("generates subdomain from org slug and project slug", async () => {
    const generate = await getGenerateSubdomain();
    expect(generate("acme", "docs")).toBe("acme-docs");
  });

  it("handles single-word project names", async () => {
    const generate = await getGenerateSubdomain();
    expect(generate("myorg", "documentation")).toBe("myorg-documentation");
  });

  it("returns just project slug if org and project slugs are the same", async () => {
    const generate = await getGenerateSubdomain();
    expect(generate("docs", "docs")).toBe("docs");
  });
});

// ── Create project request validation ──────────────────────────────────────

describe("create project request validation", () => {
  async function getValidateCreateProjectRequest() {
    const mod = await import("@/lib/projects");
    return mod.validateCreateProjectRequest;
  }

  it("returns error when name is missing", async () => {
    const validate = await getValidateCreateProjectRequest();
    expect(validate({})).toEqual({
      valid: false,
      error: "Project name is required",
    });
  });

  it("returns error when name is not a string", async () => {
    const validate = await getValidateCreateProjectRequest();
    expect(validate({ name: 123 })).toEqual({
      valid: false,
      error: "Project name is required",
    });
  });

  it("returns success with trimmed name for valid input", async () => {
    const validate = await getValidateCreateProjectRequest();
    expect(validate({ name: "  My Docs  " })).toEqual({
      valid: true,
      name: "My Docs",
    });
  });

  it("accepts optional repoUrl", async () => {
    const validate = await getValidateCreateProjectRequest();
    expect(
      validate({ name: "My Docs", repoUrl: "https://github.com/acme/docs" }),
    ).toEqual({
      valid: true,
      name: "My Docs",
      repoUrl: "https://github.com/acme/docs",
    });
  });

  it("accepts the onboarding initial deployment flag", async () => {
    const validate = await getValidateCreateProjectRequest();
    expect(
      validate({
        name: "My Docs",
        createInitialDeployment: true,
      }),
    ).toEqual({
      valid: true,
      name: "My Docs",
      createInitialDeployment: true,
    });
  });

  it("rejects invalid repoUrl", async () => {
    const validate = await getValidateCreateProjectRequest();
    expect(validate({ name: "My Docs", repoUrl: "not-a-url" })).toEqual({
      valid: false,
      error: "Invalid repository URL",
    });
  });

  it("rejects non-GitHub repoUrl values", async () => {
    const validate = await getValidateCreateProjectRequest();
    expect(
      validate({ name: "My Docs", repoUrl: "https://example.com/docs" }),
    ).toEqual({
      valid: false,
      error: "Repository URL must be a GitHub repository",
    });
  });
});

// ── Update project request validation ──────────────────────────────────────

describe("update project request validation", () => {
  async function getValidateUpdateProjectRequest() {
    const mod = await import("@/lib/projects");
    return mod.validateUpdateProjectRequest;
  }

  it("accepts valid name update", async () => {
    const validate = await getValidateUpdateProjectRequest();
    expect(validate({ name: "New Name" })).toEqual({
      valid: true,
      fields: { name: "New Name" },
    });
  });

  it("accepts valid subdomain update", async () => {
    const validate = await getValidateUpdateProjectRequest();
    expect(validate({ subdomain: "my-docs" })).toEqual({
      valid: true,
      fields: { subdomain: "my-docs" },
    });
  });

  it("rejects empty body", async () => {
    const validate = await getValidateUpdateProjectRequest();
    expect(validate({})).toEqual({
      valid: false,
      error: "No fields to update",
    });
  });

  it("rejects invalid subdomain characters", async () => {
    const validate = await getValidateUpdateProjectRequest();
    expect(validate({ subdomain: "Hello World!" })).toEqual({
      valid: false,
      error:
        "Subdomain must contain only lowercase letters, numbers, and hyphens",
    });
  });

  it("accepts repoUrl update", async () => {
    const validate = await getValidateUpdateProjectRequest();
    expect(validate({ repoUrl: "https://github.com/acme/docs" })).toEqual({
      valid: true,
      fields: { repoUrl: "https://github.com/acme/docs" },
    });
  });

  it("rejects non-GitHub repoUrl updates", async () => {
    const validate = await getValidateUpdateProjectRequest();
    expect(validate({ repoUrl: "https://example.com/docs" })).toEqual({
      valid: false,
      error: "Repository URL must be a GitHub repository",
    });
  });
});
