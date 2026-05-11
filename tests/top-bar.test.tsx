import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signOut: vi.fn(),
  },
}));

describe("TopBar", () => {
  it("links to GitHub without showing a hard-coded star count", async () => {
    const { TopBar } = await import("@/components/layout/top-bar");
    const html = renderToStaticMarkup(
      <TopBar
        onThemeChange={vi.fn()}
        resolvedTheme="light"
        theme="light"
        userEmail="user@example.com"
        userName="Test User"
      />,
    );

    expect(html).toContain('href="https://github.com/namuh-eng/opendocs"');
    expect(html).toContain('aria-label="Star OpenDocs on GitHub"');
    expect(html).toContain(">Star<");
    expect(html).not.toContain(">128<");
  });
});
