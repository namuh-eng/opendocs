import { ApiPlayground } from "@/components/docs/api-playground";
import { ApiReferenceLayout } from "@/components/docs/api-reference-layout";
import { ChatWidget } from "@/components/docs/chat-widget";
import { CustomCodeInjection } from "@/components/docs/custom-code-injection";
import { DocsFooter } from "@/components/docs/docs-footer";
import { DocsPagination } from "@/components/docs/docs-pagination";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { DocsToc } from "@/components/docs/docs-toc";
import { DocsTopbar } from "@/components/docs/docs-topbar";
import { FeedbackWidget } from "@/components/docs/feedback-widget";
import { MdxContent } from "@/components/docs/mdx-content";
import { MobileSidebar } from "@/components/docs/mobile-nav";
import {
  HeadingAnchors,
  PageHeaderActions,
} from "@/components/docs/page-chrome";
import { SearchModal } from "@/components/docs/search-modal";
import { renderApiReferencePage } from "@/lib/api-reference";
import { db } from "@/lib/db";
import { pages, projects } from "@/lib/db/schema";
import { findRedirect, mergeDocsConfig } from "@/lib/docs-config";
import { getFooterSettings } from "@/lib/docs-footer";
import { extractToc } from "@/lib/editor";
import { buildDocsNav, renderMdxContent } from "@/lib/mdx-renderer";
import {
  type OpenApiEndpoint,
  parseOpenApiSpec,
  renderApiPlaygroundHtml,
} from "@/lib/openapi-parser";
import { getGroupName } from "@/lib/page-chrome";
import { buildPageMetadata } from "@/lib/seo";
import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

