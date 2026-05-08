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
    <main className="min-h-screen bg-[#0b0b0d] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            OpenDocs
          </Link>
          <nav className="flex items-center gap-3 text-sm text-white/70">
            <Link className="transition hover:text-white" href="/onboarding">
              Start onboarding
            </Link>
            <Link className="transition hover:text-white" href="/dashboard">
              Dashboard
            </Link>
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-12 py-20 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <div className="mb-6 inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/70">
              Documentation
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
              Browse published docs and API references
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
              OpenDocs gives every project a Mintlify-style public docs surface
              with structured navigation, search, API playgrounds, and AI-ready
              content.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href={publishedProjects[0]?.href ?? "/onboarding"}
                className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-black transition hover:bg-emerald-400"
              >
                Explore docs
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Open dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/30">
            <h2 className="text-sm font-medium text-white/80">
              Published documentation
            </h2>
            <div className="mt-4 space-y-3">
              {publishedProjects.length > 0 ? (
                publishedProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={project.href}
                    className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-emerald-400/50 hover:bg-emerald-500/10"
                  >
                    <div className="text-sm font-semibold text-white">
                      {project.name}
                    </div>
                    <div className="mt-1 text-xs text-emerald-300">
                      /docs/{project.subdomain}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/65">
                      {project.pageDescription ??
                        `Start with ${project.pageTitle}.`}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4">
                  <div className="text-sm font-semibold text-white">
                    No published docs yet
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/65">
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
            <div
              key={card.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <h2 className="text-sm font-medium text-white">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/65">
                {card.description}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
