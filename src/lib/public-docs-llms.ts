import { db } from "@/lib/db";
import { pages, projects } from "@/lib/db/schema";
import { generateLlmsFullTxt, generateLlmsTxt } from "@/lib/llms-txt";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export type PublicLlmsType = "index" | "full";

export function buildPublicDocsBaseUrl(origin: string, subdomain: string) {
  return `${origin.replace(/\/+$/, "")}/docs/${subdomain}`;
}

export async function getPublicDocsLlmsResponse(
  request: Request,
  subdomain: string,
  type: PublicLlmsType,
) {
  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (!project) {
    return new NextResponse("Project not found", { status: 404 });
  }

  const publishedPages = await db
    .select({
      path: pages.path,
      title: pages.title,
      content: pages.content,
    })
    .from(pages)
    .where(and(eq(pages.projectId, project.id), eq(pages.isPublished, true)))
    .orderBy(pages.path);

  const baseUrl = buildPublicDocsBaseUrl(
    new URL(request.url).origin,
    subdomain,
  );
  const content =
    type === "full"
      ? generateLlmsFullTxt(project.name, baseUrl, publishedPages)
      : generateLlmsTxt(project.name, baseUrl, publishedPages);

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
