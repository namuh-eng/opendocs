import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LandingView } from "@/components/landing/landing-view";

// React 19 requires this flag for act() in non-testing-library environments.
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

function renderLanding() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(<LandingView fontClassName="test-fonts" />);
  });
  return container;
}

describe("landing view (warm craft)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    // Unmount so React's scheduler does not run after jsdom teardown.
    act(() => {
      root?.unmount();
      root = null;
    });
  });

  it("renders the hero headline and CTAs", () => {
    const container = renderLanding();
    expect(container.querySelector("h1")?.textContent).toContain(
      "Documentation that",
    );
    expect(container.querySelector('a[href="/onboarding"]')).not.toBeNull();
    expect(container.querySelector('a[href="/dashboard"]')).not.toBeNull();
    expect(container.querySelector('a[href="/login"]')).not.toBeNull();
  });

  it("applies the font class to the themed root", () => {
    const container = renderLanding();
    const root = container.querySelector("main");
    expect(root?.className).toContain("lp-home");
    expect(root?.className).toContain("test-fonts");
  });

  it("includes the rethemed dashboard mock", () => {
    const container = renderLanding();
    expect(container.textContent).toContain("Recent deployments");
    expect(container.textContent).toContain("acme-docs");
    expect(container.textContent).toContain("Ask AI");
  });

  it("covers the four core features", () => {
    const container = renderLanding();
    for (const feature of [
      "MDX Docs & API Reference",
      "Deployment Previews",
      "Ask-AI Assistant",
      "Analytics & Search",
    ]) {
      expect(container.textContent).toContain(feature);
    }
  });

  it("links public marketing navigation to real routes or page sections", () => {
    const container = renderLanding();
    const links = Array.from(container.querySelectorAll("a")).map((link) => ({
      href: link.getAttribute("href"),
      text: link.textContent?.replace(/\s+/g, " ").trim(),
    }));

    expect(links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: "/docs", text: "Docs" }),
        expect.objectContaining({ href: "/pricing", text: "Pricing" }),
        expect.objectContaining({ href: "/changelog", text: "Changelog" }),
        expect.objectContaining({ href: "/privacy", text: "Privacy" }),
        expect.objectContaining({ href: "/terms", text: "Terms" }),
        expect.objectContaining({ href: "/security", text: "Security" }),
      ]),
    );

    for (const label of [
      "Features",
      "Roadmap",
      "API Reference",
      "SDK",
      "Webhooks",
      "About",
      "Status",
    ]) {
      const link = links.find((candidate) => candidate.text === label);
      expect(link?.href, `${label} should not be a dead home link`).not.toBe(
        "/",
      );
    }
  });
});
