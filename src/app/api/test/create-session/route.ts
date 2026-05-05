import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  session as authSessions,
  user as authUsers,
} from "@/lib/db/auth-schema";
import {
  orgMemberships,
  organizations,
  pages,
  projects,
} from "@/lib/db/schema";
import { slugify } from "@/lib/orgs";
import { generateSubdomain, slugifyProject } from "@/lib/projects";
import { serializeSignedCookie } from "better-call";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const FIXTURE_ORG_SLUG = "playwright-docs-fixtures";
const FIXTURE_PROJECT_SLUG = "test-project";
const FIXTURE_SUBDOMAIN = "test-project";

const FIXTURE_OPENAPI_SPEC = {
  openapi: "3.0.3",
  info: { title: "Fixture API", version: "1.0.0" },
  servers: [{ url: "https://api.example.com" }],
  paths: {
    "/plants": {
      get: {
        operationId: "getPlants",
        summary: "Get Plants",
        description: "Returns a list of plants.",
        tags: ["Plants"],
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            description: "Maximum number of plants to return.",
            schema: { type: "integer", default: 10 },
          },
        ],
        responses: {
          "200": { description: "A list of plants." },
          "400": { description: "Invalid request." },
        },
      },
    },
  },
};

const FIXTURE_PROJECT_SETTINGS = {
  supportEmail: "support@example.com",
  githubUrl: "https://github.com/namuh-eng/opendocs",
  docsConfig: {
    footer: {
      brandName: "OpenDocs",
      brandUrl: "https://example.com",
      socialLinks: [
        { type: "github", url: "https://github.com/namuh-eng/opendocs" },
      ],
    },
    apiDocs: {
      playgroundEnabled: true,
      baseApiUrl: "https://api.example.com",
    },
    assistantSearch: {
      assistantEnabled: true,
      searchEnabled: true,
      searchPrompt: "Search the fixture docs...",
    },
  },
  languages: {
    enabled: true,
    defaultLanguage: "en",
    supportedLanguages: ["en", "fr"],
  },
  versions: {
    enabled: true,
    versions: [
      { tag: "v2", name: "Version 2.0", isDefault: true },
      { tag: "v1", name: "Version 1.0", isDefault: false },
    ],
  },
  openApiSpec: FIXTURE_OPENAPI_SPEC,
};

const FIXTURE_PAGES = [
  {
    path: "introduction",
    title: "Introduction",
    description: "Welcome to the Playwright docs fixture.",
    content: `# Introduction

This stable fixture powers public docs route E2E coverage.

## Getting started

Use the quickstart to make your first request.

### Install the package

Install the SDK before continuing.

## Configure navigation

Navigation, pagination, and table of contents are verified from this page.
`,
  },
  {
    path: "quickstart",
    title: "Quickstart",
    description: "Get running quickly with the fixture docs.",
    content: `# Quickstart

This quickstart contains enough sections for layout, search, and TOC tests.

## Create a project

Create a docs project and publish your first page.

## Install the SDK

Install dependencies and configure authentication.

## Make your first request

Call the Plants API and inspect the response.
`,
  },
  {
    path: "getting-started",
    title: "Getting Started",
    description: "Searchable getting started content.",
    content: `# Getting Started

Search tests query this page for getting started and install guidance.

## Install

Install the package and configure your environment.
`,
  },
  {
    path: "guides/quickstart",
    title: "Guide Quickstart",
    description: "Nested guide page for breadcrumb coverage.",
    content: `# Guide Quickstart

Nested guide content for page chrome tests.

## Guide section

This heading appears in the table of contents.
`,
  },
  {
    path: "fr/introduction",
    title: "Introduction",
    description: "Page d’introduction en français.",
    content: `# Introduction

Contenu de test en français.
`,
  },
  {
    path: "v1/introduction",
    title: "Introduction",
    description: "Version 1 introduction page.",
    content: `# Introduction

Version 1 fixture content.
`,
  },
  {
    path: "v1/fr/introduction",
    title: "Introduction",
    description: "Version 1 French introduction page.",
    content: `# Introduction

Contenu français pour la version 1.
`,
  },
];

