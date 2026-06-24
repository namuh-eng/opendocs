import { describe, expect, it } from "vitest";
import {
  getGroupName,
  pageToMarkdown,
  slugifyHeading,
  titleize,
} from "@/lib/page-chrome";

describe("page-chrome utilities", () => {
  describe("titleize", () => {
    it("converts slug to title case", () => {
      expect(titleize("getting-started")).toBe("Getting Started");
    });

    it("handles single word", () => {
      expect(titleize("overview")).toBe("Overview");
    });

    it("handles multiple hyphens", () => {
      expect(titleize("api-reference-guide")).toBe("Api Reference Guide");
    });
  });

  describe("getGroupName", () => {
    it("returns null for root-level pages", () => {
      expect(getGroupName("introduction")).toBeNull();
    });

    it("returns parent segment titleized for nested pages", () => {
      expect(getGroupName("guides/quickstart")).toBe("Guides");
    });

    it("returns immediate parent for deeply nested pages", () => {
      expect(getGroupName("api/endpoints/users")).toBe("Endpoints");
    });

    it("handles empty string", () => {
      expect(getGroupName("")).toBeNull();
    });

    it("handles path with leading/trailing slashes stripped", () => {
      expect(getGroupName("docs/intro")).toBe("Docs");
    });
  });

  describe("pageToMarkdown", () => {
    it("creates markdown with title as H1 and content", () => {
      const result = pageToMarkdown("My Page", "Hello world\n\nMore content");
      expect(result).toBe("# My Page\n\nHello world\n\nMore content");
    });

    it("trims trailing whitespace from content", () => {
      const result = pageToMarkdown("Title", "Content   \n\n  ");
      expect(result).toBe("# Title\n\nContent");
    });

    it("handles empty content", () => {
      const result = pageToMarkdown("Title", "");
      expect(result).toBe("# Title\n\n");
    });
  });

  describe("slugifyHeading", () => {
    it("converts heading text to URL-safe slug", () => {
      expect(slugifyHeading("Getting Started")).toBe("getting-started");
    });

    it("removes special characters", () => {
      expect(slugifyHeading("What's New?")).toBe("whats-new");
    });

    it("collapses multiple hyphens", () => {
      expect(slugifyHeading("Hello   World")).toBe("hello-world");
    });

    it("handles already slugified text", () => {
      expect(slugifyHeading("hello-world")).toBe("hello-world");
    });
  });
});
