import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships, projects } from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";
import { fetchSpecFromUrl } from "@/lib/openapi";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

async function getUserOrgId(userId: string): Promise<string | null> {
  const membership = await db
    .select({ orgId: orgMemberships.orgId })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, userId))
    .limit(1);
  return membership.length > 0 ? membership[0].orgId : null;
}

/**
 * GET /api/projects/[id]/openapi-spec — get the stored OpenAPI spec
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("project_openapi_spec_get_unauthorized", {
      requestId,
      route: "/api/projects/[id]/openapi-spec",
      method: "GET",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orgId = await getUserOrgId(session.user.id);
  if (!orgId) {
    logger.warn("project_openapi_spec_get_no_org", {
      requestId,
      route: "/api/projects/[id]/openapi-spec",
      method: "GET",
      userId: session.user.id,
      projectId: id,
    });
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  const result = await db
    .select({ settings: projects.settings })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.orgId, orgId)))
    .limit(1);

  if (result.length === 0) {
    logger.warn("project_openapi_spec_get_missing", {
      requestId,
      route: "/api/projects/[id]/openapi-spec",
      method: "GET",
      userId: session.user.id,
      orgId,
      projectId: id,
    });
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const settings = (result[0].settings || {}) as Record<string, unknown>;
  const spec = settings.openApiSpec || null;
  const specUrl = settings.openApiSpecUrl || "";

  logger.info("project_openapi_spec_get_completed", {
    requestId,
    route: "/api/projects/[id]/openapi-spec",
    method: "GET",
    userId: session.user.id,
    orgId,
    projectId: id,
    hasSpec: Boolean(spec),
    hasSpecUrl: Boolean(specUrl),
  });

  return NextResponse.json({ spec, specUrl, requestId });
}

/**
 * POST /api/projects/[id]/openapi-spec — fetch spec from URL and store it
 *
 * Body: { url: string } or { spec: object } (inline)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    logger.warn("project_openapi_spec_update_unauthorized", {
      requestId,
      route: "/api/projects/[id]/openapi-spec",
      method: "POST",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orgId = await getUserOrgId(session.user.id);
  if (!orgId) {
    logger.warn("project_openapi_spec_update_no_org", {
      requestId,
      route: "/api/projects/[id]/openapi-spec",
      method: "POST",
      userId: session.user.id,
      projectId: id,
    });
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  let spec: Record<string, unknown> | null = null;

  if (body.url && typeof body.url === "string") {
    spec = await fetchSpecFromUrl(body.url);
    if (!spec) {
      logger.warn("project_openapi_spec_update_fetch_failed", {
        requestId,
        route: "/api/projects/[id]/openapi-spec",
        method: "POST",
        userId: session.user.id,
        orgId,
        projectId: id,
        url: body.url,
      });
      return NextResponse.json(
        { error: "Failed to fetch spec from URL" },
        { status: 400 },
      );
    }
  } else if (body.spec && typeof body.spec === "object") {
    spec = body.spec as Record<string, unknown>;
  } else {
    logger.warn("project_openapi_spec_update_missing_payload", {
      requestId,
      route: "/api/projects/[id]/openapi-spec",
      method: "POST",
      userId: session.user.id,
      orgId,
      projectId: id,
    });
    return NextResponse.json(
      { error: "Provide either url or spec in request body" },
      { status: 400 },
    );
  }

  // Validate it's a valid OpenAPI or AsyncAPI spec
  const isOpenApi =
    typeof spec.openapi === "string" || typeof spec.swagger === "string";
  const isAsyncApi = typeof spec.asyncapi === "string";

  if (!isOpenApi && !isAsyncApi) {
    logger.warn("project_openapi_spec_update_invalid_spec", {
      requestId,
      route: "/api/projects/[id]/openapi-spec",
      method: "POST",
      userId: session.user.id,
      orgId,
      projectId: id,
    });
    return NextResponse.json(
      { error: "Invalid spec: must be OpenAPI 3.x, Swagger 2.x, or AsyncAPI" },
      { status: 400 },
    );
  }

  // Store spec in project settings
  const existing = await db
    .select({ settings: projects.settings })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.orgId, orgId)))
    .limit(1);

  if (existing.length === 0) {
    logger.warn("project_openapi_spec_update_missing", {
      requestId,
      route: "/api/projects/[id]/openapi-spec",
      method: "POST",
      userId: session.user.id,
      orgId,
      projectId: id,
    });
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const currentSettings = (existing[0].settings || {}) as Record<
    string,
    unknown
  >;

  await db
    .update(projects)
    .set({
      settings: {
        ...currentSettings,
        openApiSpec: spec,
        openApiSpecUrl: body.url || currentSettings.openApiSpecUrl || "",
      },
    })
    .where(eq(projects.id, id));

  const specType = isAsyncApi ? "asyncapi" : "openapi";

  logger.info("project_openapi_spec_update_completed", {
    requestId,
    route: "/api/projects/[id]/openapi-spec",
    method: "POST",
    userId: session.user.id,
    orgId,
    projectId: id,
    specType,
  });

  return NextResponse.json({
    ok: true,
    specType,
    requestId,
  });
}
