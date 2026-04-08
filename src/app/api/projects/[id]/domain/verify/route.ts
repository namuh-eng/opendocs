import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orgMemberships, projects } from "@/lib/db/schema";
import { generateCnameTarget } from "@/lib/domains";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** POST /api/projects/[id]/domain/verify — check DNS CNAME for custom domain */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const membership = await db
    .select({ orgId: orgMemberships.orgId })
    .from(orgMemberships)
    .where(eq(orgMemberships.userId, session.user.id))
    .limit(1);

  if (membership.length === 0) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  const result = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.orgId, membership[0].orgId)))
    .limit(1);

  if (result.length === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const project = result[0];

  if (!project.customDomain) {
    return NextResponse.json(
      { error: "No custom domain configured" },
      { status: 400 },
    );
  }

  const expectedTarget = generateCnameTarget(project.subdomain ?? project.slug);

  // Attempt DNS resolution to check if CNAME is configured
  let verified = false;
  try {
    const { promises: dns } = await import("node:dns");
    const records = await dns.resolveCname(project.customDomain);
    verified = records.some(
      (record) => record.toLowerCase() === expectedTarget.toLowerCase(),
    );
  } catch {
    // DNS lookup failed — domain not yet configured
    verified = false;
  }

  if (verified) {
    const settings = (project.settings ?? {}) as Record<string, unknown>;
    settings.domainVerifiedAt = new Date().toISOString();

    await db
      .update(projects)
      .set({ settings, updatedAt: new Date() })
      .where(eq(projects.id, id));

    return NextResponse.json({
      status: "verified",
      domain: project.customDomain,
      cnameTarget: expectedTarget,
    });
  }

  return NextResponse.json({
    status: "pending",
    domain: project.customDomain,
    cnameTarget: expectedTarget,
    message: `CNAME record for ${project.customDomain} does not point to ${expectedTarget}`,
  });
}
