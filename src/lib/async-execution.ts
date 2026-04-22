import { db } from "@/lib/db";
import { agentJobs, deployments, projects } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export function isAsyncSimulationEnabled() {
  return process.env.ENABLE_ASYNC_SIMULATION === "true";
}

function scheduleSimulation(delayMs: number, task: () => Promise<void>) {
  setTimeout(async () => {
    try {
      await task();
    } catch {
      // Simulation mode only
    }
  }, delayMs);
}

async function enqueueSimulatedDeployment(
  deploymentId: string,
  projectId: string,
) {
  scheduleSimulation(500, async () => {
    await db
      .update(deployments)
      .set({ status: "in_progress", startedAt: new Date() })
      .where(
        and(eq(deployments.id, deploymentId), eq(deployments.status, "queued")),
      );
    await db
      .update(projects)
      .set({ status: "deploying" })
      .where(eq(projects.id, projectId));
  });

  scheduleSimulation(3000, async () => {
    await db
      .update(deployments)
      .set({ status: "succeeded", endedAt: new Date() })
      .where(
        and(
          eq(deployments.id, deploymentId),
          eq(deployments.status, "in_progress"),
        ),
      );
    await db
      .update(projects)
      .set({ status: "active" })
      .where(eq(projects.id, projectId));
  });
}

export async function enqueueAgentJob(jobId: string) {
  if (!isAsyncSimulationEnabled()) {
    return;
  }

  scheduleSimulation(500, async () => {
    await db
      .update(agentJobs)
      .set({ status: "running", updatedAt: new Date() })
      .where(and(eq(agentJobs.id, jobId), eq(agentJobs.status, "pending")));
  });

  scheduleSimulation(5000, async () => {
    await db
      .update(agentJobs)
      .set({
        status: "succeeded",
        prUrl: `https://github.com/org/repo/pull/${Math.floor(Math.random() * 1000)}`,
        updatedAt: new Date(),
      })
      .where(and(eq(agentJobs.id, jobId), eq(agentJobs.status, "running")));
  });
}

export async function enqueueDeployment(deploymentId: string, projectId: string) {
  if (!isAsyncSimulationEnabled()) {
    return;
  }

  await enqueueSimulatedDeployment(deploymentId, projectId);
}

export async function enqueuePreviewDeployment(
  deploymentId: string,
  projectId: string,
) {
  if (!isAsyncSimulationEnabled()) {
    return;
  }

  await enqueueSimulatedDeployment(deploymentId, projectId);
}
