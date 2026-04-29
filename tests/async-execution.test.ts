import { afterEach, describe, expect, it, vi } from "vitest";

const updateSetMock = vi.fn();
const updateWhereMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    update: vi.fn(() => ({
      set: updateSetMock,
    })),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  agentJobs: {
    id: "agent_jobs.id",
    status: "agent_jobs.status",
  },
  deployments: {},
  projects: {},
}));

vi.mock("@/lib/github-sync", () => ({
  syncProjectDocsFromGitHub: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  and: (...conditions: unknown[]) => ({ conditions }),
  eq: (left: unknown, right: unknown) => ({ left, right }),
}));

describe("async execution", () => {
  afterEach(() => {
    // biome-ignore lint/performance/noDelete: tests must remove the env var rather than assign the string "undefined"
    delete process.env.ENABLE_ASYNC_SIMULATION;
    updateSetMock.mockReset();
    updateWhereMock.mockReset();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("exports the expected simulation timing constants", async () => {
    const { ASYNC_SIMULATION_TIMINGS_MS } = await import(
      "@/lib/async-execution"
    );

    expect(ASYNC_SIMULATION_TIMINGS_MS).toEqual({
      deploymentStart: 500,
      deploymentFinish: 3000,
      agentJobStart: 500,
      agentJobFinish: 5000,
    });
  });

  it("uses manual mode by default", async () => {
    const {
      getAsyncExecutionMode,
      getDeploymentExecutionStrategy,
      isAsyncSimulationEnabled,
      enqueueDeployment,
    } = await import("@/lib/async-execution");

    expect(isAsyncSimulationEnabled()).toBe(false);
    expect(getAsyncExecutionMode()).toBe("manual");
    expect(getDeploymentExecutionStrategy()).toEqual({
      mode: "manual",
      handoff: "manual_followup_required",
    });
    await expect(enqueueDeployment("dep-1", "proj-1")).resolves.toEqual({
      mode: "manual",
      handoff: "manual_followup_required",
    });
  });

  it("uses simulation mode when ENABLE_ASYNC_SIMULATION=true", async () => {
    process.env.ENABLE_ASYNC_SIMULATION = "true";
    const setTimeoutSpy = vi
      .spyOn(globalThis, "setTimeout")
      .mockImplementation(() => 0 as unknown as ReturnType<typeof setTimeout>);

    const {
      getAsyncExecutionMode,
      getDeploymentExecutionStrategy,
      enqueueDeployment,
    } = await import("@/lib/async-execution");

    expect(getAsyncExecutionMode()).toBe("simulation");
    expect(getDeploymentExecutionStrategy()).toEqual({
      mode: "simulation",
      handoff: "simulated",
    });
    await expect(enqueueDeployment("dep-1", "proj-1")).resolves.toEqual({
      mode: "simulation",
      handoff: "simulated",
    });
    expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy.mock.calls.map((call) => call[1])).toEqual([
      500, 3000,
    ]);
  });

  it("schedules agent job simulation with the documented timing", async () => {
    process.env.ENABLE_ASYNC_SIMULATION = "true";
    const setTimeoutSpy = vi
      .spyOn(globalThis, "setTimeout")
      .mockImplementation(() => 0 as unknown as ReturnType<typeof setTimeout>);

    const { getAgentJobExecutionStrategy, enqueueAgentJob } = await import(
      "@/lib/async-execution"
    );

    expect(getAgentJobExecutionStrategy()).toEqual({
      mode: "simulation",
      handoff: "simulated",
    });
    await expect(enqueueAgentJob("job-1")).resolves.toEqual({
      mode: "simulation",
      handoff: "simulated",
    });
    expect(setTimeoutSpy.mock.calls.map((call) => call[1])).toEqual([
      500, 5000,
    ]);
  });

  it("does not invent a pull request URL when simulating agent completion", async () => {
    process.env.ENABLE_ASYNC_SIMULATION = "true";
    const scheduledTasks: Array<() => void> = [];
    vi.spyOn(globalThis, "setTimeout").mockImplementation((task) => {
      scheduledTasks.push(task as () => void);
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });
    updateSetMock.mockReturnValue({ where: updateWhereMock });

    const { enqueueAgentJob } = await import("@/lib/async-execution");

    await enqueueAgentJob("job-1");
    await scheduledTasks[1]?.();

    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "succeeded",
        prUrl: null,
        messages: [
          expect.objectContaining({
            role: "agent",
            content: expect.stringContaining(
              "without creating a GitHub pull request",
            ),
          }),
        ],
      }),
    );
  });

  it("uses manual follow-up strategy for agent jobs by default", async () => {
    const { getAgentJobExecutionStrategy, enqueueAgentJob } = await import(
      "@/lib/async-execution"
    );

    expect(getAgentJobExecutionStrategy()).toEqual({
      mode: "manual",
      handoff: "manual_followup_required",
    });
    await expect(enqueueAgentJob("job-1")).resolves.toEqual({
      mode: "manual",
      handoff: "manual_followup_required",
    });
  });
});
