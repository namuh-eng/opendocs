import { getPublicAppUrl } from "@/lib/app-url";

/**
 * URL helpers for a project's public docs site.
 *
 * In production, docs live on a subdomain of NEXT_PUBLIC_DOCS_ROOT_DOMAIN
 * (e.g. acme-docs.namuh.dev). When that env var is not set (local dev),
 * docs are served from the path-based route on the app origin, so the
 * URLs we show actually work.
 */

/** Full docs site URL including protocol, e.g. for links and API clients. */
export function docsSiteUrl(subdomain: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_DOCS_ROOT_DOMAIN?.trim();
  if (rootDomain) {
    return `https://${subdomain}.${rootDomain.replace(/^\.+/, "")}`;
  }

  return `${getPublicAppUrl()}/docs/${subdomain}`;
}

/** Docs site URL without the protocol, for compact display in the UI. */
export function docsDisplayUrl(subdomain: string): string {
  return docsSiteUrl(subdomain).replace(/^https?:\/\//, "");
}
