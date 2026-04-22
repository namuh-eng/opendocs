import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/auth-schema";
import { orgMemberships } from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";
import {
  canManageRole,
  formatMemberForResponse,
  validateInviteRequest,
} from "@/lib/members";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

async function getUserOrg() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [membership] = await db
    .select({ orgId: orgMemberships.orgId, role: orgMemberships.role })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (!membership) return null;
  return {
    userId: session.user.id,
    orgId: membership.orgId,
    role: membership.role,
  };
}

/** GET /api/members — list all members of the user's org */
export async function GET() {
  const requestId = createRequestId();
  const ctx = await getUserOrg();
  if (!ctx) {
    logger.warn("members_list_unauthorized", {
      requestId,
      route: "/api/members",
      method: "GET",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      membershipId: orgMemberships.id,
      userId: orgMemberships.userId,
      role: orgMemberships.role,
      joinedAt: orgMemberships.createdAt,
      userName: user.name,
      userEmail: user.email,
      userImage: user.image,
    })
    .from(orgMemberships)
    .innerJoin(user, eq(orgMemberships.userId, user.id))
    .where(eq(orgMemberships.orgId, ctx.orgId))
    .orderBy(orgMemberships.createdAt);

  const members = rows.map(formatMemberForResponse);
  logger.info("members_list_completed", {
    requestId,
    route: "/api/members",
    method: "GET",
    orgId: ctx.orgId,
    memberCount: members.length,
  });
  return NextResponse.json({ members, requestId });
}

/** POST /api/members — invite a user to the org by email */
export async function POST(request: Request) {
  const requestId = createRequestId();
  const ctx = await getUserOrg();
  if (!ctx) {
    logger.warn("members_invite_unauthorized", {
      requestId,
      route: "/api/members",
      method: "POST",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageRole(ctx.role, "viewer")) {
    logger.warn("members_invite_forbidden", {
      requestId,
      route: "/api/members",
      method: "POST",
      orgId: ctx.orgId,
      role: ctx.role,
    });
    return NextResponse.json(
      { error: "Forbidden — admin role required" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const validation = validateInviteRequest(body);
  if (!validation.valid) {
    logger.warn("members_invite_invalid_request", {
      requestId,
      route: "/api/members",
      method: "POST",
      orgId: ctx.orgId,
      error: validation.error,
    });
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Find user by email
  const [targetUser] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.email, validation.email))
    .limit(1);

  if (!targetUser) {
    logger.warn("members_invite_user_missing", {
      requestId,
      route: "/api/members",
      method: "POST",
      orgId: ctx.orgId,
      email: validation.email,
    });
    return NextResponse.json(
      { error: "No user found with that email. They must sign up first." },
      { status: 404 },
    );
  }

  // Check if already a member
  const [existing] = await db
    .select({ id: orgMemberships.id })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.orgId, ctx.orgId),
        eq(orgMemberships.userId, targetUser.id),
      ),
    )
    .limit(1);

  if (existing) {
    logger.warn("members_invite_already_exists", {
      requestId,
      route: "/api/members",
      method: "POST",
      orgId: ctx.orgId,
      targetUserId: targetUser.id,
    });
    return NextResponse.json(
      { error: "User is already a member of this organization" },
      { status: 409 },
    );
  }

  const [membership] = await db
    .insert(orgMemberships)
    .values({
      orgId: ctx.orgId,
      userId: targetUser.id,
      role: validation.role,
    })
    .returning();

  logger.info("members_invite_completed", {
    requestId,
    route: "/api/members",
    method: "POST",
    orgId: ctx.orgId,
    membershipId: membership.id,
    targetUserId: targetUser.id,
    invitedRole: membership.role,
  });

  return NextResponse.json(
    {
      member: {
        id: membership.id,
        userId: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: membership.role,
        joinedAt: membership.createdAt.toISOString(),
      },
      requestId,
    },
    { status: 201 },
  );
}
