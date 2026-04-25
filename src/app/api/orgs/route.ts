import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships, organizations } from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";
import { slugify, validateCreateOrgRequest } from "@/lib/orgs";
import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** GET /api/orgs — list orgs the current user belongs to */
export async function GET() {
  const requestId = createRequestId();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    logger.warn("orgs_list_unauthorized", {
      requestId,
      route: "/api/orgs",
      method: "GET",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await db
    .select({
      orgId: orgMemberships.orgId,
      role: orgMemberships.role,
      org: {
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        plan: organizations.plan,
        createdAt: organizations.createdAt,
      },
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(eq(orgMemberships.userId, session.user.id));

  logger.info("orgs_list_completed", {
    requestId,
    route: "/api/orgs",
    method: "GET",
    orgCount: memberships.length,
  });

  return NextResponse.json({
    orgs: memberships.map((m) => ({
      ...m.org,
      role: m.role,
    })),
    requestId,
  });
}

/** POST /api/orgs — create a new org, add current user as admin */
export async function POST(request: Request) {
  const requestId = createRequestId();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    logger.warn("orgs_create_unauthorized", {
      requestId,
      route: "/api/orgs",
      method: "POST",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const validation = validateCreateOrgRequest(body);

  if (!validation.valid) {
    logger.warn("orgs_create_invalid_request", {
      requestId,
      route: "/api/orgs",
      method: "POST",
      error: validation.error,
    });
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const slug = slugify(validation.name);

  if (!slug) {
    logger.warn("orgs_create_invalid_slug", {
      requestId,
      route: "/api/orgs",
      method: "POST",
      orgName: validation.name,
    });
    return NextResponse.json(
      { error: "Could not generate a valid slug from org name" },
      { status: 400 },
    );
  }

  return db.transaction(async (tx) => {
    // Serialize org creation per user so a double-submit cannot create
    // multiple orgs before the membership check observes the first insert.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${session.user.id}))`,
    );

    const existingMembership = await tx
      .select({ orgId: orgMemberships.orgId })
      .from(orgMemberships)
      .where(eq(orgMemberships.userId, session.user.id))
      .limit(1);

    if (existingMembership.length > 0) {
      logger.warn("orgs_create_already_member", {
        requestId,
        route: "/api/orgs",
        method: "POST",
        userId: session.user.id,
      });
      return NextResponse.json(
        { error: "You already belong to an organization" },
        { status: 409 },
      );
    }

    const existingSlug = await tx
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);

    const finalSlug =
      existingSlug.length > 0 ? `${slug}-${Date.now().toString(36)}` : slug;

    const [org] = await tx
      .insert(organizations)
      .values({
        name: validation.name,
        slug: finalSlug,
      })
      .returning();

    await tx.insert(orgMemberships).values({
      orgId: org.id,
      userId: session.user.id,
      role: "admin",
    });

    logger.info("orgs_create_completed", {
      requestId,
      route: "/api/orgs",
      method: "POST",
      orgId: org.id,
      orgSlug: org.slug,
      userId: session.user.id,
    });

    return NextResponse.json({ org, requestId }, { status: 201 });
  });
}
