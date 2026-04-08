import {
  DEFAULT_ADVANCED,
  DEFAULT_DOCS_CONFIG,
  type DocsConfig,
  mergeDocsConfig,
  validateDocsConfig,
} from "@/lib/docs-config";
import { describe, expect, it } from "vitest";

describe("Custom CSS and JS in AdvancedConfig", () => {
  it("defaults customCSS and customJS to empty strings", () => {
    expect(DEFAULT_ADVANCED.customCSS).toBe("");
    expect(DEFAULT_ADVANCED.customJS).toBe("");
  });

  it("includes customCSS and customJS in DEFAULT_DOCS_CONFIG", () => {
    expect(DEFAULT_DOCS_CONFIG.advanced.customCSS).toBe("");
    expect(DEFAULT_DOCS_CONFIG.advanced.customJS).toBe("");
  });

  it("mergeDocsConfig preserves customCSS value", () => {
    const result = mergeDocsConfig({
      advanced: { customCSS: "body { color: red; }" },
    });
    expect(result.advanced.customCSS).toBe("body { color: red; }");
    // other defaults preserved
    expect(result.advanced.seoTitle).toBe("");
    expect(result.advanced.customJS).toBe("");
  });

  it("mergeDocsConfig preserves customJS value", () => {
    const result = mergeDocsConfig({
      advanced: { customJS: "console.log('hello');" },
    });
    expect(result.advanced.customJS).toBe("console.log('hello');");
    expect(result.advanced.customCSS).toBe("");
  });

  it("mergeDocsConfig preserves both customCSS and customJS", () => {
    const css = ".header { background: #000; }";
    const js = "window.gtag('config', 'G-123');";
    const result = mergeDocsConfig({
      advanced: { customCSS: css, customJS: js },
    });
    expect(result.advanced.customCSS).toBe(css);
    expect(result.advanced.customJS).toBe(js);
  });

  it("validates config with customCSS and customJS successfully", () => {
    const config: DocsConfig = {
      ...DEFAULT_DOCS_CONFIG,
      advanced: {
        ...DEFAULT_ADVANCED,
        customCSS: "h1 { font-size: 3rem; }",
        customJS: "console.log('loaded');",
      },
    };
    const result = validateDocsConfig(config);
    expect(result.valid).toBe(true);
  });

  it("export/import round-trips customCSS and customJS", async () => {
    const { exportDocsConfigJson, importDocsConfigJson } = await import(
      "@/lib/docs-config"
    );
    const config: DocsConfig = {
      ...DEFAULT_DOCS_CONFIG,
      advanced: {
        ...DEFAULT_ADVANCED,
        customCSS: ".custom { color: blue; }",
        customJS: "alert('hi');",
      },
    };
    const json = exportDocsConfigJson(config);
    const imported = importDocsConfigJson(json);
    expect(imported.ok).toBe(true);
    if (imported.ok) {
      expect(imported.config.advanced.customCSS).toBe(
        ".custom { color: blue; }",
      );
      expect(imported.config.advanced.customJS).toBe("alert('hi');");
    }
  });

  it("mergeDocsConfig defaults customCSS/customJS when not in partial", () => {
    const result = mergeDocsConfig({ advanced: { seoTitle: "My Title" } });
    expect(result.advanced.seoTitle).toBe("My Title");
    expect(result.advanced.customCSS).toBe("");
    expect(result.advanced.customJS).toBe("");
  });

  it("handles multiline CSS", () => {
    const multilineCss = `
.docs-layout {
  --primary: #ff6600;
}
h1 {
  color: var(--primary);
}`;
    const result = mergeDocsConfig({ advanced: { customCSS: multilineCss } });
    expect(result.advanced.customCSS).toBe(multilineCss);
  });

  it("handles multiline JS with analytics snippet", () => {
    const analyticsJs = `
(function(w,d,s,l,i){
  w[l]=w[l]||[];
  w[l].push({'gtm.start': new Date().getTime()});
})(window,document,'script','dataLayer','GTM-XXXX');`;
    const result = mergeDocsConfig({ advanced: { customJS: analyticsJs } });
    expect(result.advanced.customJS).toBe(analyticsJs);
  });
});
