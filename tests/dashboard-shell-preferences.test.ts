import {
  applyDashboardTheme,
  getStoredDashboardTheme,
  getStoredSidebarCollapsed,
  getStoredTrialBannerDismissed,
  resolveDashboardTheme,
  setStoredDashboardTheme,
  setStoredSidebarCollapsed,
  setStoredTrialBannerDismissed,
} from "@/components/layout/shell-preferences";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("dashboard shell preferences", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("dark"),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("defaults dashboard theme to light", () => {
    expect(getStoredDashboardTheme()).toBe("light");
  });

  it("persists dashboard theme selection", () => {
    setStoredDashboardTheme("light");
    expect(getStoredDashboardTheme()).toBe("light");
  });

  it("resolves system theme from prefers-color-scheme", () => {
    expect(resolveDashboardTheme("system")).toBe("dark");
    expect(resolveDashboardTheme("light")).toBe("light");
  });

  it("applies the resolved dashboard theme to the document root", () => {
    const resolved = applyDashboardTheme("system");

    expect(resolved).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("persists sidebar collapse preference", () => {
    expect(getStoredSidebarCollapsed()).toBe(false);
    setStoredSidebarCollapsed(true);
    expect(getStoredSidebarCollapsed()).toBe(true);
  });

  it("persists trial banner dismissal preference", () => {
    expect(getStoredTrialBannerDismissed()).toBe(false);
    setStoredTrialBannerDismissed(true);
    expect(getStoredTrialBannerDismissed()).toBe(true);
  });
});
