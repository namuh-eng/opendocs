import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync("src/app/globals.css", "utf8");

describe("dashboard shell theme CSS", () => {
  it("maps editor dark canvas classes to dashboard design tokens", () => {
    expect(globalsCss).toContain(".od-app-shell .bg-\\[\\#0c0c0c\\]");
    expect(globalsCss).toContain(".od-app-shell .bg-\\[\\#0a0a0a\\]");
    expect(globalsCss).toContain(".od-app-shell .bg-\\[\\#101010\\]");
    expect(globalsCss).toContain(".od-app-shell .text-emerald-200");
  });

  it("maps zinc-based product panels to dashboard design tokens", () => {
    expect(globalsCss).toContain(".od-app-shell .bg-zinc-800\\/60");
    expect(globalsCss).toContain(".od-app-shell .border-zinc-700");
    expect(globalsCss).toContain(".od-app-shell .text-zinc-400");
    expect(globalsCss).toContain(
      ".od-app-shell .hover\\:bg-zinc-700\\/50:hover",
    );
  });
});
