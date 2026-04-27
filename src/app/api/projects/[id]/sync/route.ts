import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships, projects } from "@/lib/db/schema";
import { syncProjectDocsFromGitHub } from "@/lib/github-sync";
import { createRequestId, logger } from "@/lib/logger";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * POST /api/projects/[id]/sync
 *
 * Manual trigger for doc synchronization from GitHub.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = createRequestId();
  const { id: projectId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify project and org membership
  const projectResult = await db
    .select({
      id: projects.id,
      orgId: projects.orgId,
    })
    .from(projects)
    .innerJoin(orgMemberships, eq(orgMemberships.orgId, projects.orgId))
    .where(
      and(
        eq(projects.id, projectId),
        eq(orgMemberships.userId, session.user.id),
      ),
    )
    .limit(1);

  if (projectResult.length === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { orgId } = projectResult[0];

  try {
    const result = await syncProjectDocsFromGitHub({
      projectId,
      orgId,
      requestId,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, requestId },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: result.message,
      importedPageCount: result.importedPageCount,
      requestId,
    });
  } catch (error) {
    logger.error("manual_sync_failed", {
      requestId,
      projectId,
      err: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to synchronize documentation", requestId },
      { status: 500 },
    );
  }
}
