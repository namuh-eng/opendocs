import {
  buildCanonicalUrl,
  buildPageMetadata,
  generateRobotsTxt,
  generateSitemapEntries,
  getOgImage,
  isHidden,
  isNoIndex,
  renderSitemapXml,
} from "@/lib/seo";
import type { SeoPageData } from "@/lib/seo";
import { describe, expect, it } from "vitest";

describe("SEO utilities", () => {
  // ── isNoIndex ────────────────────────────────────────────────────────
  describe("isNoIndex", () => {
    it("returns false when frontmatter is null", () => {
      expect(isNoIndex(null)).toBe(false);
    });

    it("returns false when noindex is not set", () => {
      expect(isNoIndex({ title: "Hello" })).toBe(false);
    });

    it("returns true when noindex is true", () => {
      expect(isNoIndex({ noindex: true })).toBe(true);
    });

    it("returns false when noindex is false", () => {
      expect(isNoIndex({ noindex: false })).toBe(false);
    });
  });

  // ── isHidden ─────────────────────────────────────────────────────────
  describe("isHidden", () => {
    it("returns false when frontmatter is null", () => {
      expect(isHidden(null)).toBe(false);
    });

    it("returns true when hidden is true", () => {
      expect(isHidden({ hidden: true })).toBe(true);
    });

    it("returns false when hidden is not set", () => {
      expect(isHidden({})).toBe(false);
    });
  });

  // ── getOgImage ───────────────────────────────────────────────────────
  describe("getOgImage", () => {
    it("returns null when frontmatter is null", () => {
      expect(getOgImage(null)).toBeNull();
    });

    it("returns null when ogImage is not set", () => {
      expect(getOgImage({})).toBeNull();
    });

    it("returns the URL when ogImage is set", () => {
      expect(getOgImage({ ogImage: "https://example.com/img.png" })).toBe(
        "https://example.com/img.png",
      );
    });

    it("returns null when ogImage is empty string", () => {
      expect(getOgImage({ ogImage: "" })).toBeNull();
    });

    it("trims whitespace from ogImage URL", () => {
      expect(getOgImage({ ogImage: "  https://example.com/img.png  " })).toBe(
        "https://example.com/img.png",
      );
    });
  });

  // ── buildCanonicalUrl ────────────────────────────────────────────────
  describe("buildCanonicalUrl", () => {
    it("builds correct canonical URL", () => {
      expect(
        buildCanonicalUrl("https://example.com", "my-docs", "getting-started"),
      ).toBe("https://example.com/docs/my-docs/getting-started");
    });

    it("strips trailing slash from base URL", () => {
      expect(
        buildCanonicalUrl("https://example.com/", "my-docs", "intro"),
      ).toBe("https://example.com/docs/my-docs/intro");
    });
  });

  // ── generateSitemapEntries ───────────────────────────────────────────
  describe("generateSitemapEntries", () => {
    const basePages: SeoPageData[] = [
      {
        path: "introduction",
        title: "Introduction",
        description: "Intro page",
        updatedAt: new Date("2026-01-15"),
        frontmatter: null,
        isPublished: true,
      },
      {
        path: "guides/quickstart",
        title: "Quickstart",
        description: "Quick start guide",
        updatedAt: new Date("2026-02-20"),
        frontmatter: null,
        isPublished: true,
      },
      {
        path: "hidden-page",
        title: "Hidden",
        description: null,
        updatedAt: new Date("2026-03-01"),
        frontmatter: { noindex: true },
        isPublished: true,
      },
      {
        path: "draft-page",
        title: "Draft",
        description: null,
        updatedAt: new Date("2026-03-01"),
        frontmatter: null,
        isPublished: false,
      },
    ];

    it("excludes noindex pages", () => {
      const entries = generateSitemapEntries(
        basePages,
        "https://example.com",
        "my-docs",
      );
      expect(
        entries.find((e) => e.loc.includes("hidden-page")),
      ).toBeUndefined();
    });

    it("excludes unpublished pages", () => {
      const entries = generateSitemapEntries(
        basePages,
        "https://example.com",
        "my-docs",
      );
      expect(entries.find((e) => e.loc.includes("draft-page"))).toBeUndefined();
    });

    it("includes published indexable pages", () => {
      const entries = generateSitemapEntries(
        basePages,
        "https://example.com",
        "my-docs",
      );
      expect(entries).toHaveLength(2);
      expect(entries[0].loc).toBe(
        "https://example.com/docs/my-docs/introduction",
      );
    });

    it("gives priority 1.0 to introduction page", () => {
      const entries = generateSitemapEntries(
        basePages,
        "https://example.com",
        "my-docs",
      );
      expect(entries[0].priority).toBe(1.0);
    });

    it("gives priority 0.7 to other pages", () => {
      const entries = generateSitemapEntries(
        basePages,
        "https://example.com",
        "my-docs",
      );
      expect(entries[1].priority).toBe(0.7);
    });

    it("formats lastmod as YYYY-MM-DD", () => {
      const entries = generateSitemapEntries(
        basePages,
        "https://example.com",
        "my-docs",
      );
      expect(entries[0].lastmod).toBe("2026-01-15");
    });
  });

  // ── renderSitemapXml ─────────────────────────────────────────────────
  describe("renderSitemapXml", () => {
    it("renders valid XML with entries", () => {
      const xml = renderSitemapXml([
        {
          loc: "https://example.com/docs/test/intro",
          lastmod: "2026-01-15",
          changefreq: "weekly",
          priority: 1.0,
        },
      ]);

      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain("<urlset");
      expect(xml).toContain("<loc>https://example.com/docs/test/intro</loc>");
      expect(xml).toContain("<lastmod>2026-01-15</lastmod>");
      expect(xml).toContain("<priority>1</priority>");
    });

    it("escapes special XML characters in URLs", () => {
      const xml = renderSitemapXml([
        {
          loc: "https://example.com/docs/test/page?a=1&b=2",
          lastmod: "2026-01-15",
          changefreq: "weekly",
          priority: 0.7,
        },
      ]);

      expect(xml).toContain("&amp;");
      expect(xml).not.toContain("?a=1&b=2");
    });

    it("renders empty urlset when no entries", () => {
      const xml = renderSitemapXml([]);
      expect(xml).toContain("<urlset");
      expect(xml).toContain("</urlset>");
      expect(xml).not.toContain("<url>");
    });
  });

  // ── generateRobotsTxt ────────────────────────────────────────────────
  describe("generateRobotsTxt", () => {
    it("allows crawling and includes sitemap when allowed", () => {
      const txt = generateRobotsTxt("https://example.com", "my-docs", true);
      expect(txt).toContain("Allow: /");
      expect(txt).toContain(
        "Sitemap: https://example.com/docs/my-docs/sitemap.xml",
      );
    });

    it("disallows all crawling when not allowed", () => {
      const txt = generateRobotsTxt("https://example.com", "my-docs", false);
      expect(txt).toContain("Disallow: /");
      expect(txt).not.toContain("Sitemap:");
    });
  });

  // ── buildPageMetadata ────────────────────────────────────────────────
  describe("buildPageMetadata", () => {
    const basePage: SeoPageData = {
      path: "guides/quickstart",
      title: "Quickstart",
      description: "Get started quickly",
      updatedAt: new Date("2026-01-15"),
      frontmatter: null,
      isPublished: true,
    };

    it("builds title with project name when no global seo title", () => {
      const meta = buildPageMetadata(
        basePage,
        "My Project",
        "https://example.com",
        "my-docs",
        "",
        "",
      );
      expect(meta.title).toBe("Quickstart | My Project");
    });

    it("builds title with global seo title when available", () => {
      const meta = buildPageMetadata(
        basePage,
        "My Project",
        "https://example.com",
        "my-docs",
        "My Docs",
        "",
      );
      expect(meta.title).toBe("Quickstart | My Docs");
    });

    it("uses page description when available", () => {
      const meta = buildPageMetadata(
        basePage,
        "My Project",
        "https://example.com",
        "my-docs",
        "",
        "",
      );
      expect(meta.description).toBe("Get started quickly");
    });

    it("falls back to global seo description", () => {
      const page = { ...basePage, description: null };
      const meta = buildPageMetadata(
        page,
        "My Project",
        "https://example.com",
        "my-docs",
        "",
        "Global description",
      );
      expect(meta.description).toBe("Global description");
    });

    it("builds correct canonical URL", () => {
      const meta = buildPageMetadata(
        basePage,
        "My Project",
        "https://example.com",
        "my-docs",
        "",
        "",
      );
      expect(meta.canonical).toBe(
        "https://example.com/docs/my-docs/guides/quickstart",
      );
    });

    it("extracts ogImage from frontmatter", () => {
      const page = {
        ...basePage,
        frontmatter: { ogImage: "https://img.example.com/og.png" },
      };
      const meta = buildPageMetadata(
        page,
        "My Project",
        "https://example.com",
        "my-docs",
        "",
        "",
      );
      expect(meta.ogImage).toBe("https://img.example.com/og.png");
    });

    it("detects noindex from frontmatter", () => {
      const page = {
        ...basePage,
        frontmatter: { noindex: true },
      };
      const meta = buildPageMetadata(
        page,
        "My Project",
        "https://example.com",
        "my-docs",
        "",
        "",
      );
      expect(meta.noindex).toBe(true);
    });
  });
});
