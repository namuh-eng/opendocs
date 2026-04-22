import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiKeys, orgMemberships } from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** DELETE /api/api-keys/:id — revoke (delete) an API key */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("api_keys_delete_unauthorized", {
      requestId,
      route: "/api/api-keys/[id]",
      method: "DELETE",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Get user's org membership
  const [membership] = await db
    .select({ orgId: orgMemberships.orgId, role: orgMemberships.role })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (!membership) {
    logger.warn("api_keys_delete_missing_membership", {
      requestId,
      route: "/api/api-keys/[id]",
      method: "DELETE",
      userId: session.user.id,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (membership.role !== "admin") {
    logger.warn("api_keys_delete_forbidden", {
      requestId,
      route: "/api/api-keys/[id]",
      method: "DELETE",
      orgId: membership.orgId,
      role: membership.role,
      apiKeyId: id,
    });
    return NextResponse.json(
      { error: "Forbidden — admin role required" },
      { status: 403 },
    );
  }

  // Delete the key only if it belongs to this org
  const deleted = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.orgId, membership.orgId)))
    .returning({ id: apiKeys.id });

  if (deleted.length === 0) {
    logger.warn("api_keys_delete_missing", {
      requestId,
      route: "/api/api-keys/[id]",
      method: "DELETE",
      orgId: membership.orgId,
      apiKeyId: id,
    });
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  logger.info("api_keys_delete_completed", {
    requestId,
    route: "/api/api-keys/[id]",
    method: "DELETE",
    orgId: membership.orgId,
    apiKeyId: id,
  });

  return NextResponse.json({ success: true, requestId });
}