interface DocsPageProps {
  params: Promise<{ subdomain: string; slug: string[] }>;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3015";

export async function generateMetadata({
  params,
}: DocsPageProps): Promise<Metadata> {
  const { subdomain, slug } = await params;
  const targetPath = slug.join("/").toLowerCase();

  const projectResult = await db
    .select({
      id: projects.id,
      name: projects.name,
      settings: projects.settings,
    })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (projectResult.length === 0) return {};

  const project = projectResult[0];
  const docsSettings = (project.settings || {}) as Record<string, unknown>;
  const docsConfig = mergeDocsConfig(
    docsSettings.docsConfig as Partial<Record<string, unknown>> | undefined,
  );

  const pageResult = await db
    .select({
      title: pages.title,
      description: pages.description,
      path: pages.path,
      frontmatter: pages.frontmatter,
      updatedAt: pages.updatedAt,
      isPublished: pages.isPublished,
    })
    .from(pages)
    .where(
      and(
        eq(pages.projectId, project.id),
        eq(pages.path, targetPath),
        eq(pages.isPublished, true),
      ),
    )
    .limit(1);

  if (pageResult.length === 0) return {};

  const page = pageResult[0];
  const meta = buildPageMetadata(
    {
      path: page.path,
      title: page.title,
      description: page.description,
      updatedAt: page.updatedAt,
      frontmatter: page.frontmatter,
      isPublished: page.isPublished,
    },
    project.name,
    APP_URL,
    subdomain,
    docsConfig.advanced.seoTitle,
    docsConfig.advanced.seoDescription,
  );

  const metadata: Metadata = {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
  };

  if (meta.noindex) {
    metadata.robots = { index: false, follow: false };
  }

  if (meta.ogImage) {
    metadata.openGraph = {
      title: meta.title,
      description: meta.description,
      images: [{ url: meta.ogImage }],
    };
  } else {
    metadata.openGraph = {
      title: meta.title,
      description: meta.description,
    };
  }

  return metadata;
}

export default async function DocsPage({ params }: DocsPageProps) {
  const { subdomain, slug } = await params;
  const targetPath = slug.join("/").toLowerCase();

  // Find project
  const projectResult = await db
    .select({
      id: projects.id,
      name: projects.name,
      subdomain: projects.subdomain,
      settings: projects.settings,
    })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (projectResult.length === 0) {
    notFound();
  }

  const project = projectResult[0];

  // Fetch all published pages
  const allPages = await db
    .select({
      id: pages.id,
      path: pages.path,
      title: pages.title,
      description: pages.description,
      content: pages.content,
      frontmatter: pages.frontmatter,
      isPublished: pages.isPublished,
    })
    .from(pages)
    .where(and(eq(pages.projectId, project.id), eq(pages.isPublished, true)))
    .orderBy(pages.path);

  // Check for redirects before looking up the page
  const docsSettings = (project.settings || {}) as Record<string, unknown>;
  const docsConfig = mergeDocsConfig(
    docsSettings.docsConfig as Partial<Record<string, unknown>> | undefined,
  );
  const redirectDest = findRedirect(docsConfig.advanced.redirects, targetPath);
  if (redirectDest) {
    // Normalize destination: ensure it forms a valid docs path
    const dest = redirectDest.replace(/^\/+/, "");
    permanentRedirect(`/docs/${subdomain}/${dest}`);
  }

  // Find the current page
  const currentPage = allPages.find((p) => p.path === targetPath);
  if (!currentPage) {
    notFound();
  }

  // Build navigation (pass frontmatter for API method badges in sidebar)
  const navPages = allPages.map((p) => ({
    id: p.id,
    path: p.path,
    title: p.title,
    frontmatter: p.frontmatter as Record<string, unknown> | null,
  }));
  const nav = buildDocsNav(navPages);

  // Render content
  const renderedHtml = renderMdxContent(currentPage.content || "");

  // Check if this is an API reference page and render playground
  const isApiReferencePage = targetPath.startsWith("api-reference");
  const settings = (project.settings || {}) as Record<string, unknown>;
  const footerSettings = getFooterSettings(settings);
  let apiPlaygroundHtml = "";
  let apiReferenceHtml = "";

  if (isApiReferencePage && settings.openApiSpec) {
    const endpoints = parseOpenApiSpec(settings.openApiSpec);
    // Match endpoints to this page via frontmatter or path
    const frontmatter = (currentPage.frontmatter || {}) as Record<
      string,
      unknown
    >;
    const apiMethod = (frontmatter.api as string) || "";
    // Format: "GET /users/{id}" or just render all endpoints for index pages
    const matchedEndpoints: OpenApiEndpoint[] = [];

    if (apiMethod) {
      const [method, ...pathParts] = apiMethod.split(" ");
      const apiPath = pathParts.join(" ");
      const found = endpoints.find(
        (e) => e.method === method?.toUpperCase() && e.path === apiPath,
      );
      if (found) matchedEndpoints.push(found);
    }

    if (matchedEndpoints.length > 0) {
      apiPlaygroundHtml = matchedEndpoints
        .map((ep) => renderApiPlaygroundHtml(ep))
        .join("\n");
      // Also render the structured API reference layout
      apiReferenceHtml = matchedEndpoints
        .map((ep) => renderApiReferencePage(ep))
        .join("\n");
    }
  }

  // Extract TOC from raw content
  const toc = extractToc(currentPage.content || "");

  // Find prev/next pages
  const currentIdx = allPages.findIndex((p) => p.path === targetPath);
  const prevPage =
    currentIdx > 0
      ? {
          path: allPages[currentIdx - 1].path,
          title: allPages[currentIdx - 1].title,
        }
      : null;
  const nextPage =
    currentIdx < allPages.length - 1
      ? {
          path: allPages[currentIdx + 1].path,
          title: allPages[currentIdx + 1].title,
        }
      : null;

  // Get group name for breadcrumb
  const groupName = getGroupName(targetPath);

  // Build searchable pages list
  const searchablePages = allPages.map((p) => ({
    path: p.path,
    title: p.title,
  }));

  return (
    <div className="docs-layout">
      <DocsTopbar
        projectName={project.name}
        subdomain={subdomain}
        settings={project.settings as Record<string, unknown>}
      />

      <SearchModal pages={searchablePages} subdomain={subdomain} />
      <MobileSidebar
        nav={nav}
        activePath={targetPath}
        subdomain={subdomain}
        projectName={project.name}
      />

      <div className="docs-body">
        <DocsSidebar
          nav={nav}
          activePath={targetPath}
          subdomain={subdomain}
          projectName={project.name}
        />

        <main className="docs-main">
          {groupName && (
            <div className="docs-breadcrumb" data-testid="breadcrumb-group">
              {groupName}
            </div>
          )}

          <article className="docs-article">
            <div className="docs-title-row">
              <h1 className="docs-page-title" data-testid="page-title">
                {currentPage.title}
              </h1>
              <PageHeaderActions
                title={currentPage.title}
                content={currentPage.content || ""}
                pageUrl={`/docs/${subdomain}/${targetPath}`}
              />
            </div>
            {currentPage.description && (
              <p className="docs-page-description">{currentPage.description}</p>
            )}

            <MdxContent html={renderedHtml} />
            {apiReferenceHtml && <ApiReferenceLayout html={apiReferenceHtml} />}
            {apiPlaygroundHtml && <ApiPlayground html={apiPlaygroundHtml} />}
            <HeadingAnchors />
            <FeedbackWidget subdomain={subdomain} pagePath={targetPath} />
          </article>

          <DocsPagination
            prev={prevPage}
            next={nextPage}
            subdomain={subdomain}
          />

          <DocsFooter
            footerSettings={footerSettings}
            projectName={project.name}
          />
        </main>

        <DocsToc entries={toc} />
      </div>

      <ChatWidget subdomain={subdomain} currentPath={targetPath} />
      <CustomCodeInjection
        customCSS={docsConfig.advanced.customCSS}
        customJS={docsConfig.advanced.customJS}
      />
    </div>
  );
}