async function ensureDocsFixtureProject() {
  let [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, FIXTURE_ORG_SLUG))
    .limit(1);

  if (!org) {
    [org] = await db
      .insert(organizations)
      .values({
        name: "Playwright Docs Fixtures",
        slug: FIXTURE_ORG_SLUG,
      })
      .returning({ id: organizations.id });
  }

  if (!org) return;

  let [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.subdomain, FIXTURE_SUBDOMAIN))
    .limit(1);

  if (!project) {
    [project] = await db
      .insert(projects)
      .values({
        orgId: org.id,
        name: "Test Project",
        slug: FIXTURE_PROJECT_SLUG,
        subdomain: FIXTURE_SUBDOMAIN,
        status: "active",
        settings: FIXTURE_PROJECT_SETTINGS,
      })
      .returning({ id: projects.id });
  } else {
    await db
      .update(projects)
      .set({
        name: "Test Project",
        subdomain: FIXTURE_SUBDOMAIN,
        status: "active",
        settings: FIXTURE_PROJECT_SETTINGS,
      })
      .where(eq(projects.id, project.id));
  }

  if (!project) return;

  for (const fixturePage of FIXTURE_PAGES) {
    const [existingPage] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(
        and(eq(pages.projectId, project.id), eq(pages.path, fixturePage.path)),
      )
      .limit(1);

    const pageValues = {
      title: fixturePage.title,
      description: fixturePage.description,
      content: fixturePage.content,
      frontmatter: {},
      isPublished: true,
    };

    if (existingPage) {
      await db
        .update(pages)
        .set(pageValues)
        .where(eq(pages.id, existingPage.id));
    } else {
      await db.insert(pages).values({
        projectId: project.id,
        path: fixturePage.path,
        ...pageValues,
      });
    }
  }
}

// Test-only route for creating sessions in E2E tests.
// Only available in dedicated test environments.
export async function POST(request: Request) {
  const isTestEnv =
    process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT_TEST === "true";

  if (!isTestEnv) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const body = await request.json();
  const {
    email,
    name,
    withOrg = true,
  } = body as {
    email: string;
    name: string;
    withOrg?: boolean;
  };

  if (!email || !name) {
    return NextResponse.json(
      { error: "email and name required" },
      { status: 400 },
    );
  }

  let [existingUser] = await db
    .select({
      id: authUsers.id,
      name: authUsers.name,
      email: authUsers.email,
    })
    .from(authUsers)
    .where(eq(authUsers.email, email))
    .limit(1);

  if (!existingUser) {
    const [createdUser] = await db
      .insert(authUsers)
      .values({
        id: randomUUID(),
        name,
        email,
        emailVerified: true,
      })
      .returning({
        id: authUsers.id,
        name: authUsers.name,
        email: authUsers.email,
      });

    existingUser = createdUser;
  }

  if (!existingUser) {
    return NextResponse.json(
      { error: "failed to create user" },
      { status: 500 },
    );
  }

  if (withOrg) {
    let [membership] = await db
      .select({
        orgId: orgMemberships.orgId,
      })
      .from(orgMemberships)
      .where(eq(orgMemberships.userId, existingUser.id))
      .limit(1);

    if (!membership) {
      const orgSlugBase = slugify(name) || "playwright-user";
      const orgSlug = `${orgSlugBase}-${existingUser.id.slice(0, 6)}`;
      const [organization] = await db
        .insert(organizations)
        .values({
          name: `${name}'s Workspace`,
          slug: orgSlug,
        })
        .returning({
          id: organizations.id,
          slug: organizations.slug,
        });

      if (!organization) {
        return NextResponse.json(
          { error: "failed to create organization" },
          { status: 500 },
        );
      }

      await db.insert(orgMemberships).values({
        orgId: organization.id,
        userId: existingUser.id,
        role: "admin",
      });

      membership = { orgId: organization.id };
    }

    const [existingProject] = await db
      .select({
        id: projects.id,
      })
      .from(projects)
      .where(eq(projects.orgId, membership.orgId))
      .limit(1);

    if (!existingProject) {
      const projectName = "QA Project";
      const projectSlug = slugifyProject(projectName) || "qa-project";
      const [organization] = await db
        .select({
          slug: organizations.slug,
        })
        .from(organizations)
        .where(eq(organizations.id, membership.orgId))
        .limit(1);

      await db.insert(projects).values({
        orgId: membership.orgId,
        name: projectName,
        slug: projectSlug,
        subdomain: generateSubdomain(organization?.slug ?? "qa", projectSlug),
        status: "active",
      });
    }
  }

  await ensureDocsFixtureProject();

  await db.delete(authSessions).where(eq(authSessions.userId, existingUser.id));

  const sessionToken = randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(authSessions).values({
    id: randomUUID(),
    token: sessionToken,
    userId: existingUser.id,
    expiresAt,
    userAgent: "Playwright",
  });

  const context = await auth.$context;
  const sessionCookie = context.authCookies.sessionToken;
  const setCookie = await serializeSignedCookie(
    sessionCookie.name,
    sessionToken,
    context.secret,
    {
      ...sessionCookie.attributes,
      expires: expiresAt,
      maxAge: 7 * 24 * 60 * 60,
    },
  );

  return NextResponse.json({
    success: true,
    user: existingUser,
    setCookie,
    expiresAt: expiresAt.toISOString(),
  });
}
