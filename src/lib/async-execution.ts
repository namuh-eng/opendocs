import { db } from "@/lib/db";
import { agentJobs, deployments, projects } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export function isAsyncSimulationEnabled() {
  return process.env.ENABLE_ASYNC_SIMULATION === "true";
}

export async function enqueueAgentJob(jobId: string) {
  if (!isAsyncSimulationEnabled()) {
    return;
  }

  setTimeout(async () => {
    try {
      await db
        .update(agentJobs)
        .set({ status: "running", updatedAt: new Date() })
        .where(and(eq(agentJobs.id, jobId), eq(agentJobs.status, "pending")));
    } catch {
      // Simulation mode only
    }
  }, 500);

  setTimeout(async () => {
    try {
      await db
        .update(agentJobs)
        .set({
          status: "succeeded",
          prUrl: `https://github.com/org/repo/pull/${Math.floor(Math.random() * 1000)}`,
          updatedAt: new Date(),
        })
        .where(and(eq(agentJobs.id, jobId), eq(agentJobs.status, "running")));
    } catch {
      // Simulation mode only
    }
  }, 5000);
}

export async function enqueueDeployment(deploymentId: string, projectId: string) {
  if (!isAsyncSimulationEnabled()) {
    return;
  }

  setTimeout(async () => {
    try {
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
    } catch {
      // Simulation mode only
    }
  }, 500);

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
      await db
        .update(projects)
        .set({ status: "active" })
        .where(eq(projects.id, projectId));
    } catch {
      // Simulation mode only
    }
  }, 3000);
}
