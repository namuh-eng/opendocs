import { DocsPasswordGate } from "@/components/docs/docs-password-gate";
import { db } from "@/lib/db";
import { pages, projects } from "@/lib/db/schema";
import {
  getDocsAccessCookieName,
  hasValidDocsAccess,
} from "@/lib/project-docs-access";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

interface DocsIndexProps {
  params: Promise<{ subdomain: string }>;
  searchParams?: Promise<{ auth?: string }>;
}

/** Docs site index: redirects to the first published page or shows a 404 */
export default async function DocsIndex({
  params,
  searchParams,
}: DocsIndexProps) {
  const { subdomain } = await params;
  const query = await searchParams;

  const projectResult = await db
    .select({ id: projects.id, settings: projects.settings })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (projectResult.length === 0) {
    notFound();
  }

  const cookieStore = await cookies();
  if (
    !hasValidDocsAccess(
      projectResult[0].settings,
      subdomain,
      cookieStore.get(getDocsAccessCookieName(subdomain))?.value,
    )
  ) {
    return (
      <DocsPasswordGate
        subdomain={subdomain}
        error={query?.auth === "failed" ? "Incorrect password." : undefined}
      />
    );
  }

  // 1. Try to find 'introduction' first
  const introductionPage = await db
    .select({ path: pages.path })
    .from(pages)
    .where(
      and(
        eq(pages.projectId, projectResult[0].id),
        eq(pages.path, "introduction"),
        eq(pages.isPublished, true),
      ),
    )
    .limit(1);

  if (introductionPage.length > 0) {
    redirect(`/docs/${subdomain}/${introductionPage[0].path}`);
  }

  // 2. Fallback to alphabetically first page
  const firstPage = await db
    .select({ path: pages.path })
    .from(pages)
    .where(
      and(
        eq(pages.projectId, projectResult[0].id),
        eq(pages.isPublished, true),
      ),
    )
    .orderBy(pages.path)
    .limit(1);

  if (firstPage.length > 0) {
    redirect(`/docs/${subdomain}/${firstPage[0].path}`);
  }

  notFound();
}
