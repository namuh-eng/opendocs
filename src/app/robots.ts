import { getPublicAppUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

const APP_URL = getPublicAppUrl();

/**
 * GET /robots.txt
 *
 * Dynamically generates a robots.txt file that refers to sitemaps for all docs sites.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const allProjects = await db
    .select({ subdomain: projects.subdomain })
    .from(projects);

  const sitemaps = allProjects.map(
    (p) => `${APP_URL}/api/docs/${p.subdomain}/sitemap`,
  );

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: sitemaps,
  };
}
