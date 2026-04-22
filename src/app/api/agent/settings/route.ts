/**
 * GET /api/agent/settings — fetch agent settings for the current user's org
 * PUT /api/agent/settings — update agent settings
 *
 * Session-authenticated (dashboard use).
 */

import { validateAgentSettingsUpdate } from "@/lib/agent-settings";
import { db } from "@/lib/db";
import { agentSettings, orgMemberships, organizations } from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";
import { getServerSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

async function resolveOrg(userId: string) {
  const membership = await db
    .select({
      orgId: orgMemberships.orgId,
      role: orgMemberships.role,
    })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, userId))
    .limit(1);

  if (membership.length === 0) return null;

  const orgRows = await db
    .select({ id: organizations.id, plan: organizations.plan })
    .from(organizations)
    .where(eq(organizations.id, membership[0].orgId))
    .limit(1);

  if (orgRows.length === 0) return null;

  return { ...orgRows[0], role: membership[0].role };
}

export async function GET() {
  const requestId = createRequestId();
  const session = await getServerSession();
  if (!session) {
    logger.warn("agent_settings_get_unauthorized", {
      requestId,
      route: "/api/agent/settings",
      method: "GET",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await resolveOrg(session.user.id);
  if (!org) {
    logger.warn("agent_settings_get_no_org", {
      requestId,
      route: "/api/agent/settings",
      method: "GET",
      userId: session.user.id,
    });
    return NextResponse.json(
      { error: "No organization found" },
      { status: 404 },
    );
  }

  const rows = await db
    .select()
    .from(agentSettings)
    .where(eq(agentSettings.orgId, org.id))
    .limit(1);

  const settings = rows[0] ?? null;

  logger.info("agent_settings_get_completed", {
    requestId,
    route: "/api/agent/settings",
    method: "GET",
    userId: session.user.id,
    orgId: org.id,
    hasSettings: Boolean(settings),
    plan: org.plan,
  });

  return NextResponse.json({
    plan: org.plan,
    settings: settings
      ? {
          agentEnabled: settings.agentEnabled,
          slackConnected: settings.slackConnected,
          slackWorkspace: settings.slackWorkspace,
          githubAppInstalled: settings.githubAppInstalled,
          connectedRepos: settings.connectedRepos,
        }
      : {
          agentEnabled: false,
          slackConnected: false,
          slackWorkspace: null,
          githubAppInstalled: false,
          connectedRepos: [],
        },
    requestId,
  });
}

export async function PUT(request: NextRequest) {
  const requestId = createRequestId();
  const session = await getServerSession();
  if (!session) {
    logger.warn("agent_settings_update_unauthorized", {
      requestId,
      route: "/api/agent/settings",
      method: "PUT",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await resolveOrg(session.user.id);
  if (!org) {
    logger.warn("agent_settings_update_no_org", {
      requestId,
      route: "/api/agent/settings",
      method: "PUT",
      userId: session.user.id,
    });
    return NextResponse.json(
      { error: "No organization found" },
      { status: 404 },
    );
  }

  if (org.role === "viewer") {
    logger.warn("agent_settings_update_forbidden", {
      requestId,
      route: "/api/agent/settings",
      method: "PUT",
      userId: session.user.id,
      orgId: org.id,
      role: org.role,
    });
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    logger.warn("agent_settings_update_invalid_json", {
      requestId,
      route: "/api/agent/settings",
      method: "PUT",
      userId: session.user.id,
      orgId: org.id,
    });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = validateAgentSettingsUpdate(body);
  if (!validation.valid) {
    logger.warn("agent_settings_update_invalid_request", {
      requestId,
      route: "/api/agent/settings",
      method: "PUT",
      userId: session.user.id,
      orgId: org.id,
      error: validation.error,
    });
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Check plan gating for enabling agent
  if (validation.data.agentEnabled === true) {
    if (org.plan === "free") {
      logger.warn("agent_settings_update_plan_forbidden", {
        requestId,
        route: "/api/agent/settings",
        method: "PUT",
        userId: session.user.id,
        orgId: org.id,
        plan: org.plan,
      });
      return NextResponse.json(
        { error: "Agent requires Pro or Enterprise plan" },
        { status: 403 },
      );
    }
  }

  // Upsert settings
  const existing = await db
    .select({ id: agentSettings.id })
    .from(agentSettings)
    .where(eq(agentSettings.orgId, org.id))
    .limit(1);

  const updateValues: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (validation.data.agentEnabled !== undefined) {
    updateValues.agentEnabled = validation.data.agentEnabled;
  }
  if (validation.data.slackConnected !== undefined) {
    updateValues.slackConnected = validation.data.slackConnected;
  }
  if (validation.data.slackWorkspace !== undefined) {
    updateValues.slackWorkspace = validation.data.slackWorkspace;
  }
  if (validation.data.githubAppInstalled !== undefined) {
    updateValues.githubAppInstalled = validation.data.githubAppInstalled;
  }
  if (validation.data.connectedRepos !== undefined) {
    updateValues.connectedRepos = validation.data.connectedRepos;
  }

  if (existing.length > 0) {
    await db
      .update(agentSettings)
      .set(updateValues)
      .where(eq(agentSettings.orgId, org.id));
  } else {
    await db.insert(agentSettings).values({
      orgId: org.id,
      ...updateValues,
    });
  }

  // Return updated settings
  const rows = await db
    .select()
    .from(agentSettings)
    .where(eq(agentSettings.orgId, org.id))
    .limit(1);

  const settings = rows[0];

  logger.info("agent_settings_update_completed", {
    requestId,
    route: "/api/agent/settings",
    method: "PUT",
    userId: session.user.id,
    orgId: org.id,
    plan: org.plan,
  });

  return NextResponse.json({
    plan: org.plan,
    settings: {
      agentEnabled: settings.agentEnabled,
      slackConnected: settings.slackConnected,
      slackWorkspace: settings.slackWorkspace,
      githubAppInstalled: settings.githubAppInstalled,
      connectedRepos: settings.connectedRepos,
    },
    requestId,
  });
}
