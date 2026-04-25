import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships, pages, projects } from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";
import { getGitHubImportAccessMessage, resolveGitHubImportAccessForProject } from "@/lib/github-import";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * POST /api/onboarding/provision
 *
 * One-shot provisioning of initial documentation content for a new project.
 * Only allowed if the project has no pages yet.
 */
export async function POST(request: Request) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { projectId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { projectId } = body;
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  // Verify project belongs to user's org
  const membership = await db
    .select({ orgId: orgMemberships.orgId })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (membership.length === 0) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  const projectRows = await db
    .select({ id: projects.id, status: projects.status })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, membership[0].orgId)))
    .limit(1);

  if (projectRows.length === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Verify project has no pages (to prevent overwriting)
  const existingPages = await db
    .select({ id: pages.id })
    .from(pages)
    .where(eq(pages.projectId, projectId))
    .limit(1);

  if (existingPages.length > 0) {
    return NextResponse.json({ error: "Project already has content" }, { status: 409 });
  }

  const importAccess = await resolveGitHubImportAccessForProject({
    projectId,
    userId: session.user.id,
  });

  const importAccessError = getGitHubImportAccessMessage(importAccess);
  if (importAccessError) {
    return NextResponse.json(
      {
        error: importAccessError,
        githubImportAccess: importAccess,
      },
      { status: 409 },
    );
  }

  // Provision initial content
  await db.insert(pages).values([
    {
      projectId,
      path: "introduction",
      title: "Introduction",
      content: "# Introduction\n\nWelcome to your new documentation site! This page was automatically generated during onboarding.",
      isPublished: true,
    },
    {
      projectId,
      path: "quickstart",
      title: "Quickstart",
      content: "# Quickstart\n\nGet up and running in minutes with our quickstart guide.",
      isPublished: true,
    }
  ]);

  const provisioning =
    importAccess.status === "public" || importAccess.status === "private_connected"
      ? {
          mode: "starter_docs",
          source: importAccess.status,
          message:
            "Starter docs were created during onboarding. Verified GitHub import has not run yet.",
        }
      : {
          mode: "starter_docs",
          source: "blank",
          message: "Starter docs were created during onboarding.",
        };

  logger.info("onboarding_provision_completed", {
    requestId,
    projectId,
    orgId: membership[0].orgId,
    userId: session.user.id,
    provisioningMode: provisioning.mode,
    provisioningSource: provisioning.source,
  });

  return NextResponse.json({ ok: true, requestId, provisioning });
}
