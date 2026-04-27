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
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <span>Agents</span>
        <span>/</span>
        <span className="text-white font-medium">MCP</span>
        <span className="ml-1 rounded bg-emerald-600/20 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
          Beta
        </span>
      </div>

      {/* Hosted MCP server */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Hosted MCP server</h2>
        <div className="flex items-center gap-3">
          <p className="text-sm text-zinc-400">
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
          className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300"
        >
          Learn more
          <ExternalLink size={14} />
        </a>

        {/* URL bar */}
        <div className="flex items-center gap-0 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800/60">
          <span className="shrink-0 border-r border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-400">
            https://
          </span>
          <input
            readOnly
            value={`${projectSlug}.mintlify.app/mcp`}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-zinc-200 outline-none"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 border-l border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-colors flex items-center gap-1.5"
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
        <p className="text-xs text-zinc-500">
          Use the above URL to connect AI applications to your content
        </p>
      </section>

      {/* Available tools */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Available tools</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Tools exposed to connected AI clients
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={16} className="text-zinc-400" />
                <span className="font-mono text-sm font-semibold text-white">
                  {tool.name}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-zinc-400">
                {tool.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Analytics integrated into MCP dashboard */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Recent activity</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Monitor search requests processed via MCP
          </p>
        </div>

        {loadingAnalytics ? (
          <div className="h-24 rounded-lg border border-dashed border-zinc-700 animate-pulse bg-zinc-800/20" />
        ) : searches.length > 0 ? (
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/20 overflow-hidden">
            <div className="divide-y divide-zinc-700/50">
              {searches.map((s) => (
                <div
                  key={`${s.createdAt}:${s.query}`}
                  className="px-4 py-3 text-sm flex items-center justify-between"
                >
                  <span className="text-zinc-300 truncate max-w-[400px] font-mono text-xs">
                    {s.query}
                  </span>
                  <span className="text-zinc-500 text-[11px]">
                    {new Date(s.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-700 p-8 text-center bg-zinc-800/10">
            <p className="text-sm text-zinc-500">
              No recent MCP activity recorded
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
