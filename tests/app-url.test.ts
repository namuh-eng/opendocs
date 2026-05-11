import { getPublicAppUrl, getRequestAppUrl } from "@/lib/app-url";
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

describe("getRequestAppUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses localhost request host instead of configured public URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3015");

    expect(getRequestAppUrl(new Headers({ host: "localhost:3016" }))).toBe(
      "http://localhost:3016",
    );
  });

  it("prefers forwarded proxy origin when it matches the configured app URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://opendocs.namuh.co");

    expect(
      getRequestAppUrl(
        new Headers({
          host: "internal:3000",
          "x-forwarded-host": "opendocs.namuh.co",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe("https://opendocs.namuh.co");
  });

  it("falls back to the configured app URL for spoofed forwarded hosts", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://opendocs.namuh.co");

    expect(
      getRequestAppUrl(
        new Headers({
          host: "opendocs.namuh.co",
          "x-forwarded-host": "evil.example",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe("https://opendocs.namuh.co");
  });

  it("does not trust localhost request hosts in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://opendocs.namuh.co");

    expect(getRequestAppUrl(new Headers({ host: "localhost:3016" }))).toBe(
      "https://opendocs.namuh.co",
    );
  });

  it("falls back to public app URL when request host is unavailable", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://opendocs.namuh.co/");

    expect(getRequestAppUrl(new Headers())).toBe("https://opendocs.namuh.co");
  });
});
