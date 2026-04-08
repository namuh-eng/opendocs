import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  deployments,
  orgMemberships,
  organizations,
  projects,
} from "@/lib/db/schema";
import {
  generatePreviewUrl,
  validateCreatePreviewRequest,
} from "@/lib/deployments";
import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** Resolve user's first org + first project. Returns null if not found. */
async function resolveUserProject(userId: string) {
  const membership = await db
    .select({
      orgId: orgMemberships.orgId,
      role: orgMemberships.role,
      orgSlug: organizations.slug,
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(eq(orgMemberships.userId, userId))
    .limit(1);

  if (membership.length === 0) return null;

  const orgId = membership[0].orgId;

  const orgProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      subdomain: projects.subdomain,
    })
    .from(projects)
    .where(eq(projects.orgId, orgId))
    .orderBy(projects.createdAt)
    .limit(1);

  if (orgProjects.length === 0) return null;

  return {
    orgId,
    role: membership[0].role,
    project: orgProjects[0],
  };
}

/** GET /api/deployments/previews — list preview deployments for the user's active project */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveUserProject(session.user.id);
  if (!ctx) {
    return NextResponse.json({ previews: [] });
  }

  const rows = await db
    .select({
      id: deployments.id,
      projectId: deployments.projectId,
      type: deployments.type,
      status: deployments.status,
      branch: deployments.branch,
      previewUrl: deployments.previewUrl,
      commitSha: deployments.commitSha,
      commitMessage: deployments.commitMessage,
      startedAt: deployments.startedAt,
      endedAt: deployments.endedAt,
      createdAt: deployments.createdAt,
    })
    .from(deployments)
    .where(
      and(
        eq(deployments.projectId, ctx.project.id),
        eq(deployments.type, "preview"),
      ),
    )
    .orderBy(desc(deployments.createdAt))
    .limit(50);

  return NextResponse.json({ previews: rows });
}

/** POST /api/deployments/previews — create a preview deployment */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveUserProject(session.user.id);
  if (!ctx) {
    return NextResponse.json({ error: "No project found" }, { status: 403 });
  }

  if (ctx.role !== "admin" && ctx.role !== "editor") {
    return NextResponse.json(
      { error: "Only admins and editors can create preview deployments" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateCreatePreviewRequest(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const previewUrl = generatePreviewUrl(
    validation.branch,
    ctx.project.subdomain,
  );

  const commitMessage =
    validation.commitMessage ?? `Preview: ${validation.branch}`;
  const commitSha = validation.commitSha ?? null;

  const [deployment] = await db
    .insert(deployments)
    .values({
      projectId: ctx.project.id,
      type: "preview",
      status: "queued",
      branch: validation.branch,
      previewUrl,
      commitSha,
      commitMessage,
    })
    .returning();

  // Simulate async build
  await db
    .update(deployments)
    .set({ status: "in_progress", startedAt: new Date() })
    .where(eq(deployments.id, deployment.id));

  // Simulate build completion after ~3 seconds (fire-and-forget)
  simulatePreviewBuildCompletion(deployment.id);

  return NextResponse.json(
    { preview: { ...deployment, status: "queued", previewUrl } },
    { status: 201 },
  );
}

function simulatePreviewBuildCompletion(deploymentId: string) {
  setTimeout(async () => {
    try {
      await db
        .update(deployments)
        .set({ status: "succeeded", endedAt: new Date() })
        .where(
          and(
            eq(deployments.id, deploymentId),
            eq(deployments.status, "in_progress"),
          ),
        );
    } catch {
      // Silently handle — this is a simulation
    }
  }, 3000);
}
