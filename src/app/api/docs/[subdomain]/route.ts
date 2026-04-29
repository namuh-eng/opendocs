import { db } from "@/lib/db";
import { pages, projects } from "@/lib/db/schema";
import {
  getDocsAccessCookieName,
  hasValidDocsAccess,
} from "@/lib/project-docs-access";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/docs/[subdomain] — public endpoint to fetch all published pages for a docs site */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> },
) {
  const { subdomain } = await params;

  // Find project by subdomain
  const project = await db
    .select({
      id: projects.id,
      name: projects.name,
      subdomain: projects.subdomain,
      settings: projects.settings,
    })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (project.length === 0) {
    return NextResponse.json(
      { error: "Documentation site not found" },
      { status: 404 },
    );
  }

  const projectData = project[0];
  if (
    !hasValidDocsAccess(
      projectData.settings,
      subdomain,
      request.cookies.get(getDocsAccessCookieName(subdomain))?.value,
    )
  ) {
    return NextResponse.json(
      { error: "Docs password required" },
      { status: 401 },
    );
  }

  // Fetch all published pages for this project
  const publishedPages = await db
    .select({
      id: pages.id,
      path: pages.path,
      title: pages.title,
      description: pages.description,
      content: pages.content,
      frontmatter: pages.frontmatter,
      isPublished: pages.isPublished,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .where(
      and(eq(pages.projectId, projectData.id), eq(pages.isPublished, true)),
    )
    .orderBy(pages.path);

  return NextResponse.json({
    project: {
      id: projectData.id,
      name: projectData.name,
      subdomain: projectData.subdomain,
      settings: projectData.settings,
    },
    pages: publishedPages,
  });
}
