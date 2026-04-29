import { db } from "@/lib/db";
import { analyticsEvents, projects } from "@/lib/db/schema";
import { validateFeedbackPayload } from "@/lib/feedback";
import {
  getDocsAccessCookieName,
  hasValidDocsAccess,
} from "@/lib/project-docs-access";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

/**
 * POST /api/docs/[subdomain]/feedback
 *
 * Public endpoint — records user feedback as an analytics_event.
 * Body: { page: string, rating: "helpful" | "not_helpful", comment?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> },
) {
  const { subdomain } = await params;

  // Find project by subdomain
  const [project] = await db
    .select({ id: projects.id, settings: projects.settings })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (!project) {
    return NextResponse.json(
      { error: "Documentation site not found" },
      { status: 404 },
    );
  }

  if (
    !hasValidDocsAccess(
      project.settings,
      subdomain,
      request.cookies.get(getDocsAccessCookieName(subdomain))?.value,
    )
  ) {
    return NextResponse.json(
      { error: "Docs password required" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = validateFeedbackPayload(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { page, rating, comment } = result.data;

  await db.insert(analyticsEvents).values({
    projectId: project.id,
    type: "feedback",
    data: {
      page,
      rating,
      comment: comment ?? "",
      status: "pending",
      isAbusive: false,
      feedbackType: "contextual",
    },
  });

  return NextResponse.json({ success: true });
}
