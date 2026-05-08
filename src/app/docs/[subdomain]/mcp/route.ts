import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import {
  getDocsAccessCookieName,
  hasValidDocsAccess,
} from "@/lib/project-docs-access";
import { buildPublicMcpDescriptor } from "@/lib/public-mcp";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> },
) {
  const { subdomain } = await params;
  const [project] = await db
    .select({
      name: projects.name,
      subdomain: projects.subdomain,
      settings: projects.settings,
    })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (!project?.subdomain) {
    return NextResponse.json(
      { error: "Documentation site not found" },
      { status: 404 },
    );
  }

  if (
    !hasValidDocsAccess(
      project.settings,
      subdomain,
      request.cookies.get(getDocsAccessCookieName(subdomain))?.value,
    )
  ) {
    return NextResponse.json(
      { error: "Docs password required" },
      { status: 401 },
    );
  }

  return NextResponse.json(
    buildPublicMcpDescriptor(
      { name: project.name, subdomain: project.subdomain },
      new URL(request.url).origin,
    ),
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
