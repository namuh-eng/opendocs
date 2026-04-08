import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

const AUTH_PAGES = ["/login", "/signup"];
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/settings",
  "/products",
  "/analytics",
];

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // Authenticated users visiting auth pages → redirect to dashboard
  if (sessionCookie && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Unauthenticated users visiting protected routes or onboarding → redirect to login
  if (
    !sessionCookie &&
    (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
      pathname === "/onboarding")
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/products/:path*",
    "/analytics/:path*",
    "/onboarding",
    "/login",
    "/signup",
  ],
};
