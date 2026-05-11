"use client";

import { useEffect, useState } from "react";
import {
  type DashboardTheme,
  applyDashboardTheme,
  getStoredDashboardTheme,
  getStoredSidebarCollapsed,
  setStoredSidebarCollapsed,
} from "./shell-preferences";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { TrialBanner } from "./trial-banner";

interface ProjectInfo {
  id: string;
  name: string;
  slug: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  orgName: string;
  orgSlug: string;
  userName?: string;
  userEmail?: string;
  userImage?: string;
  projects?: ProjectInfo[];
  activeProjectId?: string;
}

export function DashboardLayoutClient({
  children,
  orgName,
  orgSlug,
  userName,
  userEmail,
  userImage,
  projects = [],
  activeProjectId,
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [theme, setTheme] = useState<DashboardTheme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 1023px)");

    const handleViewport = (event?: MediaQueryListEvent) => {
      const matches = event?.matches ?? mediaQuery.matches;
      setIsMobile(matches);
      setMobileSidebarOpen(false);
    };

    setSidebarCollapsed(getStoredSidebarCollapsed());
    setTheme(getStoredDashboardTheme());
    handleViewport();

    mediaQuery.addEventListener("change", handleViewport);
    return () => mediaQuery.removeEventListener("change", handleViewport);
  }, []);

  useEffect(() => {
    setResolvedTheme(applyDashboardTheme(theme));

    if (typeof window === "undefined" || theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = () => {
      setResolvedTheme(applyDashboardTheme("system"));
    };

    mediaQuery.addEventListener("change", handleThemeChange);
    return () => mediaQuery.removeEventListener("change", handleThemeChange);
  }, [theme]);

  const handleToggleDesktopSidebar = () => {
    const nextCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(nextCollapsed);
    if (!isMobile) {
      setStoredSidebarCollapsed(nextCollapsed);
    }
  };

  return (
    <div className="od-app-shell flex min-h-screen">
      <Sidebar
        orgName={orgName}
        orgSlug={orgSlug}
        collapsed={sidebarCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileSidebarOpen}
        theme={resolvedTheme}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onToggleCollapse={handleToggleDesktopSidebar}
        projects={projects}
        activeProjectId={activeProjectId}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TrialBanner theme={resolvedTheme} />
        <TopBar
          theme={theme}
          resolvedTheme={resolvedTheme}
          onThemeChange={setTheme}
          onToggleSidebar={() => setMobileSidebarOpen((current) => !current)}
          showMobileSidebarToggle={isMobile}
          userName={userName}
          userEmail={userEmail}
          userImage={userImage}
        />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
