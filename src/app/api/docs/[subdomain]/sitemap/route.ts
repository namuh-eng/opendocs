import { db } from "@/lib/db";
import { pages, projects } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3015";

/**
 * GET /api/docs/[subdomain]/sitemap
 *
 * Generates an XML sitemap for a specific documentation site.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subdomain: string }> },
) {
  const { subdomain } = await params;

  // 1. Find project
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (!project) {
    return new Response("Not Found", { status: 404 });
  }

  // 2. Fetch all published pages
  const publishedPages = await db
    .select({
      path: pages.path,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .where(and(eq(pages.projectId, project.id), eq(pages.isPublished, true)));

  // 3. Build XML
  const sitemapEntries = publishedPages
    .map((page) => {
      const url = `${APP_URL}/docs/${subdomain}/${page.path === "introduction" ? "" : page.path}`;
      const lastMod = page.updatedAt
        ? page.updatedAt.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      return `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${page.path === "introduction" ? "1.0" : "0.7"}</priority>
  </url>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=59",
    },
  });
}
