import { db } from "@/lib/db";
import { pages, projects } from "@/lib/db/schema";
import { importGitHubDocs } from "@/lib/github-docs-import";
import { resolveGitHubImportAccess } from "@/lib/github-import";
import { buildGitHubInstallationAuthHeaders } from "@/lib/github-installation-auth";
import { createRequestId, logger } from "@/lib/logger";
import { and, eq, inArray } from "drizzle-orm";

export interface SyncDocsResult {
  ok: boolean;
  message: string;
  importedPageCount?: number;
}

/**
 * syncProjectDocsFromGitHub
 *
 * Core logic to fetch markdown from GitHub and update the local database.
 * Re-uses the established import and auth patterns.
 */
export async function syncProjectDocsFromGitHub(params: {
  projectId: string;
  orgId: string;
  requestId?: string;
  branchOverride?: string;
}): Promise<SyncDocsResult> {
  const requestId = params.requestId ?? createRequestId();
  const { projectId, orgId, branchOverride } = params;

  // 1. Fetch project details
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)))
    .limit(1);

  if (!project) {
    return { ok: false, message: "Project not found" };
  }

  if (!project.repoUrl) {
    return { ok: false, message: "Project has no GitHub repository linked" };
  }

  // 2. Resolve access
  const importAccess = await resolveGitHubImportAccess({
    orgId,
    repoUrl: project.repoUrl,
    repoBranch: project.repoBranch,
    repoPath: project.repoPath,
    settings: project.settings,
  });

  // 3. Prepare headers (if connected)
  const branch = branchOverride || project.repoBranch || "main";
  let headers: HeadersInit | undefined;
  if (importAccess.status === "private_connected") {
    const installationId = (
      project.settings?.githubSource as { installationId?: string } | undefined
    )?.installationId;

    if (installationId) {
      try {
        headers = await buildGitHubInstallationAuthHeaders({ installationId });
      } catch (error) {
        logger.error("sync_docs_auth_failed", {
          requestId,
          projectId,
          err: error instanceof Error ? error.message : String(error),
        });
        // Continue without headers; if it's actually private, importGitHubDocs will fail gracefully
      }
    }
  }

  // 4. Run import
  const importResult = await importGitHubDocs({
    repoUrl: project.repoUrl,
    repoBranch: branch,
    repoPath: project.repoPath,
    headers,
  });

  if (!importResult.ok) {
    return { ok: false, message: importResult.message };
  }

  // 5. Atomic update: diffing sync
  // We match by path to preserve IDs for comments/suggestions and avoid unnecessary timestamp resets.
  await db.transaction(async (tx) => {
    // Fetch existing pages to diff
    const existingPages = await tx
      .select({
        id: pages.id,
        path: pages.path,
        content: pages.content,
        title: pages.title,
      })
      .from(pages)
      .where(eq(pages.projectId, projectId));

    const existingPathMap = new Map(existingPages.map((p) => [p.path, p]));
    const importedPaths = new Set(importResult.pages.map((p) => p.path));

    // 1. Delete pages that no longer exist in GitHub
    const pageIdsToDelete = existingPages
      .filter((p) => !importedPaths.has(p.path))
      .map((p) => p.id);

    if (pageIdsToDelete.length > 0) {
      await tx
        .delete(pages)
        .where(
          and(eq(pages.projectId, projectId), inArray(pages.id, pageIdsToDelete)),
        );
    }

    // 2. Update existing or insert new
    for (const importedPage of importResult.pages) {
      const existing = existingPathMap.get(importedPage.path);

      if (existing) {
        // Only update if content or title changed
        if (
          existing.content !== importedPage.content ||
          existing.title !== importedPage.title
        ) {
          await tx
            .update(pages)
            .set({
              title: importedPage.title,
              content: importedPage.content,
              updatedAt: new Date(),
            })
            .where(eq(pages.id, existing.id));
        }
      } else {
        // New page
        await tx.insert(pages).values({
          projectId,
          path: importedPage.path,
          title: importedPage.title,
          content: importedPage.content,
          isPublished: true,
        });
      }
    }
  });


  logger.info("sync_docs_completed", {
    requestId,
    projectId,
    orgId,
    pageCount: importResult.pages.length,
  });

  return {
    ok: true,
    message: `Successfully imported ${importResult.pages.length} pages from GitHub.`,
    importedPageCount: importResult.pages.length,
  };
}
