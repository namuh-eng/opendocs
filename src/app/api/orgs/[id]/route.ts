import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships, organizations } from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 1000;

/** DELETE /api/orgs/[id] — permanently delete an organization (admin only) */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("org_delete_unauthorized", {
      requestId,
      route: "/api/orgs/[id]",
      method: "DELETE",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Parse body for reason
  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    logger.warn("org_delete_missing_body", {
      requestId,
      route: "/api/orgs/[id]",
      method: "DELETE",
      orgId: id,
      userId: session.user.id,
    });
    return NextResponse.json(
      { error: "Request body is required" },
      { status: 400 },
    );
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < MIN_REASON_LENGTH) {
    logger.warn("org_delete_reason_too_short", {
      requestId,
      route: "/api/orgs/[id]",
      method: "DELETE",
      orgId: id,
      userId: session.user.id,
      reasonLength: reason.length,
    });
    return NextResponse.json(
      {
        error: `Reason must be at least ${MIN_REASON_LENGTH} characters`,
      },
      { status: 400 },
    );
  }
  if (reason.length > MAX_REASON_LENGTH) {
    logger.warn("org_delete_reason_too_long", {
      requestId,
      route: "/api/orgs/[id]",
      method: "DELETE",
      orgId: id,
      userId: session.user.id,
      reasonLength: reason.length,
    });
    return NextResponse.json(
      {
        error: `Reason must be at most ${MAX_REASON_LENGTH} characters`,
      },
      { status: 400 },
    );
  }

  // Verify user is admin of this org
  const membership = await db
    .select({ orgId: orgMemberships.orgId, role: orgMemberships.role })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.userId, session.user.id),
        eq(orgMemberships.orgId, id),
      ),
    )
    .limit(1);

  if (membership.length === 0) {
    logger.warn("org_delete_missing_membership", {
      requestId,
      route: "/api/orgs/[id]",
      method: "DELETE",
      orgId: id,
      userId: session.user.id,
    });
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  if (membership[0].role !== "admin") {
    logger.warn("org_delete_forbidden", {
      requestId,
      route: "/api/orgs/[id]",
      method: "DELETE",
      orgId: id,
      userId: session.user.id,
      role: membership[0].role,
    });
    return NextResponse.json(
      { error: "Only admins can delete organizations" },
      { status: 403 },
    );
  }

  // Verify org exists
  const existing = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);

  if (existing.length === 0) {
    logger.warn("org_delete_missing", {
      requestId,
      route: "/api/orgs/[id]",
      method: "DELETE",
      orgId: id,
      userId: session.user.id,
    });
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  // Delete org — cascading deletes handle memberships, projects, pages, etc.
  await db.delete(organizations).where(eq(organizations.id, id));

  logger.info("org_delete_completed", {
    requestId,
    route: "/api/orgs/[id]",
    method: "DELETE",
    orgId: id,
    userId: session.user.id,
  });

  return NextResponse.json({ success: true, reason, requestId });
}
