import { getPublicAppUrl } from "@/lib/app-url";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("getPublicAppUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normalizes a configured public app URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://opendocs.namuh.co///");

    expect(getPublicAppUrl()).toBe("https://opendocs.namuh.co");
  });

  it("requires NEXT_PUBLIC_APP_URL in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    expect(() => getPublicAppUrl()).toThrow(
      "NEXT_PUBLIC_APP_URL is required in production",
    );
  });

  it("keeps localhost fallback outside production", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    expect(getPublicAppUrl()).toBe("http://localhost:3015");
  });
});
