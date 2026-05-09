import { parsePublicMarkdownExportPath } from "@/lib/public-markdown-export";
import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/settings",
  "/products",
  "/analytics",
];

const WORKSPACE_HOME_PATTERN = /^\/[^/]+\/[^/]+\/home$/;

function isProtectedDashboardPath(pathname: string) {
  return (
    PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    WORKSPACE_HOME_PATTERN.test(pathname)
  );
}

export async function proxy(request: NextRequest) {
  const start = Date.now();
  const sessionCookie = getSessionCookie(request);
  const { pathname, search } = request.nextUrl;

  const markdownExport = parsePublicMarkdownExportPath(pathname);
  if (markdownExport) {
    const markdownUrl = new URL(
      `/api/docs/${markdownExport.subdomain}/markdown/${markdownExport.pagePath}`,
      request.url,
    );
    const response = NextResponse.rewrite(markdownUrl);
    response.headers.set("Server-Timing", `proxy;dur=${Date.now() - start}`);
    return response;
  }

  // Unauthenticated users visiting protected routes or onboarding → redirect to login
  if (
    !sessionCookie &&
    (isProtectedDashboardPath(pathname) || pathname === "/onboarding")
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  const duration = Date.now() - start;

  // Set Server-Timing header for performance monitoring
  response.headers.set("Server-Timing", `proxy;dur=${duration}`);

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/:orgSlug/:projectSlug/home",
    "/settings/:path*",
    "/products/:path*",
    "/analytics/:path*",
    "/onboarding",
    "/docs/:path*",
  ],
};
