import { enqueueDeployment } from "@/lib/async-execution";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  auditLogs,
  deployments,
  orgMemberships,
  organizations,
  projects,
} from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";
import {
  generateSubdomain,
  slugifyProject,
  validateCreateProjectRequest,
} from "@/lib/projects";
import {
  getGitHubImportAccessMessage,
  listConnectedGitHubRepos,
  resolveGitHubImportAccessForRepoUrl,
} from "@/lib/github-import";
import { buildGitHubSourceSelection, mergeProjectSettingsWithGitHubSource } from "@/lib/github-source";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** GET /api/projects — list projects for the user's org */
export async function GET() {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("projects_list_unauthorized", {
      requestId,
      route: "/api/projects",
      method: "GET",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve the user's org
  const membership = await db
    .select({
      orgId: orgMemberships.orgId,
      orgSlug: organizations.slug,
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (membership.length === 0) {
    return NextResponse.json({ projects: [] });
  }

  const orgId = membership[0].orgId;

  const orgProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      repoUrl: projects.repoUrl,
      repoBranch: projects.repoBranch,
      customDomain: projects.customDomain,
      subdomain: projects.subdomain,
      status: projects.status,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.orgId, orgId))
    .orderBy(projects.createdAt);

  logger.info("projects_list_completed", {
    requestId,
    route: "/api/projects",
    method: "GET",
    projectCount: orgProjects.length,
  });

  return NextResponse.json({ projects: orgProjects, requestId });
}

/** POST /api/projects — create a new project in the user's org */
export async function POST(request: Request) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("projects_create_unauthorized", {
      requestId,
      route: "/api/projects",
      method: "POST",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve org + check admin role
  const membership = await db
    .select({
      orgId: orgMemberships.orgId,
      role: orgMemberships.role,
      orgSlug: organizations.slug,
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (membership.length === 0) {
    logger.warn("projects_create_missing_org", {
      requestId,
      route: "/api/projects",
      method: "POST",
      userId: session.user.id,
    });
    return NextResponse.json(
      { error: "You must belong to an organization" },
      { status: 403 },
    );
  }

  const { orgId, orgSlug, role } = membership[0];

  if (role !== "admin" && role !== "editor") {
    logger.warn("projects_create_forbidden", {
      requestId,
      route: "/api/projects",
      method: "POST",
      userId: session.user.id,
      role,
    });
    return NextResponse.json(
      { error: "Only admins and editors can create projects" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const validation = validateCreateProjectRequest(body);

  if (!validation.valid) {
    logger.warn("projects_create_invalid_request", {
      requestId,
      route: "/api/projects",
      method: "POST",
      error: validation.error,
    });
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  if (validation.repoUrl) {
    const importAccess = await resolveGitHubImportAccessForRepoUrl({
      orgId,
      repoUrl: validation.repoUrl,
    });

    const importAccessError = getGitHubImportAccessMessage(importAccess);
    if (importAccessError) {
      logger.warn("projects_create_github_connection_required", {
        requestId,
        route: "/api/projects",
        method: "POST",
        orgId,
        repoUrl: validation.repoUrl,
        importAccessStatus: importAccess.status,
      });
      return NextResponse.json(
        {
          error: importAccessError,
          githubImportAccess: importAccess,
        },
        { status: 400 },
      );
    }
  }

  const slug = slugifyProject(validation.name);
  if (!slug) {
    logger.warn("projects_create_invalid_slug", {
      requestId,
      route: "/api/projects",
      method: "POST",
      projectName: validation.name,
    });
    return NextResponse.json(
      { error: "Could not generate a valid slug from project name" },
      { status: 400 },
    );
  }

  // Check slug uniqueness within org
  const existing = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.orgId, orgId), eq(projects.slug, slug)))
    .limit(1);

  const finalSlug =
    existing.length > 0 ? `${slug}-${Date.now().toString(36)}` : slug;

  const subdomain = generateSubdomain(orgSlug, finalSlug);

  const shouldCreateInitialDeployment =
    validation.valid &&
    "createInitialDeployment" in validation &&
    validation.createInitialDeployment === true;

  let githubSourceSelection = null;
  if (validation.repoUrl) {
    const connectedRepos = await listConnectedGitHubRepos(orgId);
    const matchedRepo = validation.githubInstallationId
      ? connectedRepos.find(
          (repo) =>
            repo.installationId === validation.githubInstallationId &&
            `https://github.com/${repo.fullName}`.toLowerCase() ===
              validation.repoUrl?.toLowerCase(),
        )
      : null;

    githubSourceSelection = buildGitHubSourceSelection({
      repoUrl: validation.repoUrl,
      installationId: matchedRepo?.installationId ?? validation.githubInstallationId,
      repoBranch: matchedRepo?.branch ?? "main",
      repoPath: "/",
    });
  }

  const { project, deployment } = await db.transaction(async (tx) => {
    const [createdProject] = await tx
      .insert(projects)
      .values({
        orgId,
        name: validation.name,
        slug: finalSlug,
        subdomain,
        repoUrl: validation.repoUrl ?? null,
        settings: mergeProjectSettingsWithGitHubSource(
          {},
          githubSourceSelection,
        ),
        status: shouldCreateInitialDeployment ? "deploying" : "active",
      })
      .returning();

    if (!shouldCreateInitialDeployment) {
      return {
        project: createdProject,
        deployment: null,
      };
    }

    const [createdDeployment] = await tx
      .insert(deployments)
      .values({
        projectId: createdProject.id,
        status: "in_progress",
        commitMessage: "Initial deployment",
        startedAt: new Date(),
      })
      .returning();

    return {
      project: createdProject,
      deployment: createdDeployment,
    };
  });

  const enqueueResult = deployment
    ? await enqueueDeployment(deployment.id, project.id)
    : null;

  if (deployment && enqueueResult?.handoff === "manual_followup_required") {
    await db.insert(auditLogs).values({
      orgId,
      userId: session.user.id,
      action: "project_initial_deployment_manual_handoff_required",
      details: {
        requestId,
        deploymentId: deployment.id,
        projectId: project.id,
        executionMode: enqueueResult.mode,
      },
    });
  }

  logger.info("projects_create_completed", {
    requestId,
    route: "/api/projects",
    method: "POST",
    projectId: project.id,
    orgId,
    createdInitialDeployment: Boolean(deployment),
    simulationEnabled: enqueueResult?.mode === "simulation",
    executionHandoff: enqueueResult?.handoff ?? null,
  });

  return NextResponse.json(
    deployment
      ? {
          project,
          deployment: {
            ...deployment,
            executionMode: enqueueResult?.mode ?? "manual",
            executionHandoff:
              enqueueResult?.handoff ?? "manual_followup_required",
          },
          requestId,
        }
      : { project, requestId },
    {
      status: 201,
    },
  );
}

