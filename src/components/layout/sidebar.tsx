"use client";

import { setStoredActiveProjectId } from "@/components/layout/shell-preferences";
import { clsx } from "clsx";
import {
  BarChart3,
  Bot,
  ChevronDown,
  ChevronsRight,
  GitBranch,
  Home,
  MessageCircle,
  PanelLeft,
  Pencil,
  Plus,
  Server,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

interface ProjectInfo {
  id: string;
  name: string;
  slug: string;
}

interface SidebarProps {
  orgName: string;
  orgSlug: string;
  collapsed?: boolean;
  isMobile?: boolean;
  mobileOpen?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
  projects?: ProjectInfo[];
  activeProjectId?: string;
  theme?: "light" | "dark";
}

const mainNavItems: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: <Home size={18} /> },
  { label: "Editor", href: "/editor/main", icon: <Pencil size={18} /> },
  { label: "Analytics", href: "/analytics", icon: <BarChart3 size={18} /> },
  { label: "Settings", href: "/settings", icon: <Settings size={18} /> },
];

const agentNavItems: NavItem[] = [
  {
    label: "Agent",
    href: "/products/agent",
    icon: <Bot size={18} />,
    badge: "New",
  },
  {
    label: "Assistant",
    href: "/products/assistant",
    icon: <MessageCircle size={18} />,
  },
  {
    label: "Workflows",
    href: "/products/workflows",
    icon: <GitBranch size={18} />,
  },
  { label: "MCP", href: "/products/mcp", icon: <Server size={18} /> },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return (
      pathname === "/dashboard" ||
      pathname.endsWith("/dashboard") ||
      pathname.endsWith("/home")
    );
  }
  return pathname.startsWith(href);
}

