import {
  validateProjectName,
  validateSubdomain,
  validateUpdateProjectRequest,
} from "@/lib/projects";
import { describe, expect, it } from "vitest";

describe("settings-general — deployment name editing", () => {
  describe("validateProjectName", () => {
    it("rejects empty name", () => {
      expect(validateProjectName("")).toBe("Project name is required");
      expect(validateProjectName("   ")).toBe("Project name is required");
    });

    it("rejects names shorter than 2 chars", () => {
      expect(validateProjectName("a")).toBe(
        "Name must be at least 2 characters",
      );
    });

    it("rejects names longer than 128 chars", () => {
      const long = "a".repeat(129);
      expect(validateProjectName(long)).toBe(
        "Name must be at most 128 characters",
      );
    });

    it("accepts valid project names", () => {
      expect(validateProjectName("My Docs")).toBeNull();
      expect(validateProjectName("acme")).toBeNull();
      expect(validateProjectName("ab")).toBeNull();
    });

    it("accepts name at max length boundary", () => {
      expect(validateProjectName("a".repeat(128))).toBeNull();
    });
  });

  describe("validateSubdomain", () => {
    it("rejects uppercase letters", () => {
      expect(validateSubdomain("Acme")).toBeTruthy();
    });

    it("rejects special characters", () => {
      expect(validateSubdomain("my_docs")).toBeTruthy();
      expect(validateSubdomain("my.docs")).toBeTruthy();
      expect(validateSubdomain("my docs")).toBeTruthy();
    });

    it("accepts lowercase alphanumeric with hyphens", () => {
      expect(validateSubdomain("acme")).toBeNull();
      expect(validateSubdomain("my-docs")).toBeNull();
      expect(validateSubdomain("docs-v2")).toBeNull();
    });
  });

  describe("validateUpdateProjectRequest — name field", () => {
    it("accepts name-only update", () => {
      const result = validateUpdateProjectRequest({ name: "New Name" });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.fields.name).toBe("New Name");
      }
    });

    it("trims whitespace from name", () => {
      const result = validateUpdateProjectRequest({ name: "  Trimmed  " });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.fields.name).toBe("Trimmed");
      }
    });

    it("rejects non-string name", () => {
      const result = validateUpdateProjectRequest({ name: 123 });
      expect(result.valid).toBe(false);
    });

    it("rejects empty name", () => {
      const result = validateUpdateProjectRequest({ name: "" });
      expect(result.valid).toBe(false);
    });
  });

  describe("validateUpdateProjectRequest — subdomain field", () => {
    it("accepts subdomain-only update", () => {
      const result = validateUpdateProjectRequest({ subdomain: "my-docs" });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.fields.subdomain).toBe("my-docs");
      }
    });

    it("rejects invalid subdomain characters", () => {
      const result = validateUpdateProjectRequest({
        subdomain: "My Docs!",
      });
      expect(result.valid).toBe(false);
    });

    it("rejects non-string subdomain", () => {
      const result = validateUpdateProjectRequest({ subdomain: 42 });
      expect(result.valid).toBe(false);
    });
  });

  describe("validateUpdateProjectRequest — combined fields", () => {
    it("accepts name + subdomain together", () => {
      const result = validateUpdateProjectRequest({
        name: "Acme Docs",
        subdomain: "acme",
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.fields.name).toBe("Acme Docs");
        expect(result.fields.subdomain).toBe("acme");
      }
    });

    it("rejects empty body", () => {
      const result = validateUpdateProjectRequest({});
      expect(result.valid).toBe(false);
    });

    it("rejects null body", () => {
      const result = validateUpdateProjectRequest(null);
      expect(result.valid).toBe(false);
    });

    it("rejects non-object body", () => {
      const result = validateUpdateProjectRequest("string");
      expect(result.valid).toBe(false);
    });
  });
});
