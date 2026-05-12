import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { githubConnections, orgMemberships } from "@/lib/db/schema";
import { hydrateGitHubInstallationRepos } from "@/lib/github-app-setup";
import type { GitHubRepo } from "@/lib/github-webhook";
import { createRequestId, logger } from "@/lib/logger";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const SETTINGS_PATH = "/settings/deployment/github";
const ORG_STATE_PREFIX = "org:";

type ResolvedUserOrg =
  | {
      org: { orgId: string; role: string };
      error: null;
    }
  | {
      org: null;
      error: "no_org" | "org_required";
    };

function parseOrgIdFromState(value: string | null): string | null {
  const state = value?.trim();
  if (!state?.startsWith(ORG_STATE_PREFIX)) return null;

  return state.slice(ORG_STATE_PREFIX.length).trim() || null;
}

async function resolveUserOrg(
  userId: string,
  requestedOrgId: string | null,
): Promise<ResolvedUserOrg> {
  if (requestedOrgId) {
    const rows = await db
      .select({
        orgId: orgMemberships.orgId,
        role: orgMemberships.role,
      })
      .from(orgMemberships)
      .where(
        and(
          eq(orgMemberships.userId, userId),
          eq(orgMemberships.orgId, requestedOrgId),
        ),
      )
      .limit(1);

    return rows[0]
      ? { org: rows[0], error: null }
      : { org: null, error: "no_org" };
  }

  const rows = await db
    .select({
      orgId: orgMemberships.orgId,
      role: orgMemberships.role,
    })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, userId))
    .limit(2);

  if (rows.length === 0) return { org: null, error: "no_org" };
  if (rows.length > 1) return { org: null, error: "org_required" };

  return { org: rows[0], error: null };
}

function redirectWithStatus(request: Request, params: Record<string, string>) {
  const url = new URL(SETTINGS_PATH, request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url, { status: 303 });
}

function parseInstallationId(value: string | null): string | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric) || numeric <= 0) return null;
  return value;
}

/**
 * GET /api/github-connections/callback
 *
 * GitHub redirects the app setup URL here with installation_id and setup_action.
 * We only persist after minting a real installation token and hydrating the
 * repositories GitHub reports for that installation.
 */
export async function GET(request: Request) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    logger.warn("github_app_setup_callback_unauthorized", {
      requestId,
      route: "/api/github-connections/callback",
      method: "GET",
    });
    return redirectWithStatus(request, {
      github_app: "error",
      error: "unauthorized",
      requestId,
    });
  }

  const url = new URL(request.url);
  const installationId = parseInstallationId(
    url.searchParams.get("installation_id"),
  );
  const setupAction = url.searchParams.get("setup_action") ?? "";
  const requestedOrgId = parseOrgIdFromState(url.searchParams.get("state"));

  if (
    !installationId ||
    !["install", "update", "request"].includes(setupAction)
  ) {
    logger.warn("github_app_setup_callback_invalid_request", {
      requestId,
      route: "/api/github-connections/callback",
      method: "GET",
      userId: session.user.id,
      setupAction,
      hasInstallationId: Boolean(installationId),
    });
    return redirectWithStatus(request, {
      github_app: "error",
      error: "invalid_callback",
      requestId,
    });
  }

  const resolvedOrg = await resolveUserOrg(session.user.id, requestedOrgId);
  const org = resolvedOrg.org;
  if (!org) {
    logger.warn("github_app_setup_callback_no_org", {
      requestId,
      route: "/api/github-connections/callback",
      method: "GET",
      userId: session.user.id,
      requestedOrgId,
      error: resolvedOrg.error,
    });
    return redirectWithStatus(request, {
      github_app: "error",
      error: resolvedOrg.error ?? "no_org",
      requestId,
    });
  }

  if (org.role !== "admin" && org.role !== "editor") {
    logger.warn("github_app_setup_callback_forbidden", {
      requestId,
      route: "/api/github-connections/callback",
      method: "GET",
      userId: session.user.id,
      role: org.role,
      orgId: org.orgId,
    });
    return redirectWithStatus(request, {
      github_app: "error",
      error: "forbidden",
      requestId,
    });
  }

  let repos: GitHubRepo[];
  try {
    repos = await hydrateGitHubInstallationRepos(installationId);
  } catch (error) {
    logger.error("github_app_setup_callback_hydrate_failed", {
      requestId,
      route: "/api/github-connections/callback",
      method: "GET",
      orgId: org.orgId,
      installationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return redirectWithStatus(request, {
      github_app: "error",
      error: "installation_auth_failed",
      requestId,
    });
  }

  const existing = await db
    .select()
    .from(githubConnections)
    .where(eq(githubConnections.installationId, installationId))
    .limit(1);

  if (existing[0] && existing[0].orgId !== org.orgId) {
    logger.warn("github_app_setup_callback_installation_conflict", {
      requestId,
      route: "/api/github-connections/callback",
      method: "GET",
      orgId: org.orgId,
      existingOrgId: existing[0].orgId,
      installationId,
    });
    return redirectWithStatus(request, {
      github_app: "error",
      error: "installation_already_connected",
      requestId,
    });
  }

  if (existing[0]) {
    const [connection] = await db
      .update(githubConnections)
      .set({
        repos,
        autoUpdateEnabled: true,
      })
      .where(eq(githubConnections.id, existing[0].id))
      .returning();

    logger.info("github_app_setup_callback_updated", {
      requestId,
      route: "/api/github-connections/callback",
      method: "GET",
      orgId: org.orgId,
      connectionId: connection.id,
      installationId,
      repoCount: repos.length,
      setupAction,
    });
  } else {
    const [connection] = await db
      .insert(githubConnections)
      .values({
        orgId: org.orgId,
        installationId,
        repos,
        autoUpdateEnabled: true,
      })
      .returning();

    logger.info("github_app_setup_callback_created", {
      requestId,
      route: "/api/github-connections/callback",
      method: "GET",
      orgId: org.orgId,
      connectionId: connection.id,
      installationId,
      repoCount: repos.length,
      setupAction,
    });
  }

  return redirectWithStatus(request, {
    github_app: "connected",
    installation_id: installationId,
    requestId,
  });
}
