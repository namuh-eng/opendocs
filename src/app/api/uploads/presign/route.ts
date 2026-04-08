import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships, projects } from "@/lib/db/schema";
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
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (access.role !== "admin" && access.role !== "editor") {
      return NextResponse.json(
        { error: "Only admins and editors can upload assets" },
        { status: 403 },
      );
    }

    const validation = validateUploadRequest({ filename, contentType, size });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { url, key } = await getUploadPresignedUrl({
      orgId,
      projectId,
      filename,
      contentType,
      size,
    });

    return NextResponse.json({
      url,
      key,
      maxSize: MAX_UPLOAD_SIZE,
    });
  } catch {
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
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const key = request.nextUrl.searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Missing required query param: key" },
        { status: 400 },
      );
    }

    const parsedKey = parseAssetKey(key);
    if (!parsedKey) {
      return NextResponse.json({ error: "Invalid asset key" }, { status: 400 });
    }

    const access = await getProjectAccess(session.user.id, parsedKey.projectId);
    if (!access || access.orgId !== parsedKey.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = await getDownloadPresignedUrl(key);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 },
    );
  }
}
