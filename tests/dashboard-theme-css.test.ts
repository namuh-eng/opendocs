import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";

const globalsCss = readFileSync("src/app/globals.css", "utf8");
const mcpPageSource = readFileSync(
  "src/app/products/mcp/mcp-page-client.tsx",
  "utf8",
);
const dashboardCss = globalsCss.slice(
  globalsCss.indexOf(":root"),
  globalsCss.indexOf("/* ── Docs Site Layout"),
);

function injectDashboardCss() {
  const style = document.createElement("style");
  style.textContent = dashboardCss;
  document.head.append(style);
}

function matchedDeclaration(element: Element, property: string) {
  const values: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    for (const rule of Array.from(sheet.cssRules)) {
      if (!(rule instanceof CSSStyleRule)) continue;

      try {
        if (element.matches(rule.selectorText)) {
          const value = rule.style.getPropertyValue(property).trim();
          if (value) values.push(value);
        }
      } catch {
        // Ignore selectors unsupported by jsdom; they are not part of this
        // behavior check.
      }
    }
  }

  return values.at(-1);
}

describe("dashboard shell theme CSS", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("applies od-token surface utilities to rendered dashboard elements", () => {
    injectDashboardCss();
    document.body.innerHTML = `
      <main class="od-app-shell">
        <section data-testid="card" class="od-card">
          <p data-testid="muted" class="od-muted">Muted copy</p>
        </section>
        <table>
          <thead>
            <tr data-testid="table-head" class="od-table-head"></tr>
          </thead>
          <tbody>
            <tr data-testid="row" class="od-row-divider"></tr>
          </tbody>
        </table>
      </main>
    `;

    const card = document.querySelector("[data-testid='card']");
    const muted = document.querySelector("[data-testid='muted']");
    const tableHead = document.querySelector("[data-testid='table-head']");
    const row = document.querySelector("[data-testid='row']");

    expect(card).not.toBeNull();
    expect(matchedDeclaration(card as Element, "background")).toBe(
      "var(--od-panel)",
    );
    expect(matchedDeclaration(card as Element, "border")).toBe(
      "1px solid var(--od-border)",
    );
    expect(muted).not.toBeNull();
    expect(getComputedStyle(muted as Element).color).toBe(
      "var(--od-text-muted)",
    );
    expect(tableHead).not.toBeNull();
    expect(matchedDeclaration(tableHead as Element, "background")).toBe(
      "var(--od-panel-muted)",
    );
    expect(row).not.toBeNull();
    expect(matchedDeclaration(row as Element, "border-color")).toBe(
      "var(--od-border)",
    );
  });

  it("keeps remaining legacy dark utility bridge behavior scoped to old classes", () => {
    injectDashboardCss();
    document.body.innerHTML = `
      <main class="od-app-shell">
        <section
          data-testid="legacy-card"
          class="bg-[#0c0c0c] border-white/[0.08] text-white"
        >
          Legacy surface
        </section>
      </main>
    `;

    const legacyCard = document.querySelector("[data-testid='legacy-card']");

    expect(legacyCard).not.toBeNull();
    expect(matchedDeclaration(legacyCard as Element, "background-color")).toBe(
      "var(--od-panel)",
    );
    expect(matchedDeclaration(legacyCard as Element, "border-color")).toBe(
      "var(--od-border)",
    );
    expect(getComputedStyle(legacyCard as Element).color).toBe(
      "var(--od-text)",
    );
  });

  it("does not keep zinc compatibility selectors after migrating the MCP surface", () => {
    expect(globalsCss).not.toMatch(/\.od-app-shell \.bg-zinc-/);
    expect(globalsCss).not.toMatch(/\.od-app-shell \.border-zinc-/);
    expect(globalsCss).not.toMatch(/\.od-app-shell \.divide-zinc-/);
    expect(globalsCss).not.toMatch(/\.od-app-shell \.text-zinc-/);
    expect(globalsCss).not.toMatch(/\.od-app-shell \.hover\\:bg-zinc-/);
    expect(mcpPageSource).not.toMatch(/\bzinc-/);
  });
});
