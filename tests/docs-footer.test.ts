import {
  type FooterSettings,
  type FooterSocialLink,
  SOCIAL_LINK_TYPES,
  getBrandName,
  getBrandUrl,
  getFooterSettings,
  getPoweredByTooltip,
  getValidSocialLinks,
} from "@/lib/docs-footer";
import { describe, expect, it } from "vitest";

describe("docs-footer utilities", () => {
  describe("SOCIAL_LINK_TYPES", () => {
    it("defines x, github, and linkedin types", () => {
      expect(SOCIAL_LINK_TYPES.x.label).toBe("X (Twitter)");
      expect(SOCIAL_LINK_TYPES.github.label).toBe("GitHub");
      expect(SOCIAL_LINK_TYPES.linkedin.label).toBe("LinkedIn");
    });

    it("has aria labels for each type", () => {
      expect(SOCIAL_LINK_TYPES.x.ariaLabel).toBe("Follow on X");
      expect(SOCIAL_LINK_TYPES.github.ariaLabel).toBe("View on GitHub");
      expect(SOCIAL_LINK_TYPES.linkedin.ariaLabel).toBe("Connect on LinkedIn");
    });
  });

  describe("getFooterSettings", () => {
    it("returns empty object for null settings", () => {
      expect(getFooterSettings(null)).toEqual({});
    });

    it("returns empty object for undefined settings", () => {
      expect(getFooterSettings(undefined)).toEqual({});
    });

    it("returns empty object when no footer key exists", () => {
      expect(getFooterSettings({ theme: "dark" })).toEqual({});
    });

    it("returns footer settings when present", () => {
      const footer: FooterSettings = {
        brandName: "Acme Docs",
        brandUrl: "https://acme.com",
        socialLinks: [{ type: "x", url: "https://x.com/acme" }],
      };
      expect(getFooterSettings({ footer })).toEqual(footer);
    });
  });

  describe("getValidSocialLinks", () => {
    it("returns empty array when no socialLinks", () => {
      expect(getValidSocialLinks({})).toEqual([]);
    });

    it("returns empty array for undefined socialLinks", () => {
      expect(getValidSocialLinks({ socialLinks: undefined })).toEqual([]);
    });

    it("filters out links with empty URLs", () => {
      const links: FooterSocialLink[] = [
        { type: "x", url: "" },
        { type: "github", url: "https://github.com/acme" },
      ];
      const result = getValidSocialLinks({ socialLinks: links });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("github");
    });

    it("filters out links with whitespace-only URLs", () => {
      const links: FooterSocialLink[] = [
        { type: "x", url: "   " },
        { type: "linkedin", url: "https://linkedin.com/company/acme" },
      ];
      const result = getValidSocialLinks({ socialLinks: links });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("linkedin");
    });

    it("returns all valid links", () => {
      const links: FooterSocialLink[] = [
        { type: "x", url: "https://x.com/acme" },
        { type: "github", url: "https://github.com/acme" },
        { type: "linkedin", url: "https://linkedin.com/company/acme" },
      ];
      const result = getValidSocialLinks({ socialLinks: links });
      expect(result).toHaveLength(3);
    });

    it("filters out links with invalid type", () => {
      const links = [
        { type: "x" as const, url: "https://x.com/acme" },
        {
          type: "facebook" as FooterSocialLink["type"],
          url: "https://facebook.com/acme",
        },
      ];
      const result = getValidSocialLinks({ socialLinks: links });
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("x");
    });
  });

  describe("getBrandName", () => {
    it("returns brandName from settings when set", () => {
      expect(getBrandName({ brandName: "Acme Docs" })).toBe("Acme Docs");
    });

    it("falls back to projectName when brandName not set", () => {
      expect(getBrandName({}, "My Project")).toBe("My Project");
    });

    it("falls back to Mintlify when nothing set", () => {
      expect(getBrandName({})).toBe("Mintlify");
    });

    it("prefers brandName over projectName", () => {
      expect(getBrandName({ brandName: "Custom" }, "Project")).toBe("Custom");
    });
  });

  describe("getBrandUrl", () => {
    it("returns brandUrl from settings when set", () => {
      expect(getBrandUrl({ brandUrl: "https://acme.com" })).toBe(
        "https://acme.com",
      );
    });

    it("defaults to / when not set", () => {
      expect(getBrandUrl({})).toBe("/");
    });
  });

  describe("getPoweredByTooltip", () => {
    it("generates tooltip with brand name", () => {
      expect(getPoweredByTooltip("Acme Docs")).toBe(
        "This documentation is built and hosted on Acme Docs",
      );
    });

    it("generates tooltip with Mintlify default", () => {
      expect(getPoweredByTooltip("Mintlify")).toBe(
        "This documentation is built and hosted on Mintlify",
      );
    });
  });
});
