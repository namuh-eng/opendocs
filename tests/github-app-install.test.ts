import { resolveGitHubAppInstallUrl } from "@/lib/github-app-install";
import { describe, expect, it } from "vitest";

describe("resolveGitHubAppInstallUrl", () => {
  it("uses an explicit GitHub app install URL", () => {
    expect(
      resolveGitHubAppInstallUrl({
        GITHUB_APP_INSTALL_URL:
          "https://github.com/apps/opendocs/installations/new?state=settings",
        GITHUB_APP_SLUG: "ignored",
      }),
    ).toBe("https://github.com/apps/opendocs/installations/new?state=settings");
  });

  it("builds the GitHub installation URL from the app slug", () => {
    expect(resolveGitHubAppInstallUrl({ GITHUB_APP_SLUG: "open-docs" })).toBe(
      "https://github.com/apps/open-docs/installations/new",
    );
  });

  it("falls back to the public slug when provided", () => {
    expect(
      resolveGitHubAppInstallUrl({ NEXT_PUBLIC_GITHUB_APP_SLUG: "open-docs" }),
    ).toBe("https://github.com/apps/open-docs/installations/new");
  });

  it("returns null for missing or invalid configuration", () => {
    expect(resolveGitHubAppInstallUrl({})).toBeNull();
    expect(
      resolveGitHubAppInstallUrl({ GITHUB_APP_SLUG: "bad/slug" }),
    ).toBeNull();
    expect(
      resolveGitHubAppInstallUrl({
        GITHUB_APP_INSTALL_URL: "https://example.com/apps/opendocs",
      }),
    ).toBeNull();
  });
});
