import { db } from "@/lib/db";
import { pages, projects } from "@/lib/db/schema";
import { generateSitemapEntries, renderSitemapXml } from "@/lib/seo";
import { and, eq } from "drizzle-orm";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3015";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subdomain: string }> },
) {
  const { subdomain } = await params;

  const projectResult = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (projectResult.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  const allPages = await db
    .select({
      path: pages.path,
      title: pages.title,
      description: pages.description,
      updatedAt: pages.updatedAt,
      frontmatter: pages.frontmatter,
      isPublished: pages.isPublished,
    })
    .from(pages)
    .where(
      and(
        eq(pages.projectId, projectResult[0].id),
        eq(pages.isPublished, true),
      ),
    )
    .orderBy(pages.path);

  const entries = generateSitemapEntries(allPages, APP_URL, subdomain);
  const xml = renderSitemapXml(entries);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
