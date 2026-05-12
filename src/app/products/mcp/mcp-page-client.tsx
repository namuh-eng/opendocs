"use client";

import { getMcpServerUrl, getMcpTools } from "@/lib/mcp";
import { Check, Copy, ExternalLink, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function McpPageClient({ projectSlug }: { projectSlug: string }) {
  const mcpUrl = getMcpServerUrl(projectSlug);
  const tools = getMcpTools(projectSlug);
  const [copied, setCopied] = useState(false);
  const [searches, setSearches] = useState<
    Array<{ query: string; createdAt: string }>
  >([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics/searches?trafficSource=agent");
      if (res.ok) {
        const data = await res.json();
        setSearches(data.entries?.slice(0, 5) ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch MCP analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(mcpUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [mcpUrl]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      {/* Breadcrumb + Beta badge */}
      <div className="flex items-center gap-2 text-sm text-[var(--od-text-muted)]">
        <span>Agents</span>
        <span>/</span>
        <span className="font-medium text-[var(--od-text)]">MCP</span>
        <span className="ml-1 rounded bg-[var(--od-accent-soft)] px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--od-accent-text)]">
          Beta
        </span>
      </div>

      {/* Hosted MCP server */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[var(--od-text)]">
          Hosted MCP server
        </h2>
        <div className="flex items-center gap-3">
          <p className="text-sm text-[var(--od-text-muted)]">
            Access your MCP server and preview available tools
          </p>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-medium border border-emerald-500/20">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
        </div>
        <a
          href="https://mintlify.com/docs/mcp"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-[var(--od-accent)] hover:text-[var(--od-accent-strong)]"
        >
          Learn more
          <ExternalLink size={14} />
        </a>

        {/* URL bar */}
        <div className="flex items-center gap-0 overflow-hidden rounded-lg border border-[var(--od-border)] bg-[var(--od-panel)] shadow-[var(--od-shadow)]">
          <span className="shrink-0 border-r border-[var(--od-border)] bg-[var(--od-panel-muted)] px-3 py-2 text-sm text-[var(--od-text-muted)]">
            https://
          </span>
          <input
            readOnly
            value={`${projectSlug}.mintlify.app/mcp`}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-[var(--od-text)] outline-none"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 border-l border-[var(--od-border)] px-4 py-2 text-sm font-medium text-[var(--od-text-muted)] transition-colors hover:bg-[var(--od-panel-muted)] hover:text-[var(--od-text)] flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-[var(--od-text-subtle)]">
          Use the above URL to connect AI applications to your content
        </p>
      </section>

      {/* Available tools */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--od-text)]">
            Available tools
          </h2>
          <p className="mt-1 text-sm text-[var(--od-text-muted)]">
            Tools exposed to connected AI clients
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="rounded-lg border border-[var(--od-border)] bg-[var(--od-panel)] shadow-[var(--od-shadow)] p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--od-text-muted)]" />
                <span className="font-mono text-sm font-semibold text-[var(--od-text)]">
                  {tool.name}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--od-text-muted)]">
                {tool.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Analytics integrated into MCP dashboard */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--od-text)]">
            Recent activity
          </h2>
          <p className="mt-1 text-sm text-[var(--od-text-muted)]">
            Monitor search requests processed via MCP
          </p>
        </div>

        {loadingAnalytics ? (
          <div className="h-24 rounded-lg border border-dashed border-[var(--od-border)] animate-pulse bg-[var(--od-panel-muted)]" />
        ) : searches.length > 0 ? (
          <div className="rounded-lg border border-[var(--od-border)] bg-[var(--od-panel)] shadow-[var(--od-shadow)] overflow-hidden">
            <div className="divide-y divide-[var(--od-border-light)]">
              {searches.map((s) => (
                <div
                  key={`${s.createdAt}:${s.query}`}
                  className="px-4 py-3 text-sm flex items-center justify-between"
                >
                  <span className="truncate max-w-[400px] font-mono text-xs text-[var(--od-text-muted)]">
                    {s.query}
                  </span>
                  <span className="text-[11px] text-[var(--od-text-subtle)]">
                    {new Date(s.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--od-border)] p-8 text-center bg-[var(--od-panel-muted)]">
            <p className="text-sm text-[var(--od-text-subtle)]">
              No recent MCP activity recorded
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
