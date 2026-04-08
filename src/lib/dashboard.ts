/**
 * Dashboard overview utilities — quick action cards, site URL helpers.
 */

export interface QuickActionCard {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: "edit" | "globe" | "settings" | "bar-chart";
}

/** Build quick action cards for the dashboard overview. */
export function buildQuickActionCards(projectId: string): QuickActionCard[] {
  return [
    {
      id: "open-editor",
      title: "Open editor",
      description: "Edit your documentation pages",
      href: "/editor/main",
      icon: "edit",
    },
    {
      id: "view-site",
      title: "View site",
      description: "Preview your live documentation",
      href: "", // filled dynamically with subdomain URL
      icon: "globe",
    },
    {
      id: "analytics",
      title: "Analytics",
      description: "View page views and engagement",
      href: "/analytics",
      icon: "bar-chart",
    },
    {
      id: "settings",
      title: "Settings",
      description: "Configure project settings",
      href: "/settings/deployment/general",
      icon: "settings",
    },
  ];
}

/** Build the docs site URL for a project subdomain. */
export function buildSiteUrl(
  subdomain: string | null,
  customDomain: string | null,
): string {
  if (customDomain) return `https://${customDomain}`;
  if (subdomain) return `/docs/${subdomain}`;
  return "#";
}

/** Format a domain for display (strip protocol, trailing slash). */
export function formatDomainDisplay(
  subdomain: string | null,
  customDomain: string | null,
): string {
  if (customDomain) return customDomain;
  if (subdomain) return `${subdomain}.mintlify.app`;
  return "";
}

/** Determine the project status summary label. */
export function projectStatusSummary(
  status: string,
  latestDeploymentMessage: string | null,
  latestDeploymentTime: string | null,
): string {
  if (status === "deploying") return "Deployment in progress...";
  if (latestDeploymentMessage && latestDeploymentTime) {
    return `${latestDeploymentMessage}`;
  }
  return "No deployments yet";
}
