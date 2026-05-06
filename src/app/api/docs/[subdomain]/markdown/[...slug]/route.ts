import { db } from "@/lib/db";
import { pages, projects } from "@/lib/db/schema";
import { pageToMarkdown } from "@/lib/page-chrome";
import {
  getDocsAccessCookieName,
  hasValidDocsAccess,
} from "@/lib/project-docs-access";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string; slug: string[] }> },
) {
  const { subdomain, slug } = await params;
  const pagePath = slug.join("/").trim();

  if (!pagePath) {
    return new NextResponse("Page path required", { status: 400 });
  }

  const [project] = await db
    .select({
      id: projects.id,
      settings: projects.settings,
    })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (!project) {
    return new NextResponse("Documentation site not found", { status: 404 });
  }

  if (
    !hasValidDocsAccess(
      project.settings,
      subdomain,
      request.cookies.get(getDocsAccessCookieName(subdomain))?.value,
    )
  ) {
    return new NextResponse("Docs password required", { status: 401 });
  }

  const [page] = await db
    .select({ title: pages.title, content: pages.content })
    .from(pages)
    .where(
      and(
        eq(pages.projectId, project.id),
        eq(pages.path, pagePath),
        eq(pages.isPublished, true),
      ),
    )
    .limit(1);

  if (!page) {
    return new NextResponse("Page not found", { status: 404 });
  }

  return new NextResponse(pageToMarkdown(page.title, page.content ?? ""), {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
