import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships, projects } from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";
import { applyRateLimit, buildRateLimitHeaders } from "@/lib/rate-limit";
import {
  MAX_UPLOAD_SIZE,
  getDownloadPresignedUrl,
  getUploadPresignedUrl,
  validateUploadRequest,
} from "@/lib/s3";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

async function getProjectAccess(userId: string, projectId: string) {
  const access = await db
    .select({
      orgId: projects.orgId,
      role: orgMemberships.role,
    })
    .from(projects)
    .innerJoin(
      orgMemberships,
      and(
        eq(orgMemberships.orgId, projects.orgId),
        eq(orgMemberships.userId, userId),
      ),
    )
    .where(eq(projects.id, projectId))
    .limit(1);

  return access[0] ?? null;
}

function parseAssetKey(key: string) {
  const [orgId, projectId, namespace, ...pathParts] = key.split("/");
  if (
    !orgId ||
    !projectId ||
    namespace !== "assets" ||
    pathParts.length === 0
  ) {
    return null;
  }

  return {
    orgId,
    projectId,
  };
}

/**
 * POST /api/uploads/presign
 * Body: { orgId, projectId, filename, contentType }
 * Returns: { url, key } — presigned PUT URL for direct upload to S3
 */
export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      logger.warn("uploads_presign_create_unauthorized", {
        requestId,
        route: "/api/uploads/presign",
        method: "POST",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = applyRateLimit({
      key: `uploads-presign:create:${session.user.id}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      logger.warn("uploads_presign_create_rate_limited", {
        requestId,
        route: "/api/uploads/presign",
        method: "POST",
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: "Too many upload presign requests" },
        { status: 429, headers: buildRateLimitHeaders(rateLimit) },
      );
    }

    const body = (await request.json()) as {
      orgId?: string;
      projectId?: string;
      filename?: string;
      contentType?: string;
      size?: number;
    };

    const { orgId, projectId, filename, contentType, size } = body;

    if (
      !orgId ||
      !projectId ||
      !filename ||
      !contentType ||
      typeof size !== "number"
    ) {
      logger.warn("uploads_presign_create_missing_fields", {
        requestId,
        route: "/api/uploads/presign",
        method: "POST",
      });
      return NextResponse.json(
        {
          error:
            "Missing required fields: orgId, projectId, filename, contentType, size",
        },
        { status: 400 },
      );
    }

    const access = await getProjectAccess(session.user.id, projectId);
    if (!access || access.orgId !== orgId) {
      logger.warn("uploads_presign_create_forbidden", {
        requestId,
        route: "/api/uploads/presign",
        method: "POST",
        userId: session.user.id,
        projectId,
        orgId,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (access.role !== "admin" && access.role !== "editor") {
      logger.warn("uploads_presign_create_role_forbidden", {
        requestId,
        route: "/api/uploads/presign",
        method: "POST",
        userId: session.user.id,
        projectId,
        role: access.role,
      });
      return NextResponse.json(
        { error: "Only admins and editors can upload assets" },
        { status: 403 },
      );
    }

    const validation = validateUploadRequest({ filename, contentType, size });
    if (!validation.valid) {
      logger.warn("uploads_presign_create_invalid_request", {
        requestId,
        route: "/api/uploads/presign",
        method: "POST",
        projectId,
        error: validation.error,
      });
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { url, key } = await getUploadPresignedUrl({
      orgId,
      projectId,
      filename,
      contentType,
      size,
    });

    logger.info("uploads_presign_create_completed", {
      requestId,
      route: "/api/uploads/presign",
      method: "POST",
      projectId,
      orgId,
      key,
    });

    return NextResponse.json(
      {
        url,
        key,
        maxSize: MAX_UPLOAD_SIZE,
        requestId,
      },
      { headers: buildRateLimitHeaders(rateLimit) },
    );
  } catch (error) {
    logger.error("uploads_presign_create_failed", {
      requestId,
      route: "/api/uploads/presign",
      method: "POST",
      error:
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : String(error),
    });
    return NextResponse.json(
      { error: "Failed to generate presigned URL" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/uploads/presign?key=...
 * Returns: { url } — presigned GET URL for downloading/viewing a file
 */
export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      logger.warn("uploads_presign_get_unauthorized", {
        requestId,
        route: "/api/uploads/presign",
        method: "GET",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = applyRateLimit({
      key: `uploads-presign:get:${session.user.id}`,
      limit: 60,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      logger.warn("uploads_presign_get_rate_limited", {
        requestId,
        route: "/api/uploads/presign",
        method: "GET",
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: "Too many download presign requests" },
        { status: 429, headers: buildRateLimitHeaders(rateLimit) },
      );
    }

    const key = request.nextUrl.searchParams.get("key");

    if (!key) {
      logger.warn("uploads_presign_get_missing_key", {
        requestId,
        route: "/api/uploads/presign",
        method: "GET",
      });
      return NextResponse.json(
        { error: "Missing required query param: key" },
        { status: 400 },
      );
    }

    const parsedKey = parseAssetKey(key);
    if (!parsedKey) {
      logger.warn("uploads_presign_get_invalid_key", {
        requestId,
        route: "/api/uploads/presign",
        method: "GET",
        key,
      });
      return NextResponse.json({ error: "Invalid asset key" }, { status: 400 });
    }

    const access = await getProjectAccess(session.user.id, parsedKey.projectId);
    if (!access || access.orgId !== parsedKey.orgId) {
      logger.warn("uploads_presign_get_forbidden", {
        requestId,
        route: "/api/uploads/presign",
        method: "GET",
        userId: session.user.id,
        projectId: parsedKey.projectId,
        orgId: parsedKey.orgId,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = await getDownloadPresignedUrl(key);
    logger.info("uploads_presign_get_completed", {
      requestId,
      route: "/api/uploads/presign",
      method: "GET",
      key,
      projectId: parsedKey.projectId,
    });
    return NextResponse.json(
      { url, requestId },
      { headers: buildRateLimitHeaders(rateLimit) },
    );
  } catch (error) {
    logger.error("uploads_presign_get_failed", {
      requestId,
      route: "/api/uploads/presign",
      method: "GET",
      error:
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : String(error),
    });
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 },
    );
  }
}
