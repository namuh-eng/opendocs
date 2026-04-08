import { ApiPlayground } from "@/components/docs/api-playground";
import { ChatWidget } from "@/components/docs/chat-widget";
import { DocsPagination } from "@/components/docs/docs-pagination";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { DocsToc } from "@/components/docs/docs-toc";
import { DocsTopbar } from "@/components/docs/docs-topbar";
import { MdxContent } from "@/components/docs/mdx-content";
import { MobileSidebar } from "@/components/docs/mobile-nav";
import {
  HeadingAnchors,
  PageHeaderActions,
} from "@/components/docs/page-chrome";
import { SearchModal } from "@/components/docs/search-modal";
import { db } from "@/lib/db";
import { pages, projects } from "@/lib/db/schema";
import { extractToc } from "@/lib/editor";
import { buildDocsNav, renderMdxContent } from "@/lib/mdx-renderer";
import {
  type OpenApiEndpoint,
  parseOpenApiSpec,
  renderApiPlaygroundHtml,
} from "@/lib/openapi-parser";
import { getGroupName } from "@/lib/page-chrome";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

interface DocsPageProps {
  params: Promise<{ subdomain: string; slug: string[] }>;
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

  // Find the current page
  const currentPage = allPages.find((p) => p.path === targetPath);
  if (!currentPage) {
    notFound();
  }

  // Build navigation
  const nav = buildDocsNav(allPages);

  // Render content
  const renderedHtml = renderMdxContent(currentPage.content || "");

  // Check if this is an API reference page and render playground
  const isApiReferencePage = targetPath.startsWith("api-reference");
  const settings = (project.settings || {}) as Record<string, unknown>;
  let apiPlaygroundHtml = "";

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
            {apiPlaygroundHtml && <ApiPlayground html={apiPlaygroundHtml} />}
            <HeadingAnchors />
          </article>

          <DocsPagination
            prev={prevPage}
            next={nextPage}
            subdomain={subdomain}
          />
        </main>

        <DocsToc entries={toc} />
      </div>

      <ChatWidget subdomain={subdomain} currentPath={targetPath} />
    </div>
  );
}
