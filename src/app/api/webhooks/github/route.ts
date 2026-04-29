import { enqueueDeployment } from "@/lib/async-execution";
import { getClientRateLimitKey } from "@/lib/client-rate-limit-key";
import { db } from "@/lib/db";
import {
  auditLogs,
  deployments,
  githubConnections,
  projects,
} from "@/lib/db/schema";
import { resolveGitHubSource } from "@/lib/github-source";
import {
  buildDeployMessage,
  extractBranchFromRef,
  isValidPushPayload,
  matchesPushTarget,
  verifyWebhookSignature,
} from "@/lib/github-webhook";
import { createRequestId, logger } from "@/lib/logger";
import { applyRateLimit, buildRateLimitHeaders } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/** POST /api/webhooks/github — receive GitHub push webhooks */
export async function POST(request: Request) {
  const requestId = createRequestId();
  const eventType = request.headers.get("x-github-event");
  const signature = request.headers.get("x-hub-signature-256");
  const rateLimitKey = getClientRateLimitKey(request.headers, "github-webhook");
  const installationTargetId = request.headers.get(
    "x-github-hook-installation-target-id",
  );
  const rateLimit = applyRateLimit({
    key: rateLimitKey,
    limit: 120,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    logger.warn("github_webhook_rate_limited", {
      requestId,
      route: "/api/webhooks/github",
      method: "POST",
      rateLimitKey,
      eventType: eventType ?? "unknown",
    });
    return NextResponse.json(
      { error: "Too many webhook requests" },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const rawBody = await request.text();

  logger.info("github_webhook_received", {
    requestId,
    route: "/api/webhooks/github",
    method: "POST",
    eventType: eventType ?? "unknown",
  });

  const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "";
  const requiresSignature = process.env.NODE_ENV === "production" || !!secret;

  if (requiresSignature && (!secret || !signature)) {
    logger.warn("github_webhook_missing_signature_config", {
      requestId,
      route: "/api/webhooks/github",
      method: "POST",
      eventType: eventType ?? "unknown",
      hasSecret: !!secret,
      hasSignature: !!signature,
    });
    return NextResponse.json(
      { error: "GitHub webhook signature is required" },
      { status: 401 },
    );
  }

  if (
    requiresSignature &&
    !verifyWebhookSignature(rawBody, signature, secret)
  ) {
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

    const orgProjects = await db
      .select({
        id: projects.id,
        repoUrl: projects.repoUrl,
        repoBranch: projects.repoBranch,
        repoPath: projects.repoPath,
        settings: projects.settings,
      })
      .from(projects)
      .where(eq(projects.orgId, conn.orgId));

    for (const project of orgProjects) {
      const githubSource = resolveGitHubSource({
        repoUrl: project.repoUrl,
        repoBranch: project.repoBranch,
        repoPath: project.repoPath,
        settings: project.settings,
      });

      const projectRepo = githubSource?.repoFullName ?? null;
      const branchMatch =
        !githubSource?.branch || githubSource.branch === branch;
      const installationMatch =
        !githubSource?.installationId ||
        !installationTargetId ||
        githubSource.installationId === installationTargetId ||
        githubSource.installationId === `inst_${installationTargetId}`;

      if (
        (projectRepo &&
          projectRepo.toLowerCase() === repoFullName.toLowerCase() &&
          branchMatch &&
          installationMatch) ||
        (!projectRepo && branchMatch)
      ) {
        const commitMessage = buildDeployMessage(payload, branch);
        const commitSha = payload.head_commit?.id ?? payload.after;

        const [deployment] = await db
          .insert(deployments)
          .values({
            projectId: project.id,
            status: "queued",
            commitSha: commitSha.slice(0, 40),
            commitMessage,
          })
          .returning();

        await db
          .update(projects)
          .set({ status: "deploying" })
          .where(eq(projects.id, project.id));

        const enqueueResult = await enqueueDeployment(
          deployment.id,
          project.id,
        );

        if (enqueueResult.handoff === "manual_followup_required") {
          await db.insert(auditLogs).values({
            orgId: conn.orgId,
            action: "deployment_manual_handoff_required",
            details: {
              requestId,
              deploymentId: deployment.id,
              projectId: project.id,
              executionMode: enqueueResult.mode,
            },
          });
        }

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
    installationTargetId,
    deploymentsTriggered,
  });

  return NextResponse.json(
    {
      message: `Processed push event for ${repoFullName}@${branch}`,
      deploymentsTriggered,
      requestId,
    },
    { headers: buildRateLimitHeaders(rateLimit) },
  );
}
