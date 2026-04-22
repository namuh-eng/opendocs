import {
  extractKeyPrefix,
  generateApiKey,
  hashApiKey,
  validateCreateApiKeyRequest,
} from "@/lib/api-keys";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiKeys, orgMemberships } from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** Resolve the user's first org from their session. */
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

/** GET /api/api-keys — list all API keys for the user's org */
export async function GET() {
  const requestId = createRequestId();
  const ctx = await getUserOrg();
  if (!ctx) {
    logger.warn("api_keys_list_unauthorized", {
      requestId,
      route: "/api/api-keys",
      method: "GET",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      type: apiKeys.type,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.orgId, ctx.orgId))
    .orderBy(apiKeys.createdAt);

  logger.info("api_keys_list_completed", {
    requestId,
    route: "/api/api-keys",
    method: "GET",
    orgId: ctx.orgId,
    keyCount: keys.length,
  });

  return NextResponse.json({ keys, requestId });
}

/** POST /api/api-keys — create a new API key */
export async function POST(request: Request) {
  const requestId = createRequestId();
  const ctx = await getUserOrg();
  if (!ctx) {
    logger.warn("api_keys_create_unauthorized", {
      requestId,
      route: "/api/api-keys",
      method: "POST",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can create keys
  if (ctx.role !== "admin") {
    logger.warn("api_keys_create_forbidden", {
      requestId,
      route: "/api/api-keys",
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
  const validation = validateCreateApiKeyRequest(body);
  if (!validation.valid) {
    logger.warn("api_keys_create_invalid_request", {
      requestId,
      route: "/api/api-keys",
      method: "POST",
      orgId: ctx.orgId,
      error: validation.error,
    });
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const rawKey = generateApiKey(validation.type);
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = extractKeyPrefix(rawKey);

  const [created] = await db
    .insert(apiKeys)
    .values({
      orgId: ctx.orgId,
      name: validation.name,
      keyPrefix,
      keyHash,
      type: validation.type,
    })
    .returning();

  logger.info("api_keys_create_completed", {
    requestId,
    route: "/api/api-keys",
    method: "POST",
    orgId: ctx.orgId,
    apiKeyId: created.id,
    type: created.type,
  });

  return NextResponse.json(
    {
      key: {
        id: created.id,
        name: created.name,
        keyPrefix: created.keyPrefix,
        type: created.type,
        createdAt: created.createdAt,
      },
      rawKey, // shown once to the user
      requestId,
    },
    { status: 201 },
  );
}
