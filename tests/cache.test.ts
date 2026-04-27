import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCached, invalidateCache, setCache } from "@/lib/cache/redis";

describe("cache fallback", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves JSON-like values without Redis", async () => {
    await setCache("spec:url:https://example.com/openapi.json", {
      openapi: "3.1.0",
    });

    await expect(
      getCached<{ openapi: string }>(
        "spec:url:https://example.com/openapi.json",
      ),
    ).resolves.toEqual({ openapi: "3.1.0" });
  });

  it("expires entries after their ttl", async () => {
    vi.useFakeTimers();

    await setCache("short-lived", { ok: true }, 1);
    await expect(getCached("short-lived")).resolves.toEqual({ ok: true });

    vi.advanceTimersByTime(1001);

    await expect(getCached("short-lived")).resolves.toBeNull();
  });

  it("invalidates entries explicitly", async () => {
    await setCache("manual", ["cached"]);
    await invalidateCache("manual");

    await expect(getCached("manual")).resolves.toBeNull();
  });
});
