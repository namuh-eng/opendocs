export interface PublicMarkdownExportPath {
  subdomain: string;
  pagePath: string;
}

export function parsePublicMarkdownExportPath(
  pathname: string,
): PublicMarkdownExportPath | null {
  const match = pathname.match(/^\/docs\/([^/]+)\/(.+)\.md$/);
  if (!match) return null;

  const [, rawSubdomain, rawPagePath] = match;
  if (!rawSubdomain || !rawPagePath) return null;

  return {
    subdomain: decodeURIComponent(rawSubdomain),
    pagePath: decodeURIComponent(rawPagePath).replace(/^\/+/, ""),
  };
}
