import { describe, expect, it } from "vitest";

// ── Slug generation tests ───────────────────────────────────────────────────

describe("org slug generation", () => {
  // Import the function we'll build
  async function getSlugify() {
    const mod = await import("@/lib/orgs");
    return mod.slugify;
  }

  it("converts name to lowercase kebab-case", async () => {
    const slugify = await getSlugify();
    expect(slugify("My Cool Org")).toBe("my-cool-org");
  });

  it("strips special characters", async () => {
    const slugify = await getSlugify();
    expect(slugify("Hello & World!")).toBe("hello-world");
  });

  it("collapses multiple hyphens", async () => {
    const slugify = await getSlugify();
    expect(slugify("foo---bar")).toBe("foo-bar");
  });

  it("trims leading/trailing hyphens", async () => {
    const slugify = await getSlugify();
    expect(slugify("--hello--")).toBe("hello");
  });

  it("handles unicode by stripping non-ascii", async () => {
    const slugify = await getSlugify();
    expect(slugify("Café Org")).toBe("caf-org");
  });
});

// ── Org name validation tests ───────────────────────────────────────────────

describe("org name validation", () => {
  async function getValidateOrgName() {
    const mod = await import("@/lib/orgs");
    return mod.validateOrgName;
  }

  it("accepts valid org names", async () => {
    const validate = await getValidateOrgName();
    expect(validate("My Organization")).toBeNull();
    expect(validate("Acme Inc")).toBeNull();
    expect(validate("AB")).toBeNull();
  });

  it("rejects empty names", async () => {
    const validate = await getValidateOrgName();
    expect(validate("")).toBe("Organization name is required");
    expect(validate("   ")).toBe("Organization name is required");
  });

  it("rejects names that are too short", async () => {
    const validate = await getValidateOrgName();
    expect(validate("A")).toBe("Name must be at least 2 characters");
  });

  it("rejects names that are too long", async () => {
    const validate = await getValidateOrgName();
    const longName = "a".repeat(129);
    expect(validate(longName)).toBe("Name must be at most 128 characters");
  });
});

// ── Org creation API logic tests ────────────────────────────────────────────

describe("org creation request validation", () => {
  async function getValidateCreateOrgRequest() {
    const mod = await import("@/lib/orgs");
    return mod.validateCreateOrgRequest;
  }

  it("returns error when name is missing", async () => {
    const validate = await getValidateCreateOrgRequest();
    expect(validate({})).toEqual({
      valid: false,
      error: "Organization name is required",
    });
  });

  it("returns error when name is not a string", async () => {
    const validate = await getValidateCreateOrgRequest();
    expect(validate({ name: 123 })).toEqual({
      valid: false,
      error: "Organization name is required",
    });
  });

  it("returns success with trimmed name for valid input", async () => {
    const validate = await getValidateCreateOrgRequest();
    expect(validate({ name: "  My Org  " })).toEqual({
      valid: true,
      name: "My Org",
    });
  });
});
