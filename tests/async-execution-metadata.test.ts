import { afterEach, describe, expect, it } from "vitest";

describe("async execution metadata helpers", () => {
  afterEach(() => {
    // biome-ignore lint/performance/noDelete: tests must remove the env var rather than assign the string "undefined"
    delete process.env.ENABLE_ASYNC_SIMULATION;
  });

  it("marks queued deployments as manual follow-up by default", async () => {
    const { getDeploymentExecutionMetadata } = await import(
      "@/lib/async-execution"
    );

    expect(getDeploymentExecutionMetadata("queued")).toEqual({
      simulated: false,
      handoff: "manual_followup_required",
    });
  });

  it("marks non-queued deployments as simulated lifecycle progress", async () => {
    const { getDeploymentExecutionMetadata } = await import(
      "@/lib/async-execution"
    );

    expect(getDeploymentExecutionMetadata("in_progress")).toEqual({
      simulated: false,
      handoff: "simulated",
    });
  });

  it("marks pending agent jobs as manual follow-up by default", async () => {
    const { getAgentJobExecutionMetadata } = await import(
      "@/lib/async-execution"
    );

    expect(getAgentJobExecutionMetadata("pending")).toEqual({
      simulated: false,
      handoff: "manual_followup_required",
    });
  });

  it("marks progressed agent jobs as simulated lifecycle progress", async () => {
    const { getAgentJobExecutionMetadata } = await import(
      "@/lib/async-execution"
    );

    expect(getAgentJobExecutionMetadata("running")).toEqual({
      simulated: false,
      handoff: "simulated",
    });
  });

  it("marks all states as simulated when async simulation is enabled", async () => {
    process.env.ENABLE_ASYNC_SIMULATION = "true";
    const { getDeploymentExecutionMetadata, getAgentJobExecutionMetadata } =
      await import("@/lib/async-execution");

    expect(getDeploymentExecutionMetadata("queued")).toEqual({
      simulated: true,
      handoff: "simulated",
    });
    expect(getAgentJobExecutionMetadata("pending")).toEqual({
      simulated: true,
      handoff: "simulated",
    });
  });
});
