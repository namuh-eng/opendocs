import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships, organizations } from "@/lib/db/schema";
import { slugify, validateCreateOrgRequest } from "@/lib/orgs";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** GET /api/orgs — list orgs the current user belongs to */
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
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

  return NextResponse.json({
    orgs: memberships.map((m) => ({
      ...m.org,
      role: m.role,
    })),
  });
}

/** POST /api/orgs — create a new org, add current user as admin */
export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const validation = validateCreateOrgRequest(body);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const slug = slugify(validation.name);

  if (!slug) {
    return NextResponse.json(
      { error: "Could not generate a valid slug from org name" },
      { status: 400 },
    );
  }

  // Check for slug uniqueness
  const existing = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  const finalSlug =
    existing.length > 0 ? `${slug}-${Date.now().toString(36)}` : slug;

  // Create org
  const [org] = await db
    .insert(organizations)
    .values({
      name: validation.name,
      slug: finalSlug,
    })
    .returning();

  // Add creator as admin
  await db.insert(orgMemberships).values({
    orgId: org.id,
    userId: session.user.id,
    role: "admin",
  });

  return NextResponse.json({ org }, { status: 201 });
}
