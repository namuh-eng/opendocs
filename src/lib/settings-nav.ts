import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CreditCard,
  FileDown,
  GitBranch,
  GitFork,
  Globe,
  Key,
  LayoutList,
  Paintbrush,
  Puzzle,
  Settings,
  Shield,
  User,
  Users,
} from "lucide-react";

export interface SettingsNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface SettingsNavGroup {
  heading: string;
  items: SettingsNavItem[];
}

export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    heading: "Project Settings",
    items: [
      { label: "Domain setup", href: "/settings/project/domain", icon: Globe },
      {
        label: "Authentication",
        href: "/settings/project/authentication",
        icon: Shield,
      },
      { label: "Add-ons", href: "/settings/project/addons", icon: Puzzle },
      { label: "General", href: "/settings/project/general", icon: Settings },
    ],
  },
  {
    heading: "Deployment",
    items: [
      {
        label: "Git settings",
        href: "/settings/deployment/git",
        icon: GitBranch,
      },
      {
        label: "GitHub app",
        href: "/settings/deployment/github",
        icon: GitFork,
      },
    ],
  },
  {
    heading: "Security & Access",
    items: [
      { label: "API keys", href: "/settings/security/api-keys", icon: Key },
    ],
  },
  {
    heading: "Workspace",
    items: [
      { label: "Members", href: "/settings/workspace/members", icon: Users },
      {
        label: "Billing",
        href: "/settings/organization/billing",
        icon: CreditCard,
      },
      {
        label: "My profile",
        href: "/settings/workspace/profile",
        icon: User,
      },
    ],
  },
  {
    heading: "Advanced",
    items: [
      { label: "Exports", href: "/settings/advanced/exports", icon: FileDown },
      {
        label: "Danger zone",
        href: "/settings/advanced/danger",
        icon: AlertTriangle,
      },
    ],
  },
];

/** All flat nav items for iteration */
export const ALL_SETTINGS_ITEMS: SettingsNavItem[] = SETTINGS_NAV.flatMap(
  (g) => g.items,
);

/** Default settings page */
export const SETTINGS_DEFAULT_HREF = "/settings/project/general";

/**
 * Check if a given pathname matches a settings nav item.
 * Matches exact or prefix (for nested sub-pages).
 */
export function isActiveSettingsItem(
  pathname: string,
  itemHref: string,
): boolean {
  if (pathname === itemHref) return true;
  // Match sub-paths: /settings/project/general/foo
  return pathname.startsWith(`${itemHref}/`);
}

/**
 * Find the active nav item for a given pathname.
 * Returns the first matching item or null.
 */
export function findActiveSettingsItem(
  pathname: string,
): SettingsNavItem | null {
  for (const item of ALL_SETTINGS_ITEMS) {
    if (isActiveSettingsItem(pathname, item.href)) {
      return item;
    }
  }
  return null;
}

// Re-export icons used by existing pages that need to migrate
export { Paintbrush, LayoutList };
