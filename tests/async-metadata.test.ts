import { describe, expect, it } from "vitest";
import { resolveExecutionMetadata } from "@/lib/async-metadata";

describe("resolveExecutionMetadata", () => {
  it("defaults to manual follow-up when simulation is not enabled", () => {
    expect(resolveExecutionMetadata()).toEqual({
      executionMode: "manual",
      executionHandoff: "manual_followup_required",
    });
  });

  it("returns simulated metadata when simulation is enabled", () => {
    expect(resolveExecutionMetadata({ simulated: true })).toEqual({
      executionMode: "simulation",
      executionHandoff: "simulated",
    });
  });

  it("allows explicit handoff override", () => {
    expect(
      resolveExecutionMetadata({
        simulated: false,
        handoff: "simulated",
      }),
    ).toEqual({
      executionMode: "manual",
      executionHandoff: "simulated",
    });
  });
});
