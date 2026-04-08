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
import {
  filterPagesByLocale,
  generateHreflangTags,
  getAvailableLocalesForPage,
  mergeLanguagesConfig,
  parseLocaleFromSlug,
} from "@/lib/i18n";
import { buildDocsNav, renderMdxContent } from "@/lib/mdx-renderer";
import {
  type VirtualApiPage,
  type VirtualAsyncApiPage,
  findVirtualAsyncApiPage,
  findVirtualPage,
  generateAsyncApiPages,
  generateVirtualPages,
  isAsyncApiSpec,
  renderAsyncApiChannelPage,
} from "@/lib/openapi";
import {
  type OpenApiEndpoint,
  parseOpenApiSpec,
  renderApiPlaygroundHtml,
} from "@/lib/openapi-parser";
import { getGroupName } from "@/lib/page-chrome";
import { buildPageMetadata } from "@/lib/seo";
import {
  buildVariablesMap,
  resolveSnippets,
  resolveVariables,
} from "@/lib/snippets";
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
  const langConfig = mergeLanguagesConfig(
    docsSettings.languages as
      | Partial<import("@/lib/i18n").LanguagesConfig>
      | undefined,
  );

  // Parse locale from URL slug
  const { locale, pagePath } = parseLocaleFromSlug(
    slug.map((s) => s.toLowerCase()),
    langConfig,
  );

  // Build the DB path (locale-prefixed for non-default)
  const dbPath =
    locale === langConfig.defaultLanguage
      ? pagePath
      : pagePath
        ? `${locale}/${pagePath}`
        : locale;

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
        eq(pages.path, dbPath),
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

  // Add hreflang tags for i18n
  const hreflangTags = generateHreflangTags(
    APP_URL,
    subdomain,
    pagePath,
    langConfig,
  );
  if (hreflangTags.length > 0) {
    metadata.alternates = {
      ...metadata.alternates,
      languages: Object.fromEntries(
        hreflangTags.map((tag) => [tag.hreflang, tag.href]),
      ),
    };
  }

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

  // Parse i18n configuration
  const docsSettings = (project.settings || {}) as Record<string, unknown>;
  const docsConfig = mergeDocsConfig(
    docsSettings.docsConfig as Partial<Record<string, unknown>> | undefined,
  );
  const langConfig = mergeLanguagesConfig(
    docsSettings.languages as
      | Partial<import("@/lib/i18n").LanguagesConfig>
      | undefined,
  );

  // Parse locale from URL slug
  const { locale, pagePath } = parseLocaleFromSlug(
    slug.map((s) => s.toLowerCase()),
    langConfig,
  );

  // Build DB path: default language has no prefix, others are "{locale}/{pagePath}"
  const targetPath =
    locale === langConfig.defaultLanguage
      ? pagePath
      : pagePath
        ? `${locale}/${pagePath}`
        : locale;

  // Fetch all published pages
  const allPagesRaw = await db
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

  // Filter pages by current locale for navigation
  const localizedPages = filterPagesByLocale(
    allPagesRaw,
    locale,
    langConfig.defaultLanguage,
  );
  const allPages = localizedPages.map((p) => ({
    id: p.id,
    path: p.path,
    title: p.title,
    description: p.description,
    content: p.content,
    frontmatter: p.frontmatter,
    isPublished: p.isPublished,
  }));

  // Check for redirects before looking up the page
  const redirectDest = findRedirect(docsConfig.advanced.redirects, pagePath);
  if (redirectDest) {
    // Normalize destination: ensure it forms a valid docs path
    const dest = redirectDest.replace(/^\/+/, "");
    permanentRedirect(`/docs/${subdomain}/${dest}`);
  }

  // ── OpenAPI/AsyncAPI virtual pages ────────────────────────────────────────
  const spec = docsSettings.openApiSpec as Record<string, unknown> | undefined;
  let virtualPages: VirtualApiPage[] = [];
  let asyncPages: VirtualAsyncApiPage[] = [];

  if (spec && typeof spec === "object") {
    if (isAsyncApiSpec(spec)) {
      asyncPages = generateAsyncApiPages(spec);
    } else {
      virtualPages = generateVirtualPages(spec);
    }
  }

  // Find the current page — check DB first, then virtual pages
  // Use pagePath (locale-stripped) since allPages paths are already stripped
  const currentPage = allPages.find((p) => p.path === pagePath);
  const virtualPage = findVirtualPage(virtualPages, pagePath);
  const asyncPage = findVirtualAsyncApiPage(asyncPages, pagePath);

  if (!currentPage && !virtualPage && !asyncPage) {
    notFound();
  }

  // Build navigation (pass frontmatter for API method badges in sidebar)
  const navPages = allPages.map((p) => ({
    id: p.id,
    path: p.path,
    title: p.title,
    frontmatter: p.frontmatter as Record<string, unknown> | null,
  }));

  // Add virtual pages to nav as virtual entries with apiMethod for badges
  for (const vp of virtualPages) {
    // Don't add if a DB page already exists for this path
    if (!allPages.some((p) => p.path === vp.path)) {
      navPages.push({
        id: vp.id,
        path: vp.path,
        title: vp.title,
        frontmatter: { api: `${vp.method} ${vp.endpoint.path}` },
      });
    }
  }
  for (const ap of asyncPages) {
    if (!allPages.some((p) => p.path === ap.path)) {
      navPages.push({
        id: ap.id,
        path: ap.path,
        title: ap.title,
        frontmatter: { api: `HOOK ${ap.channel.name}` },
      });
    }
  }

  const nav = buildDocsNav(navPages);

  // ── Rendering ─────────────────────────────────────────────────────────────
  const footerSettings = getFooterSettings(docsSettings);
  let renderedHtml = "";
  let apiPlaygroundHtml = "";
  let apiReferenceHtml = "";
  let pageTitle = "";
  let pageDescription = "";
  let pageContent = "";

  if (asyncPage && !currentPage) {
    // Render auto-generated AsyncAPI channel page
    pageTitle = asyncPage.title;
    pageDescription = asyncPage.description;
    apiReferenceHtml = renderAsyncApiChannelPage(asyncPage);
  } else if (virtualPage && !currentPage) {
    // Render auto-generated OpenAPI endpoint page
    pageTitle = virtualPage.title;
    pageDescription = virtualPage.description;
    apiReferenceHtml = renderApiReferencePage(virtualPage.endpoint);
    if (docsConfig.apiDocs.playgroundEnabled) {
      apiPlaygroundHtml = renderApiPlaygroundHtml(virtualPage.endpoint);
    }
  } else if (currentPage) {
    // Render DB page (existing behavior)
    pageTitle = currentPage.title;
    pageDescription = currentPage.description || "";
    pageContent = currentPage.content || "";

    // Resolve snippets and variables before rendering
    const snippetPages = allPages
      .filter((p) => p.path.startsWith("snippets/"))
      .map((p) => ({ path: p.path, content: p.content || "" }));

    const projectVars = (docsConfig as unknown as Record<string, unknown>)
      .variables as Record<string, string> | undefined;
    const variables = buildVariablesMap(
      currentPage.frontmatter as Record<string, unknown> | null,
      projectVars,
    );

    let contentToRender = pageContent;
    contentToRender = resolveSnippets(contentToRender, snippetPages);
    contentToRender = resolveVariables(contentToRender, variables);
    renderedHtml = renderMdxContent(contentToRender);

    // Check if this DB page also matches an OpenAPI endpoint
    const isApiReferencePage = pagePath.startsWith("api-reference");
    if (isApiReferencePage && spec) {
      const endpoints = parseOpenApiSpec(spec);
      const frontmatter = (currentPage.frontmatter || {}) as Record<
        string,
        unknown
      >;
      const apiMethod = (frontmatter.api as string) || "";
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
        apiReferenceHtml = matchedEndpoints
          .map((ep) => renderApiReferencePage(ep))
          .join("\n");
      }
    }
  }

  // Extract TOC from raw content
  const toc = extractToc(pageContent);

  // Build flat list of all pages (DB + virtual) for prev/next
  const allNavPaths = navPages.map((p) => ({ path: p.path, title: p.title }));
  const currentIdx = allNavPaths.findIndex((p) => p.path === pagePath);
  const prevPage =
    currentIdx > 0
      ? {
          path: allNavPaths[currentIdx - 1].path,
          title: allNavPaths[currentIdx - 1].title,
        }
      : null;
  const nextPage =
    currentIdx < allNavPaths.length - 1
      ? {
          path: allNavPaths[currentIdx + 1].path,
          title: allNavPaths[currentIdx + 1].title,
        }
      : null;

  // Get group name for breadcrumb
  const groupName = getGroupName(pagePath);

  // Build searchable pages list (DB + virtual)
  const searchablePages = allNavPaths;

  // Compute available locales for the language switcher
  const availableLocales = getAvailableLocalesForPage(
    allPagesRaw,
    pagePath,
    langConfig,
  );

  return (
    <div className="docs-layout">
      <DocsTopbar
        projectName={project.name}
        subdomain={subdomain}
        settings={project.settings as Record<string, unknown>}
        i18n={
          langConfig.enabled && langConfig.supportedLanguages.length > 1
            ? {
                currentLocale: locale,
                availableLocales,
                defaultLanguage: langConfig.defaultLanguage,
                pagePath,
              }
            : undefined
        }
      />

      <SearchModal pages={searchablePages} subdomain={subdomain} />
      <MobileSidebar
        nav={nav}
        activePath={pagePath}
        subdomain={subdomain}
        projectName={project.name}
      />

      <div className="docs-body">
        <DocsSidebar
          nav={nav}
          activePath={pagePath}
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
                {pageTitle}
              </h1>
              <PageHeaderActions
                title={pageTitle}
                content={pageContent}
                pageUrl={`/docs/${subdomain}/${targetPath}`}
              />
            </div>
            {pageDescription && (
              <p className="docs-page-description">{pageDescription}</p>
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
