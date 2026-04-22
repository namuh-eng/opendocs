import { db } from "@/lib/db";
import { deployments, githubConnections, projects } from "@/lib/db/schema";
import {
  buildDeployMessage,
  extractBranchFromRef,
  isValidPushPayload,
  matchesPushTarget,
  verifyWebhookSignature,
} from "@/lib/github-webhook";
import { createRequestId, logger } from "@/lib/logger";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/** POST /api/webhooks/github — receive GitHub push webhooks */
export async function POST(request: Request) {
  const requestId = createRequestId();
  const eventType = request.headers.get("x-github-event");
  const signature = request.headers.get("x-hub-signature-256");
  const rawBody = await request.text();

  logger.info("github_webhook_received", {
    requestId,
    route: "/api/webhooks/github",
    method: "POST",
    eventType: eventType ?? "unknown",
  });

  const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "";

  // Verify signature if secret is configured
  if (secret) {
    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      logger.warn("github_webhook_invalid_signature", {
        requestId,
        route: "/api/webhooks/github",
        method: "POST",
        eventType: eventType ?? "unknown",
      });
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }
  }

  // Only process push events
  if (eventType !== "push") {
    logger.info("github_webhook_ignored_event", {
      requestId,
      route: "/api/webhooks/github",
      method: "POST",
      eventType: eventType ?? "unknown",
    });
    return NextResponse.json({ message: `Ignored event: ${eventType}` });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    logger.warn("github_webhook_invalid_json", {
      requestId,
      route: "/api/webhooks/github",
      method: "POST",
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isValidPushPayload(payload)) {
    logger.warn("github_webhook_invalid_payload", {
      requestId,
      route: "/api/webhooks/github",
      method: "POST",
    });
    return NextResponse.json(
      { error: "Invalid push payload" },
      { status: 400 },
    );
  }

  const branch = extractBranchFromRef(payload.ref);
  if (!branch) {
    logger.info("github_webhook_non_branch_push", {
      requestId,
      route: "/api/webhooks/github",
      method: "POST",
      eventType,
    });
    return NextResponse.json({ message: "Not a branch push, skipping" });
  }

  const repoFullName = payload.repository.full_name;

  // Find all GitHub connections that match this repo
  const connections = await db
    .select()
    .from(githubConnections)
    .where(eq(githubConnections.autoUpdateEnabled, true));

  let deploymentsTriggered = 0;

  for (const conn of connections) {
    const rawRepos = (conn.repos ?? []) as Array<{
      fullName: string;
      branch: string;
      permissions: string;
    }>;
    const repos = rawRepos.map((r) => ({
      ...r,
      permissions: r.permissions as "read" | "write" | "admin",
    }));

    const match = matchesPushTarget(repos, repoFullName, branch);
    if (!match) continue;

    // Find projects belonging to this org that use this repo
    const orgProjects = await db
      .select({
        id: projects.id,
        repoUrl: projects.repoUrl,
        repoBranch: projects.repoBranch,
      })
      .from(projects)
      .where(eq(projects.orgId, conn.orgId));

    for (const project of orgProjects) {
      // Match by repo URL or deploy any project in the org if no repo URL set
      const projectRepo = project.repoUrl
        ? project.repoUrl
            .replace(/^https?:\/\/github\.com\//, "")
            .replace(/\.git$/, "")
        : null;

      const branchMatch = !project.repoBranch || project.repoBranch === branch;

      if (
        (projectRepo &&
          projectRepo.toLowerCase() === repoFullName.toLowerCase() &&
          branchMatch) ||
        (!projectRepo && branchMatch)
      ) {
        const commitMessage = buildDeployMessage(payload, branch);
        const commitSha = payload.head_commit?.id ?? payload.after;

        await db.insert(deployments).values({
          projectId: project.id,
          status: "queued",
          commitSha: commitSha.slice(0, 40),
          commitMessage,
        });

        // Update project status
        await db
          .update(projects)
          .set({ status: "deploying" })
          .where(eq(projects.id, project.id));

        deploymentsTriggered++;
      }
    }
  }

  logger.info("github_webhook_processed", {
    requestId,
    route: "/api/webhooks/github",
    method: "POST",
    repoFullName,
    branch,
    deploymentsTriggered,
  });

  return NextResponse.json({
    message: `Processed push event for ${repoFullName}@${branch}`,
    deploymentsTriggered,
    requestId,
  });
}
