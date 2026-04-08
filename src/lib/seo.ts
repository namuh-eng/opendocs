/**
 * SEO utilities — sitemap generation, robots.txt, metadata helpers.
 */

export interface SeoPageData {
  path: string;
  title: string;
  description: string | null;
  updatedAt: Date;
  frontmatter: Record<string, unknown> | null;
  isPublished: boolean;
}

export interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: number;
}

/** Check if a page should be excluded from sitemap/search indexing. */
export function isNoIndex(
  frontmatter: Record<string, unknown> | null,
): boolean {
  if (!frontmatter) return false;
  return frontmatter.noindex === true;
}

/** Check if a page is hidden from navigation (but may still be accessible). */
export function isHidden(frontmatter: Record<string, unknown> | null): boolean {
  if (!frontmatter) return false;
  return frontmatter.hidden === true;
}

/** Get the OG image URL from frontmatter. */
export function getOgImage(
  frontmatter: Record<string, unknown> | null,
): string | null {
  if (!frontmatter) return null;
  const ogImage = frontmatter.ogImage;
  if (typeof ogImage === "string" && ogImage.trim()) return ogImage.trim();
  return null;
}

/** Build the canonical URL for a docs page. */
export function buildCanonicalUrl(
  baseUrl: string,
  subdomain: string,
  pagePath: string,
): string {
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/docs/${subdomain}/${pagePath}`;
}

/** Generate sitemap entries from pages. Excludes noindex and unpublished pages. */
export function generateSitemapEntries(
  pages: SeoPageData[],
  baseUrl: string,
  subdomain: string,
): SitemapEntry[] {
  return pages
    .filter((p) => p.isPublished && !isNoIndex(p.frontmatter))
    .map((p) => ({
      loc: buildCanonicalUrl(baseUrl, subdomain, p.path),
      lastmod: p.updatedAt.toISOString().split("T")[0],
      changefreq: "weekly",
      priority: p.path === "introduction" || p.path === "" ? 1.0 : 0.7,
    }));
}

/** Render sitemap entries as XML. */
export function renderSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${escapeXml(e.loc)}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

/** Generate robots.txt content. */
export function generateRobotsTxt(
  baseUrl: string,
  subdomain: string,
  allowCrawling: boolean,
): string {
  const sitemapUrl = `${baseUrl.replace(/\/+$/, "")}/docs/${subdomain}/sitemap.xml`;

  if (!allowCrawling) {
    return "User-agent: *\nDisallow: /\n";
  }

  return `User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`;
}

/** Build page metadata for Next.js generateMetadata. */
export function buildPageMetadata(
  page: SeoPageData,
  projectName: string,
  baseUrl: string,
  subdomain: string,
  globalSeoTitle: string,
  globalSeoDescription: string,
): {
  title: string;
  description: string;
  canonical: string;
  ogImage: string | null;
  noindex: boolean;
} {
  const pageTitle = page.title || "Untitled";
  const title = globalSeoTitle
    ? `${pageTitle} | ${globalSeoTitle}`
    : `${pageTitle} | ${projectName}`;

  const description =
    page.description || globalSeoDescription || `${pageTitle} documentation`;

  const canonical = buildCanonicalUrl(baseUrl, subdomain, page.path);
  const ogImage = getOgImage(page.frontmatter);
  const noindex = isNoIndex(page.frontmatter);

  return { title, description, canonical, ogImage, noindex };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
