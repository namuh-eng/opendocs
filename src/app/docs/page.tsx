import { db } from "@/lib/db";
import { pages, projects } from "@/lib/db/schema";
import { buildDocsEntryProjects } from "@/lib/docs-entry";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Docs - OpenDocs",
  description: "Browse published OpenDocs documentation and API references.",
};

async function getPublishedDocsProjects() {
  try {
    const rows = await db
      .select({
        projectId: projects.id,
        projectName: projects.name,
        subdomain: projects.subdomain,
        pagePath: pages.path,
        pageTitle: pages.title,
        pageDescription: pages.description,
      })
      .from(projects)
      .innerJoin(pages, eq(pages.projectId, projects.id))
      .where(and(isNotNull(projects.subdomain), eq(pages.isPublished, true)))
      .orderBy(asc(projects.name), asc(pages.path));

    return buildDocsEntryProjects(rows).slice(0, 6);
  } catch {
    return [];
  }
}

const featureCards = [
  {
    title: "Searchable docs",
    description:
      "Publish MDX content with navigation, table of contents, keyboard search, and reader feedback.",
  },
  {
    title: "API references",
    description:
      "Turn OpenAPI definitions into interactive endpoint pages with request examples and playgrounds.",
  },
  {
    title: "AI-native help",
    description:
      "Give readers assistant workflows that can answer questions from your documentation.",
  },
];

export default async function DocsLandingPage() {
  const publishedProjects = await getPublishedDocsProjects();

  return (
    <main className="od-app-shell min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--od-text)]"
          >
            OpenDocs
          </Link>
          <nav className="flex items-center gap-3 text-sm text-[var(--od-text-muted)]">
            <Link
              className="transition hover:text-[var(--od-text)]"
              href="/onboarding"
            >
              Start onboarding
            </Link>
            <Link
              className="transition hover:text-[var(--od-text)]"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-12 py-20 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <div className="od-chip mb-6">Documentation</div>
            <h1 className="text-4xl font-semibold text-[var(--od-text)] sm:text-6xl">
              Browse published docs and API references
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--od-text-muted)] sm:text-lg">
              OpenDocs gives every project a Mintlify-style public docs surface
              with structured navigation, search, API playgrounds, and AI-ready
              content.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href={publishedProjects[0]?.href ?? "/onboarding"}
                className="rounded-lg bg-[var(--od-accent)] px-4 py-2.5 text-sm font-medium text-[#fff] transition hover:bg-[var(--od-accent-strong)]"
              >
                Explore docs
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg border border-[var(--od-border)] bg-[var(--od-panel)] px-4 py-2.5 text-sm font-medium text-[var(--od-text)] transition hover:bg-[var(--od-panel-muted)]"
              >
                Open dashboard
              </Link>
            </div>
          </div>

          <div className="od-card p-5">
            <h2 className="text-sm font-medium text-[var(--od-text-muted)]">
              Published documentation
            </h2>
            <div className="mt-4 space-y-3">
              {publishedProjects.length > 0 ? (
                publishedProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={project.href}
                    className="block rounded-[var(--od-card-radius)] border border-[var(--od-border)] bg-[var(--od-panel-muted)] p-4 transition hover:border-[var(--od-accent-border)] hover:bg-[var(--od-accent-soft)]"
                  >
                    <div className="text-sm font-semibold text-[var(--od-text)]">
                      {project.name}
                    </div>
                    <div className="mt-1 text-xs text-[var(--od-accent)]">
                      /docs/{project.subdomain}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--od-text-muted)]">
                      {project.pageDescription ??
                        `Start with ${project.pageTitle}.`}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="rounded-[var(--od-card-radius)] border border-dashed border-[var(--od-border)] bg-[var(--od-panel-muted)] p-4">
                  <div className="text-sm font-semibold text-[var(--od-text)]">
                    No published docs yet
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--od-text-muted)]">
                    Create a project or publish a page to make it available from
                    this docs entry point.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-16 md:grid-cols-3">
          {featureCards.map((card) => (
            <div key={card.title} className="od-card p-5">
              <h2 className="text-sm font-medium text-[var(--od-text)]">
                {card.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--od-text-muted)]">
                {card.description}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