export function Sidebar({
  orgName,
  orgSlug,
  collapsed = false,
  isMobile = false,
  mobileOpen = false,
  onToggleCollapse,
  onCloseMobile,
  projects = [],
  activeProjectId,
  theme = "dark",
}: SidebarProps) {
  const pathname = usePathname();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const activeProject =
    projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const shellTheme =
    theme === "light"
      ? {
          aside: "bg-[var(--od-sidebar)] border-[var(--od-border)]",
          collapsed: "bg-[var(--od-sidebar)] border-[var(--od-border)]",
          primaryText: "text-[var(--od-text)]",
          secondaryText: "text-[var(--od-text-muted)]",
          hoverText: "hover:text-[var(--od-text)]",
          hoverBg: "hover:bg-[var(--od-panel-muted)]",
          active: "bg-[var(--od-sidebar-active-bg)] text-[var(--od-text)]",
          divider: "border-[var(--od-border)]",
          dropdown:
            "bg-[var(--od-panel)] border-[var(--od-border)] shadow-xl shadow-slate-900/10",
          badge: "bg-[var(--od-accent-soft)] text-[var(--od-accent-strong)]",
          chip: "bg-[var(--od-accent-strong)] text-white",
        }
      : {
          aside: "bg-[var(--od-sidebar)] border-[var(--od-border)]",
          collapsed: "bg-[var(--od-sidebar)] border-[var(--od-border)]",
          primaryText: "text-[var(--od-text)]",
          secondaryText: "text-[var(--od-text-muted)]",
          hoverText: "hover:text-[var(--od-text)]",
          hoverBg: "hover:bg-[var(--od-panel-muted)]",
          active: "bg-[var(--od-sidebar-active-bg)] text-[var(--od-text)]",
          divider: "border-[var(--od-border)]",
          dropdown: "bg-[var(--od-panel)] border-[var(--od-border)] shadow-lg",
          badge: "bg-[var(--od-accent-soft)] text-[var(--od-accent)]",
          chip: "bg-[var(--od-accent-strong)] text-white",
        };

  if (!isMobile && collapsed) {
    return (
      <aside
        className={clsx(
          "flex min-h-screen w-[var(--od-sidebar-collapsed-w)] flex-col items-center gap-2 border-r py-3",
          shellTheme.collapsed,
        )}
        data-testid="sidebar"
        data-collapsed="true"
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          className={clsx(
            "mb-2 rounded-md p-2",
            shellTheme.secondaryText,
            shellTheme.hoverBg,
          )}
          aria-label="Expand sidebar"
        >
          <ChevronsRight size={18} />
        </button>
        {mainNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "rounded-md p-2 transition-colors",
              isActive(pathname, item.href)
                ? shellTheme.active
                : [
                    shellTheme.secondaryText,
                    shellTheme.hoverBg,
                    shellTheme.hoverText,
                  ],
            )}
            title={item.label}
          >
            {item.icon}
          </Link>
        ))}
        <div className={clsx("my-1 w-8 border-t", shellTheme.divider)} />
        {agentNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "rounded-md p-2 transition-colors",
              isActive(pathname, item.href)
                ? shellTheme.active
                : [
                    shellTheme.secondaryText,
                    shellTheme.hoverBg,
                    shellTheme.hoverText,
                  ],
            )}
            title={item.label}
          >
            {item.icon}
          </Link>
        ))}
      </aside>
    );
  }

  return (
    <>
      {isMobile && mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={clsx(
          "flex flex-col border-r transition-transform duration-200",
          shellTheme.aside,
          isMobile
            ? [
                "fixed inset-y-0 left-0 z-40 min-h-screen w-[var(--od-sidebar-w)] shadow-xl lg:hidden",
                mobileOpen ? "translate-x-0" : "-translate-x-full",
              ]
            : "min-h-screen w-[var(--od-sidebar-w)]",
        )}
        data-testid="sidebar"
        data-collapsed="false"
        data-mobile-open={isMobile ? String(mobileOpen) : undefined}
      >
        <div className="px-3 py-3">
          <div className="mb-1 px-2 text-[11px] font-medium uppercase text-[var(--od-accent)]">
            Organization
          </div>
          <button
            type="button"
            onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
            className={clsx(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors",
              shellTheme.primaryText,
              shellTheme.hoverBg,
            )}
          >
            <div
              className={clsx(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold",
                shellTheme.chip,
              )}
            >
              {orgName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate">{orgName}</div>
              {activeProject ? (
                <div
                  className={clsx("truncate text-xs", shellTheme.secondaryText)}
                >
                  {activeProject.name}
                </div>
              ) : (
                <div
                  className={clsx("truncate text-xs", shellTheme.secondaryText)}
                >
                  {orgSlug}
                </div>
              )}
            </div>
            <ChevronDown
              size={14}
              className={clsx("ml-auto shrink-0", shellTheme.secondaryText)}
            />
          </button>
          {orgDropdownOpen && (
            <div
              className={clsx(
                "z-50 mt-1 rounded-lg border py-1",
                shellTheme.dropdown,
              )}
            >
              <div
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 text-sm",
                  shellTheme.primaryText,
                )}
              >
                <div
                  className={clsx(
                    "flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold",
                    shellTheme.chip,
                  )}
                >
                  {orgName.charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{orgName}</span>
                <span className="ml-auto text-[var(--od-accent)]">✓</span>
              </div>
              {projects.length > 0 && (
                <>
                  <div className={clsx("my-1 border-t", shellTheme.divider)} />
                  <div
                    className={clsx(
                      "px-3 py-1 text-[11px] font-medium uppercase",
                      shellTheme.secondaryText,
                    )}
                  >
                    Projects
                  </div>
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href="/dashboard"
                      onClick={(event) => {
                        event.preventDefault();
                        setStoredActiveProjectId(project.id);
                        setOrgDropdownOpen(false);
                        onCloseMobile?.();
                        if (typeof window !== "undefined") {
                          window.location.assign("/dashboard");
                        }
                      }}
                      className={clsx(
                        "flex items-center gap-2 px-3 py-2 text-sm",
                        shellTheme.primaryText,
                        shellTheme.hoverBg,
                      )}
                    >
                      <div
                        className={clsx(
                          "flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold",
                          shellTheme.chip,
                        )}
                      >
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{project.name}</span>
                      {project.slug === activeProject?.slug && (
                        <span className="ml-auto text-[var(--od-accent)]">
                          ✓
                        </span>
                      )}
                    </Link>
                  ))}
                </>
              )}
              <div className={clsx("my-1 border-t", shellTheme.divider)} />
              <Link
                href="/dashboard/new-project"
                onClick={() => {
                  setOrgDropdownOpen(false);
                  onCloseMobile?.();
                }}
                className={clsx(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm",
                  shellTheme.secondaryText,
                  shellTheme.hoverBg,
                  shellTheme.hoverText,
                )}
              >
                <Plus size={14} />
                New documentation
              </Link>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {mainNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onCloseMobile?.()}
              className={clsx(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                isActive(pathname, item.href)
                  ? `${shellTheme.active} font-medium`
                  : [
                      shellTheme.secondaryText,
                      shellTheme.hoverBg,
                      shellTheme.hoverText,
                    ],
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}

          <div className="pt-4">
            <p
              className={clsx(
                "px-2 pb-1.5 text-[11px] font-medium uppercase",
                shellTheme.secondaryText,
              )}
            >
              Agents
            </p>
            {agentNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onCloseMobile?.()}
                className={clsx(
                  "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                  isActive(pathname, item.href)
                    ? `${shellTheme.active} font-medium`
                    : [
                        shellTheme.secondaryText,
                        shellTheme.hoverBg,
                        shellTheme.hoverText,
                      ],
                )}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={clsx(
                      "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      shellTheme.badge,
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </nav>

        <div className="px-3 pb-3">
          <Link
            href="/products/workflows"
            onClick={() => onCloseMobile?.()}
            className="block rounded-lg border border-[var(--od-border)] bg-[var(--od-panel-muted)] p-3 transition-colors hover:bg-[var(--od-panel-raised)]"
          >
            <div
              className={clsx("text-xs font-medium", shellTheme.primaryText)}
            >
              Workflows
            </div>
            <div className={clsx("mt-1 text-xs", shellTheme.secondaryText)}>
              Control when the agent takes autonomous actions
            </div>
            <div className="mt-2 text-xs font-medium text-[var(--od-accent)]">
              Check it out
            </div>
          </Link>
        </div>

        <div className={clsx("border-t px-3 py-3", shellTheme.divider)}>
          {isMobile ? (
            <button
              type="button"
              onClick={onCloseMobile}
              className={clsx(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                shellTheme.secondaryText,
                shellTheme.hoverBg,
                shellTheme.hoverText,
              )}
              aria-label="Close sidebar"
            >
              <X size={18} />
              <span>Close</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={clsx(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                shellTheme.secondaryText,
                shellTheme.hoverBg,
                shellTheme.hoverText,
              )}
              aria-label="Collapse sidebar"
            >
              <PanelLeft size={18} />
              <span>Collapse</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
