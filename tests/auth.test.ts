import { describe, expect, it, vi } from "vitest";

// ── Middleware logic tests ────────────────────────────────────────────────────
// We test the redirect logic in isolation since the actual middleware
// depends on Next.js runtime. These verify the core auth-gating rules.

describe("auth middleware logic", () => {
  const PUBLIC_PATHS = ["/login", "/signup", "/api/auth"];
  const PROTECTED_PREFIXES = ["/dashboard", "/settings", "/products"];

  function isPublicPath(pathname: string): boolean {
    return PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
  }

  function isProtectedPath(pathname: string): boolean {
    return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  }

  function getRedirect(pathname: string, hasSession: boolean): string | null {
    // Authenticated user on auth page → dashboard
    if (hasSession && (pathname === "/login" || pathname === "/signup")) {
      return "/dashboard";
    }
    // Unauthenticated user on protected route or onboarding → login
    if (
      !hasSession &&
      (isProtectedPath(pathname) || pathname === "/onboarding")
    ) {
      return "/login";
    }
    return null;
  }

  it("identifies public paths correctly", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/signup")).toBe(true);
    expect(isPublicPath("/api/auth/callback/google")).toBe(true);
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/settings/general")).toBe(false);
  });

  it("identifies protected paths correctly", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/dashboard/org/project")).toBe(true);
    expect(isProtectedPath("/settings/general")).toBe(true);
    expect(isProtectedPath("/products/agent")).toBe(true);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/api/auth/session")).toBe(false);
  });

  it("redirects unauthenticated user from dashboard to login", () => {
    expect(getRedirect("/dashboard", false)).toBe("/login");
    expect(getRedirect("/dashboard/org/proj", false)).toBe("/login");
    expect(getRedirect("/settings/general", false)).toBe("/login");
    expect(getRedirect("/products/agent", false)).toBe("/login");
  });

  it("allows unauthenticated user to access public paths", () => {
    expect(getRedirect("/login", false)).toBeNull();
    expect(getRedirect("/signup", false)).toBeNull();
    expect(getRedirect("/api/auth/session", false)).toBeNull();
  });

  it("redirects authenticated user away from login/signup to dashboard", () => {
    expect(getRedirect("/login", true)).toBe("/dashboard");
    expect(getRedirect("/signup", true)).toBe("/dashboard");
  });

  it("allows authenticated user to access protected paths", () => {
    expect(getRedirect("/dashboard", true)).toBeNull();
    expect(getRedirect("/settings/general", true)).toBeNull();
    expect(getRedirect("/products/agent", true)).toBeNull();
  });

  it("redirects unauthenticated user from onboarding to login", () => {
    expect(getRedirect("/onboarding", false)).toBe("/login");
  });

  it("allows authenticated user to access onboarding", () => {
    expect(getRedirect("/onboarding", true)).toBeNull();
  });
});

// ── Auth configuration tests ──────────────────────────────────────────────────

describe("auth configuration", () => {
  it("exports auth server instance from src/lib/auth", async () => {
    // Verify the module structure — the actual auth object needs env vars
    // so we just check the file exists and exports the right shape
    const mod = await import("@/lib/auth");
    expect(mod.auth).toBeDefined();
    expect(typeof mod.auth.handler).toBe("function");
  });

  it("exports auth client from src/lib/auth-client", async () => {
    const mod = await import("@/lib/auth-client");
    expect(mod.authClient).toBeDefined();
    expect(mod.authClient.signIn).toBeDefined();
    expect(mod.authClient.signOut).toBeDefined();
    expect(mod.authClient.useSession).toBeDefined();
  });
});
