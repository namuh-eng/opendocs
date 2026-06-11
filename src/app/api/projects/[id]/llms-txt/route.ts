import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pages, projects } from "@/lib/db/schema";
import {
  buildProjectBaseUrl,
  generateLlmsFullTxt,
  generateLlmsTxt,
} from "@/lib/llms-txt";

/**
 * GET /api/projects/[id]/llms-txt?type=full
 *
 * Public endpoint — no auth required (these are meant for LLM consumption).
 * Returns llms.txt by default, or llms-full.txt when ?type=full is provided.
 * Content-Type: text/plain
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const project = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      customDomain: projects.customDomain,
      subdomain: projects.subdomain,
    })
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (project.length === 0) {
    return new NextResponse("Project not found", { status: 404 });
  }

  const proj = project[0];
  const baseUrl = buildProjectBaseUrl(proj);

  const publishedPages = await db
    .select({
      path: pages.path,
      title: pages.title,
      content: pages.content,
    })
    .from(pages)
    .where(and(eq(pages.projectId, id), eq(pages.isPublished, true)))
    .orderBy(pages.path);

  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  const content =
    type === "full"
      ? generateLlmsFullTxt(proj.name, baseUrl, publishedPages)
      : generateLlmsTxt(proj.name, baseUrl, publishedPages);

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
