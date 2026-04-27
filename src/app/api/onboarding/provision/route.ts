import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships, pages, projects } from "@/lib/db/schema";
import {
  importGitHubDocs,
  importPublicGitHubDocs,
} from "@/lib/github-docs-import";
import {
  getGitHubImportAccessMessage,
  resolveGitHubImportAccessForProject,
} from "@/lib/github-import";
import {
  GitHubInstallationAuthNotConfiguredError,
  buildGitHubInstallationAuthHeaders,
} from "@/lib/github-installation-auth";
import { createRequestId, logger } from "@/lib/logger";
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
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 },
    );
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
    .select({
      id: projects.id,
      status: projects.status,
      repoUrl: projects.repoUrl,
      repoBranch: projects.repoBranch,
      repoPath: projects.repoPath,
      settings: projects.settings,
    })
    .from(projects)
    .where(
      and(eq(projects.id, projectId), eq(projects.orgId, membership[0].orgId)),
    )
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
    return NextResponse.json(
      { error: "Project already has content" },
      { status: 409 },
    );
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

  let provisioning:
    | {
        mode: "starter_docs";
        source: "blank" | "public";
        message: string;
      }
    | {
        mode: "github_import";
        source: "public";
        message: string;
        importedPageCount: number;
      }
    | {
        mode: "github_import_pending_auth";
        source: "private_connected";
        message: string;
      }
    | {
        mode: "github_import_unavailable";
        source: "private_connected";
        message: string;
      };

  if (importAccess.status === "public" && projectRows[0].repoUrl) {
    const importResult = await importPublicGitHubDocs({
      repoUrl: projectRows[0].repoUrl,
      repoBranch: projectRows[0].repoBranch,
      repoPath: projectRows[0].repoPath,
    });

    if (importResult.ok) {
      await db.insert(pages).values(
        importResult.pages.map((page) => ({
          projectId,
          path: page.path,
          title: page.title,
          content: page.content,
          isPublished: true,
        })),
      );

      provisioning = {
        mode: "github_import",
        source: "public",
        message: `Imported ${importResult.pages.length} page${importResult.pages.length === 1 ? "" : "s"} from the public GitHub repository.`,
        importedPageCount: importResult.pages.length,
      };
    } else {
      await db.insert(pages).values([
        {
          projectId,
          path: "introduction",
          title: "Introduction",
          content:
            "# Introduction\n\nWelcome to your new documentation site! This page was automatically generated during onboarding.",
          isPublished: true,
        },
        {
          projectId,
          path: "quickstart",
          title: "Quickstart",
          content:
            "# Quickstart\n\nGet up and running in minutes with our quickstart guide.",
          isPublished: true,
        },
      ]);

      provisioning = {
        mode: "starter_docs",
        source: "public",
        message: `${importResult.message}. Starter docs were created during onboarding instead.`,
      };
    }
  } else {
    await db.insert(pages).values([
      {
        projectId,
        path: "introduction",
        title: "Introduction",
        content:
          "# Introduction\n\nWelcome to your new documentation site! This page was automatically generated during onboarding.",
        isPublished: true,
      },
      {
        projectId,
        path: "quickstart",
        title: "Quickstart",
        content:
          "# Quickstart\n\nGet up and running in minutes with our quickstart guide.",
        isPublished: true,
      },
    ]);

    if (importAccess.status === "private_connected") {
      const installationId =
        (
          projectRows[0].settings?.githubSource as
            | { installationId?: string }
            | undefined
        )?.installationId ?? null;

      if (!installationId) {
        provisioning = {
          mode: "github_import_pending_auth",
          source: "private_connected",
          message:
            "GitHub repository access is verified, but the selected installation id is missing from project settings. Starter docs were created during onboarding.",
        };
      } else {
        try {
          const headers = await buildGitHubInstallationAuthHeaders({
            installationId,
          });

          const importResult = await importGitHubDocs({
            repoUrl: projectRows[0].repoUrl,
            repoBranch: projectRows[0].repoBranch,
            repoPath: projectRows[0].repoPath,
            headers,
          });

          if (importResult.ok) {
            await db.insert(pages).values(
              importResult.pages.map((page) => ({
                projectId,
                path: page.path,
                title: page.title,
                content: page.content,
                isPublished: true,
              })),
            );

            provisioning = {
              mode: "github_import",
              source: "public",
              message: `Imported ${importResult.pages.length} page${importResult.pages.length === 1 ? "" : "s"} from the connected GitHub repository.`,
              importedPageCount: importResult.pages.length,
            };
          } else {
            provisioning = {
              mode: "github_import_pending_auth",
              source: "private_connected",
              message: `${importResult.message}. Starter docs were created during onboarding.`,
            };
          }
        } catch (error) {
          provisioning =
            error instanceof GitHubInstallationAuthNotConfiguredError
              ? {
                  mode: "github_import_unavailable",
                  source: "private_connected",
                  message:
                    "GitHub repository access is verified, but installation-token auth is not configured yet. Starter docs were created during onboarding.",
                }
              : {
                  mode: "github_import_pending_auth",
                  source: "private_connected",
                  message:
                    "GitHub repository access is verified, but authenticated import is not ready yet. Starter docs were created during onboarding.",
                };
        }
      }
    } else {
      provisioning = {
        mode: "starter_docs",
        source: "blank",
        message: "Starter docs were created during onboarding.",
      };
    }
  }

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
