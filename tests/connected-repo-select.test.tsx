import { ConnectedRepoSelect } from "@/components/github/connected-repo-select";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

describe("ConnectedRepoSelect", () => {
  it("uses readable theme colors for the empty connected repos notice", () => {
    const html = renderToStaticMarkup(
      <ConnectedRepoSelect repos={[]} value="" onChange={vi.fn()} />,
    );

    expect(html).toContain('data-testid="empty-connected-repos-notice"');
    expect(html).toContain("No connected GitHub repositories yet");
    expect(html).toContain("color:var(--od-text)");
    expect(html).toContain("background:var(--od-warning-soft)");
    expect(html).not.toContain("text-amber-200");
  });
});
