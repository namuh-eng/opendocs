import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import {
  createDocsAccessToken,
  getDocsAccessCookieName,
  isValidDocsPassword,
} from "@/lib/project-docs-access";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export function normalizeDocsReturnTo(returnTo: string, subdomain: string) {
  const fallback = `/docs/${subdomain}`;
  if (!returnTo.startsWith(fallback)) return fallback;
  if (returnTo.startsWith("//") || returnTo.includes("://")) return fallback;
  return returnTo;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subdomain: string }> },
) {
  const { subdomain } = await params;
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const returnTo = normalizeDocsReturnTo(
    String(formData.get("returnTo") ?? ""),
    subdomain,
  );

  const [project] = await db
    .select({ settings: projects.settings })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (!project) {
    return NextResponse.redirect(new URL(`/docs/${subdomain}`, request.url));
  }

  if (!(await isValidDocsPassword(project.settings, password))) {
    const url = new URL(`/docs/${subdomain}`, request.url);
    url.searchParams.set("auth", "failed");
    return NextResponse.redirect(url);
  }

  let accessToken: string;
  try {
    accessToken = createDocsAccessToken(
      subdomain,
      (
        project.settings as {
          authentication?: { passwordHash?: string; password?: string };
        }
      )?.authentication?.passwordHash || password,
    );
  } catch {
    return NextResponse.json(
      { error: "Docs access tokens are not configured" },
      { status: 503 },
    );
  }

  const response = NextResponse.redirect(new URL(returnTo, request.url));
  response.cookies.set({
    name: getDocsAccessCookieName(subdomain),
    value: accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
