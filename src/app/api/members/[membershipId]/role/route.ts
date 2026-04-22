import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships } from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";
import { canManageRole, validateRoleUpdate } from "@/lib/members";
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

/** PATCH /api/members/[membershipId]/role — update a member's role */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  const requestId = createRequestId();
  const ctx = await getUserOrg();
  if (!ctx) {
    logger.warn("member_role_update_unauthorized", {
      requestId,
      route: "/api/members/[membershipId]/role",
      method: "PATCH",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageRole(ctx.role, "viewer")) {
    logger.warn("member_role_update_forbidden", {
      requestId,
      route: "/api/members/[membershipId]/role",
      method: "PATCH",
      orgId: ctx.orgId,
      role: ctx.role,
    });
    return NextResponse.json(
      { error: "Forbidden — admin role required" },
      { status: 403 },
    );
  }

  const { membershipId } = await params;
  const body = await request.json();
  const validation = validateRoleUpdate(body);
  if (!validation.valid) {
    logger.warn("member_role_update_invalid_request", {
      requestId,
      route: "/api/members/[membershipId]/role",
      method: "PATCH",
      orgId: ctx.orgId,
      membershipId,
      error: validation.error,
    });
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Verify membership belongs to this org
  const [membership] = await db
    .select({ id: orgMemberships.id, userId: orgMemberships.userId })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.id, membershipId),
        eq(orgMemberships.orgId, ctx.orgId),
      ),
    )
    .limit(1);

  if (!membership) {
    logger.warn("member_role_update_missing", {
      requestId,
      route: "/api/members/[membershipId]/role",
      method: "PATCH",
      orgId: ctx.orgId,
      membershipId,
    });
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Cannot change your own role
  if (membership.userId === ctx.userId) {
    logger.warn("member_role_update_self_blocked", {
      requestId,
      route: "/api/members/[membershipId]/role",
      method: "PATCH",
      orgId: ctx.orgId,
      membershipId,
      userId: ctx.userId,
    });
    return NextResponse.json(
      { error: "Cannot change your own role" },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(orgMemberships)
    .set({ role: validation.role })
    .where(eq(orgMemberships.id, membershipId))
    .returning();

  logger.info("member_role_update_completed", {
    requestId,
    route: "/api/members/[membershipId]/role",
    method: "PATCH",
    orgId: ctx.orgId,
    membershipId,
    targetUserId: membership.userId,
    role: updated.role,
  });

  return NextResponse.json({
    member: { id: updated.id, role: updated.role },
    requestId,
  });
}
