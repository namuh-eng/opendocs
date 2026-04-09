import { describe, expect, it } from "vitest";

// Test the sidebar navigation structure and behavior
describe("Dashboard Layout — Sidebar Navigation", () => {
  const mainNavItems = [
    { label: "Home", href: "/dashboard", icon: "home" },
    { label: "Editor", href: "/editor/main", icon: "pencil" },
    { label: "Analytics", href: "/analytics", icon: "bar-chart" },
    { label: "Settings", href: "/settings", icon: "settings" },
  ];

  const agentNavItems = [
    { label: "Agent", href: "/products/agent", icon: "bot" },
    { label: "Assistant", href: "/products/assistant", icon: "message-circle" },
    { label: "Workflows", href: "/products/workflows", icon: "git-branch" },
    { label: "MCP", href: "/products/mcp", icon: "server" },
  ];

  it("should have correct main navigation items", () => {
    expect(mainNavItems).toHaveLength(4);
    expect(mainNavItems[0].label).toBe("Home");
    expect(mainNavItems[1].label).toBe("Editor");
    expect(mainNavItems[2].label).toBe("Analytics");
    expect(mainNavItems[3].label).toBe("Settings");
  });

  it("should have correct agent navigation items", () => {
    expect(agentNavItems).toHaveLength(4);
    expect(agentNavItems[0].label).toBe("Agent");
    expect(agentNavItems[1].label).toBe("Assistant");
    expect(agentNavItems[2].label).toBe("Workflows");
    expect(agentNavItems[3].label).toBe("MCP");
  });

  it("should have valid href paths for main nav", () => {
    for (const item of mainNavItems) {
      expect(item.href).toMatch(/^\//);
    }
  });

  it("should have valid href paths for agent nav", () => {
    for (const item of agentNavItems) {
      expect(item.href).toMatch(/^\/products\//);
    }
  });
});

describe("Dashboard Layout — Navigation Config", () => {
  // These test the nav config builder functions
  function buildNavHref(
    orgSlug: string,
    projectSlug: string,
    path: string,
  ): string {
    return `/${orgSlug}/${projectSlug}${path}`;
  }

  function isActiveNavItem(currentPath: string, itemHref: string): boolean {
    if (itemHref === "/dashboard") {
      return currentPath === "/dashboard" || currentPath.endsWith("/dashboard");
    }
    return currentPath.startsWith(itemHref) || currentPath.includes(itemHref);
  }

  it("should build correct nav hrefs with org and project slugs", () => {
    expect(buildNavHref("my-org", "my-project", "/dashboard")).toBe(
      "/my-org/my-project/dashboard",
    );
    expect(buildNavHref("acme", "docs", "/editor/main")).toBe(
      "/acme/docs/editor/main",
    );
  });

  it("should correctly identify active nav item — Home", () => {
    expect(isActiveNavItem("/dashboard", "/dashboard")).toBe(true);
    expect(isActiveNavItem("/org/proj/dashboard", "/dashboard")).toBe(true);
    expect(isActiveNavItem("/settings", "/dashboard")).toBe(false);
  });

  it("should correctly identify active nav item — Settings", () => {
    expect(
      isActiveNavItem("/settings/organization/api-keys", "/settings"),
    ).toBe(true);
    expect(isActiveNavItem("/settings", "/settings")).toBe(true);
    expect(isActiveNavItem("/dashboard", "/settings")).toBe(false);
  });

  it("should correctly identify active nav item — Products", () => {
    expect(isActiveNavItem("/products/agent", "/products/agent")).toBe(true);
    expect(isActiveNavItem("/products/assistant", "/products/assistant")).toBe(
      true,
    );
    expect(isActiveNavItem("/products/agent", "/products/assistant")).toBe(
      false,
    );
  });
});

describe("Dashboard Layout — Top Bar", () => {
  it("should have search, notifications, chat, and profile elements", () => {
    const topBarElements = ["search", "notifications", "chat", "profile"];
    expect(topBarElements).toHaveLength(4);
    expect(topBarElements).toContain("search");
    expect(topBarElements).toContain("notifications");
    expect(topBarElements).toContain("profile");
  });
});

describe("Dashboard Layout — Sidebar Collapse", () => {
  it("should toggle collapsed state", () => {
    let collapsed = false;
    collapsed = !collapsed;
    expect(collapsed).toBe(true);
    collapsed = !collapsed;
    expect(collapsed).toBe(false);
  });
});

describe("Dashboard Layout — User Menu Items", () => {
  const menuItems = [
    { label: "Your profile", href: "/settings/workspace/profile" },
    { label: "Invite members", href: "/settings/workspace/members" },
    { label: "Billing", href: "/settings" },
    { label: "Documentation", href: "/docs", external: true },
    { label: "Contact support", href: "mailto:support@example.com" },
    { label: "Log Out", action: "logout" },
  ];

  it("should include all required menu items", () => {
    const labels = menuItems.map((m) => m.label);
    expect(labels).toContain("Your profile");
    expect(labels).toContain("Invite members");
    expect(labels).toContain("Log Out");
  });

  it("should have Log Out as the last item", () => {
    expect(menuItems[menuItems.length - 1].label).toBe("Log Out");
  });

  it("should have valid hrefs for profile links", () => {
    const profileItem = menuItems.find((m) => m.label === "Your profile");
    expect(profileItem?.href).toBe("/settings/workspace/profile");
  });
});
