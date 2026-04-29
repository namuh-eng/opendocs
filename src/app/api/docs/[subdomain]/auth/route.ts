import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import {
  createDocsAccessToken,
  getDocsAccessCookieName,
  isValidDocsPassword,
} from "@/lib/project-docs-access";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subdomain: string }> },
) {
  const { subdomain } = await params;
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const returnTo = String(formData.get("returnTo") ?? `/docs/${subdomain}`);

  const [project] = await db
    .select({ settings: projects.settings })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (!project) {
    return NextResponse.redirect(new URL(`/docs/${subdomain}`, request.url));
  }

  if (!isValidDocsPassword(project.settings, password)) {
    const url = new URL(`/docs/${subdomain}`, request.url);
    url.searchParams.set("auth", "failed");
    return NextResponse.redirect(url);
  }

  const response = NextResponse.redirect(new URL(returnTo, request.url));
  response.cookies.set({
    name: getDocsAccessCookieName(subdomain),
    value: createDocsAccessToken(subdomain, password),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
