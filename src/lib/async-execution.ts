import { db } from "@/lib/db";
import { agentJobs, deployments, projects } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export const ASYNC_SIMULATION_TIMINGS_MS = {
  deploymentStart: 500,
  deploymentFinish: 3000,
  agentJobStart: 500,
  agentJobFinish: 5000,
} as const;

export type AsyncExecutionMode = "simulation" | "manual";

export interface AsyncEnqueueResult {
  mode: AsyncExecutionMode;
  handoff: "simulated" | "manual_followup_required";
}

export function isAsyncSimulationEnabled() {
  return process.env.ENABLE_ASYNC_SIMULATION === "true";
}

export function getAsyncExecutionMode(): AsyncExecutionMode {
  return isAsyncSimulationEnabled() ? "simulation" : "manual";
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
  scheduleSimulation(ASYNC_SIMULATION_TIMINGS_MS.deploymentStart, async () => {
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

  scheduleSimulation(ASYNC_SIMULATION_TIMINGS_MS.deploymentFinish, async () => {
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

export async function enqueueAgentJob(
  jobId: string,
): Promise<AsyncEnqueueResult> {
  const mode = getAsyncExecutionMode();

  if (mode !== "simulation") {
    return { mode, handoff: "manual_followup_required" };
  }

  scheduleSimulation(ASYNC_SIMULATION_TIMINGS_MS.agentJobStart, async () => {
    await db
      .update(agentJobs)
      .set({ status: "running", updatedAt: new Date() })
      .where(and(eq(agentJobs.id, jobId), eq(agentJobs.status, "pending")));
  });

  scheduleSimulation(ASYNC_SIMULATION_TIMINGS_MS.agentJobFinish, async () => {
    await db
      .update(agentJobs)
      .set({
        status: "succeeded",
        prUrl: `https://github.com/org/repo/pull/${Math.floor(Math.random() * 1000)}`,
        updatedAt: new Date(),
      })
      .where(and(eq(agentJobs.id, jobId), eq(agentJobs.status, "running")));
  });

  return { mode, handoff: "simulated" };
}

export async function enqueueDeployment(
  deploymentId: string,
  projectId: string,
): Promise<AsyncEnqueueResult> {
  const mode = getAsyncExecutionMode();

  if (mode !== "simulation") {
    return { mode, handoff: "manual_followup_required" };
  }

  await enqueueSimulatedDeployment(deploymentId, projectId);
  return { mode, handoff: "simulated" };
}

export async function enqueuePreviewDeployment(
  deploymentId: string,
  projectId: string,
): Promise<AsyncEnqueueResult> {
  const mode = getAsyncExecutionMode();

  if (mode !== "simulation") {
    return { mode, handoff: "manual_followup_required" };
  }

  await enqueueSimulatedDeployment(deploymentId, projectId);
  return { mode, handoff: "simulated" };
}
