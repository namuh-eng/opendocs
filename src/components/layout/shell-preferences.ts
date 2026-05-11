"use client";

import {
  ACTIVE_PROJECT_COOKIE,
  ACTIVE_PROJECT_STORAGE_KEY,
} from "@/lib/active-project";

export type DashboardTheme = "system" | "light" | "dark";
export type ResolvedDashboardTheme = "light" | "dark";

const THEME_KEY = "dashboard-theme";
const SIDEBAR_KEY = "dashboard-sidebar-collapsed";
const TRIAL_BANNER_KEY = "dashboard-trial-banner-dismissed";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readBoolean(key: string, fallback = false): boolean {
  const storage = getStorage();
  if (!storage) return fallback;

  return storage.getItem(key) === "true";
}

function writeBoolean(key: string, value: boolean): void {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(key, String(value));
}

export function getStoredDashboardTheme(): DashboardTheme {
  const storage = getStorage();
  const stored = storage?.getItem(THEME_KEY);

  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }

  return "light";
}

export function setStoredDashboardTheme(theme: DashboardTheme): void {
  const storage = getStorage();
  if (!storage) return;

  storage.setItem(THEME_KEY, theme);
}

export function resolveDashboardTheme(
  theme: DashboardTheme,
): ResolvedDashboardTheme {
  if (theme !== "system") return theme;

  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

export function applyDashboardTheme(
  theme: DashboardTheme,
): ResolvedDashboardTheme {
  const resolvedTheme = resolveDashboardTheme(theme);

  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.classList.toggle(
      "light",
      resolvedTheme === "light",
    );
  }

  return resolvedTheme;
}

export function getStoredSidebarCollapsed(): boolean {
  return readBoolean(SIDEBAR_KEY);
}

export function setStoredSidebarCollapsed(collapsed: boolean): void {
  writeBoolean(SIDEBAR_KEY, collapsed);
}

export function getStoredTrialBannerDismissed(): boolean {
  return readBoolean(TRIAL_BANNER_KEY);
}

export function setStoredTrialBannerDismissed(dismissed: boolean): void {
  writeBoolean(TRIAL_BANNER_KEY, dismissed);
}

export function getStoredActiveProjectId(): string | null {
  const storage = getStorage();
  const stored = storage?.getItem(ACTIVE_PROJECT_STORAGE_KEY);
  if (stored) {
    return stored;
  }

  if (typeof document === "undefined") {
    return null;
  }

  const activeCookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ACTIVE_PROJECT_COOKIE}=`));

  return activeCookie
    ? decodeURIComponent(activeCookie.split("=").slice(1).join("="))
    : null;
}

export function setStoredActiveProjectId(projectId: string): void {
  const storage = getStorage();
  storage?.setItem(ACTIVE_PROJECT_STORAGE_KEY, projectId);

  if (typeof document !== "undefined") {
    document.cookie = `${ACTIVE_PROJECT_COOKIE}=${encodeURIComponent(projectId)}; path=/; max-age=31536000; samesite=lax`;
  }
}
