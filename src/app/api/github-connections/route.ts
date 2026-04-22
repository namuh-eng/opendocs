import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  githubConnections,
  orgMemberships,
  organizations,
} from "@/lib/db/schema";
import { validateCreateConnectionRequest } from "@/lib/github-webhook";
import { createRequestId, logger } from "@/lib/logger";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** Resolve user's org and role. */
async function resolveUserOrg(userId: string) {
  const rows = await db
    .select({
      orgId: orgMemberships.orgId,
      role: orgMemberships.role,
      orgName: organizations.name,
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(eq(orgMemberships.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

/** GET /api/github-connections — list GitHub connections for user's org */
export async function GET() {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("github_connections_list_unauthorized", {
      requestId,
      route: "/api/github-connections",
      method: "GET",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await resolveUserOrg(session.user.id);
  if (!org) {
    logger.info("github_connections_list_no_org", {
      requestId,
      route: "/api/github-connections",
      method: "GET",
      userId: session.user.id,
    });
    return NextResponse.json({ connections: [], requestId });
  }

  const connections = await db
    .select()
    .from(githubConnections)
    .where(eq(githubConnections.orgId, org.orgId));

  logger.info("github_connections_list_completed", {
    requestId,
    route: "/api/github-connections",
    method: "GET",
    orgId: org.orgId,
    connectionCount: connections.length,
  });

  return NextResponse.json({ connections, requestId });
}

/** POST /api/github-connections — create a new GitHub connection */
export async function POST(request: Request) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("github_connections_create_unauthorized", {
      requestId,
      route: "/api/github-connections",
      method: "POST",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await resolveUserOrg(session.user.id);
  if (!org) {
    logger.warn("github_connections_create_no_org", {
      requestId,
      route: "/api/github-connections",
      method: "POST",
      userId: session.user.id,
    });
    return NextResponse.json(
      { error: "No organization found" },
      { status: 403 },
    );
  }

  if (org.role !== "admin" && org.role !== "editor") {
    logger.warn("github_connections_create_forbidden", {
      requestId,
      route: "/api/github-connections",
      method: "POST",
      userId: session.user.id,
      role: org.role,
      orgId: org.orgId,
    });
    return NextResponse.json(
      { error: "Only admins and editors can manage GitHub connections" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const validation = validateCreateConnectionRequest(body);

  if (!validation.valid) {
    logger.warn("github_connections_create_invalid_request", {
      requestId,
      route: "/api/github-connections",
      method: "POST",
      orgId: org.orgId,
      error: validation.error,
    });
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const installationId = validation.installationId ?? "";
  const repos = validation.repos ?? [];
  const autoUpdateEnabled = validation.autoUpdateEnabled ?? true;

  // Check for existing connection with same installation ID
  const existing = await db
    .select()
    .from(githubConnections)
    .where(eq(githubConnections.installationId, installationId))
    .limit(1);

  if (existing.length > 0) {
    // Update existing connection
    const [updated] = await db
      .update(githubConnections)
      .set({
        repos,
        autoUpdateEnabled,
      })
      .where(eq(githubConnections.id, existing[0].id))
      .returning();

    logger.info("github_connections_update_completed", {
      requestId,
      route: "/api/github-connections",
      method: "POST",
      orgId: org.orgId,
      connectionId: updated.id,
      installationId,
    });

    return NextResponse.json({ connection: updated, requestId });
  }

  const [connection] = await db
    .insert(githubConnections)
    .values({
      orgId: org.orgId,
      installationId,
      repos,
      autoUpdateEnabled,
    })
    .returning();

  logger.info("github_connections_create_completed", {
    requestId,
    route: "/api/github-connections",
    method: "POST",
    orgId: org.orgId,
    connectionId: connection.id,
    installationId,
  });

  return NextResponse.json({ connection, requestId }, { status: 201 });
}

/** DELETE /api/github-connections — remove a GitHub connection */
export async function DELETE(request: Request) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("github_connections_delete_unauthorized", {
      requestId,
      route: "/api/github-connections",
      method: "DELETE",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await resolveUserOrg(session.user.id);
  if (!org) {
    logger.warn("github_connections_delete_no_org", {
      requestId,
      route: "/api/github-connections",
      method: "DELETE",
      userId: session.user.id,
    });
    return NextResponse.json(
      { error: "No organization found" },
      { status: 403 },
    );
  }

  if (org.role !== "admin") {
    logger.warn("github_connections_delete_forbidden", {
      requestId,
      route: "/api/github-connections",
      method: "DELETE",
      userId: session.user.id,
      role: org.role,
      orgId: org.orgId,
    });
    return NextResponse.json(
      { error: "Only admins can remove GitHub connections" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("id");

  if (!connectionId) {
    logger.warn("github_connections_delete_missing_id", {
      requestId,
      route: "/api/github-connections",
      method: "DELETE",
      orgId: org.orgId,
    });
    return NextResponse.json(
      { error: "Connection ID is required" },
      { status: 400 },
    );
  }

  await db
    .delete(githubConnections)
    .where(
      and(
        eq(githubConnections.id, connectionId),
        eq(githubConnections.orgId, org.orgId),
      ),
    );

  logger.info("github_connections_delete_completed", {
    requestId,
    route: "/api/github-connections",
    method: "DELETE",
    orgId: org.orgId,
    connectionId,
  });

  return NextResponse.json({ success: true, requestId });
}
