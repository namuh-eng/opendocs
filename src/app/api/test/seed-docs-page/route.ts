import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations, pages, projects } from "@/lib/db/schema";

const FIXTURE_ORG_SLUG = "playwright-docs-fixtures";
const FIXTURE_PAGE_PATH = "introduction";
const FIXTURE_CONTENT = `# Introduction
This seeded page exists for TOC verification.

## Getting started
Start here for the docs TOC test fixture.

### Install the package
Install the package before running the local preview.

## Configure navigation
Configure the navigation groups and page ordering.

### Add section links
Each section should appear in the right-hand TOC.

## Publish docs
Publish the page and verify the public docs route.
`;

export async function POST() {
  const isTestEnv =
    process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT_TEST === "true";

  if (!isTestEnv) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const fixtureSuffix = randomUUID().slice(0, 8);
  const orgName = "Playwright Docs Fixtures";
  const projectName = "Playwright Docs TOC";
  const projectSlug = `playwright-docs-toc-${fixtureSuffix}`;
  const subdomain = `playwright-docs-toc-${fixtureSuffix}`;

  let [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, FIXTURE_ORG_SLUG))
    .limit(1);

  if (!org) {
    [org] = await db
      .insert(organizations)
      .values({
        name: orgName,
        slug: FIXTURE_ORG_SLUG,
      })
      .returning({ id: organizations.id });
  }

  const [project] = await db
    .insert(projects)
    .values({
      orgId: org.id,
      name: projectName,
      slug: projectSlug,
      subdomain,
      status: "active",
    })
    .returning({ id: projects.id, subdomain: projects.subdomain });

  await db.insert(pages).values({
    projectId: project.id,
    path: FIXTURE_PAGE_PATH,
    title: "Introduction",
    description: "Seeded docs page for TOC coverage",
    content: FIXTURE_CONTENT,
    isPublished: true,
  });

  return NextResponse.json({
    subdomain: project.subdomain,
    pagePath: FIXTURE_PAGE_PATH,
  });
}
