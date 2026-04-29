import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { isProjectPasswordProtected } from "@/lib/project-publication-auth";
import { generateRobotsTxt } from "@/lib/seo";
import { eq } from "drizzle-orm";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3015";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subdomain: string }> },
) {
  const { subdomain } = await params;

  const projectResult = await db
    .select({ id: projects.id, settings: projects.settings })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (projectResult.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  const txt = generateRobotsTxt(
    APP_URL,
    subdomain,
    !isProjectPasswordProtected(projectResult[0].settings),
  );

  return new Response(txt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
