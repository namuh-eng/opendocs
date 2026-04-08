import {
  buildQuickActionCards,
  buildSiteUrl,
  formatDomainDisplay,
  projectStatusSummary,
} from "@/lib/dashboard";
import { describe, expect, it } from "vitest";

describe("buildQuickActionCards", () => {
  it("returns 4 quick action cards", () => {
    const cards = buildQuickActionCards("proj-123");
    expect(cards).toHaveLength(4);
  });

  it("includes open-editor card linking to /editor/main", () => {
    const cards = buildQuickActionCards("proj-123");
    const editor = cards.find((c) => c.id === "open-editor");
    expect(editor).toBeDefined();
    expect(editor?.href).toBe("/editor/main");
    expect(editor?.icon).toBe("edit");
    expect(editor?.title).toBe("Open editor");
  });

  it("includes view-site card with globe icon", () => {
    const cards = buildQuickActionCards("proj-123");
    const site = cards.find((c) => c.id === "view-site");
    expect(site).toBeDefined();
    expect(site?.icon).toBe("globe");
  });

  it("includes analytics card linking to /analytics", () => {
    const cards = buildQuickActionCards("proj-123");
    const analytics = cards.find((c) => c.id === "analytics");
    expect(analytics).toBeDefined();
    expect(analytics?.href).toBe("/analytics");
    expect(analytics?.icon).toBe("bar-chart");
  });

  it("includes settings card linking to /settings/deployment/general", () => {
    const cards = buildQuickActionCards("proj-123");
    const settings = cards.find((c) => c.id === "settings");
    expect(settings).toBeDefined();
    expect(settings?.href).toBe("/settings/deployment/general");
    expect(settings?.icon).toBe("settings");
  });

  it("each card has title and description", () => {
    const cards = buildQuickActionCards("proj-123");
    for (const card of cards) {
      expect(card.title.length).toBeGreaterThan(0);
      expect(card.description.length).toBeGreaterThan(0);
    }
  });
});

describe("buildSiteUrl", () => {
  it("returns custom domain URL with https when available", () => {
    expect(buildSiteUrl("my-sub", "docs.example.com")).toBe(
      "https://docs.example.com",
    );
  });

  it("returns /docs/{subdomain} when no custom domain", () => {
    expect(buildSiteUrl("my-sub", null)).toBe("/docs/my-sub");
  });

  it("prefers custom domain over subdomain", () => {
    expect(buildSiteUrl("my-sub", "docs.example.com")).toBe(
      "https://docs.example.com",
    );
  });

  it("returns # when neither is set", () => {
    expect(buildSiteUrl(null, null)).toBe("#");
  });
});

describe("formatDomainDisplay", () => {
  it("returns custom domain as-is", () => {
    expect(formatDomainDisplay("sub", "docs.example.com")).toBe(
      "docs.example.com",
    );
  });

  it("appends .mintlify.app to subdomain", () => {
    expect(formatDomainDisplay("my-project", null)).toBe(
      "my-project.mintlify.app",
    );
  });

  it("returns empty string when nothing set", () => {
    expect(formatDomainDisplay(null, null)).toBe("");
  });
});

describe("projectStatusSummary", () => {
  it("returns deploying message when status is deploying", () => {
    expect(projectStatusSummary("deploying", "Update docs", "2026-01-01")).toBe(
      "Deployment in progress...",
    );
  });

  it("returns deployment message when available", () => {
    expect(
      projectStatusSummary("active", "Added API docs", "2026-01-01T12:00:00Z"),
    ).toBe("Added API docs");
  });

  it("returns no deployments when no message or time", () => {
    expect(projectStatusSummary("active", null, null)).toBe(
      "No deployments yet",
    );
  });

  it("returns no deployments when message exists but no time", () => {
    expect(projectStatusSummary("active", "Something", null)).toBe(
      "No deployments yet",
    );
  });
});
