"use client";

import type { ConnectedRepo } from "@/lib/agent-settings";
import { clsx } from "clsx";
import { Bot, ExternalLink, GitBranch, Loader2, Shield, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface AgentSettingsState {
  agentEnabled: boolean;
  slackConnected: boolean;
  slackWorkspace: string | null;
  githubAppInstalled: boolean;
  connectedRepos: ConnectedRepo[];
}

interface AgentSettingsClientProps {
  initialPlan: string;
  initialSettings: AgentSettingsState;
}

function GitHubIcon({
  size = 20,
  className,
}: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function SlackIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  );
}

export function AgentSettingsClient({
  initialPlan,
  initialSettings,
}: AgentSettingsClientProps) {
  const [plan] = useState(initialPlan);
  const [settings, setSettings] = useState<AgentSettingsState>(initialSettings);
  const [loading, setLoading] = useState(false);
  const [showLinearPromo, setShowLinearPromo] = useState(true);

  const canEnable = plan === "pro" || plan === "enterprise";
  const isEnabled = settings.agentEnabled;

  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const handleToggleAgent = async () => {
    if (!canEnable && !isEnabled) return;
    setLoading(true);
    try {
      const res = await fetch("/api/agent/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentEnabled: !isEnabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full" data-testid="agent-settings-page">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Page header */}
        <div className="px-6 py-5 border-b border-white/[0.06]">
          <h1 className="text-xl font-semibold text-white">Agent</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Configure your AI agent integrations
          </p>
        </div>

        <div className="px-6 py-6 space-y-8 max-w-3xl">
          {/* Enable Agent section */}
          <section data-testid="enable-agent-section">
            <div className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-600/10 flex items-center justify-center">
                  <Bot size={24} className="text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Enable the Agent
                  </h2>
                  <p className="text-sm text-gray-400">
                    Enable the agent to keep your docs up-to-date by leveraging
                    AI
                  </p>
                </div>
              </div>

              {canEnable ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleToggleAgent}
                    disabled={loading}
                    className={clsx(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      isEnabled ? "bg-emerald-600" : "bg-gray-600",
                      loading && "opacity-50 cursor-not-allowed",
                    )}
                    data-testid="agent-toggle"
                    aria-label={isEnabled ? "Disable agent" : "Enable agent"}
                  >
                    <span
                      className={clsx(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        isEnabled ? "translate-x-6" : "translate-x-1",
                      )}
                    />
                  </button>
                  <span className="text-sm text-gray-300">
                    {loading ? (
                      <Loader2 size={14} className="animate-spin inline" />
                    ) : isEnabled ? (
                      "Agent enabled"
                    ) : (
                      "Agent disabled"
                    )}
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-white hover:bg-white/[0.08] transition-colors"
                    data-testid="upgrade-plan-btn"
                  >
                    Upgrade plan
                  </button>
                  <a
                    href="/docs/agent"
                    className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
                    data-testid="learn-more-link"
                  >
                    Learn more
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* Slack Connection section */}
          <section data-testid="slack-section">
            <h2 className="text-lg font-medium text-white mb-1">
              Slack Connection
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Connect your Slack workspace to receive agent notifications
            </p>
            <div className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center">
                  <SlackIcon className="w-5 h-5 text-gray-300" />
                </div>
                <div className="flex-1">
                  {settings.slackConnected && settings.slackWorkspace ? (
                    <>
                      <p className="text-sm font-medium text-white">
                        Connected to {settings.slackWorkspace}
                      </p>
                      <p className="text-xs text-gray-500">
                        Agent notifications are active
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">
                      No Slack workspace connected
                    </p>
                  )}
                </div>
                <span
                  className={clsx(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                    settings.slackConnected
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-gray-500/10 text-gray-400 border-gray-500/20",
                  )}
                  data-testid="slack-status-badge"
                >
                  {settings.slackConnected ? "Connected" : "Not connected"}
                </span>
              </div>
              {!settings.slackConnected && (
                <button
                  type="button"
                  className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
                  data-testid="connect-slack-btn"
                >
                  Connect Slack workspace
                </button>
              )}
            </div>
          </section>

          {/* GitHub App section */}
          <section data-testid="github-section">
            <h2 className="text-lg font-medium text-white mb-1">GitHub App</h2>
            <p className="text-sm text-gray-400 mb-4">
              Enable repository access for the agent to create pull requests
            </p>
            <div className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center">
                    <GitHubIcon size={20} className="text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {settings.githubAppInstalled
                        ? "GitHub App installed"
                        : "GitHub App"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {settings.githubAppInstalled
                        ? `${settings.connectedRepos.length} repo${settings.connectedRepos.length !== 1 ? "s" : ""} connected`
                        : "Not installed"}
                    </p>
                  </div>
                </div>
                <a
                  href="/docs/agent"
                  className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1"
                  data-testid="configure-github-link"
                >
                  Configure GitHub app
                  <ExternalLink size={14} />
                </a>
              </div>

              {settings.githubAppInstalled &&
              settings.connectedRepos.length > 0 ? (
                <div
                  className="border-t border-white/[0.06] pt-4"
                  data-testid="connected-repos-list"
                >
                  <div className="space-y-3">
                    {settings.connectedRepos.map((repo) => (
                      <div
                        key={`${repo.org}/${repo.repo}`}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03]"
                        data-testid="connected-repo-item"
                      >
                        <div className="flex items-center gap-3">
                          <GitHubIcon size={16} className="text-gray-500" />
                          <span className="text-sm font-medium text-white">
                            {repo.org}/{repo.repo}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                            <GitBranch size={12} />
                            {repo.branch}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Shield size={10} />
                            {repo.permissions}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : !settings.githubAppInstalled ? (
                <button
                  type="button"
                  className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
                  data-testid="install-github-btn"
                >
                  Install the GitHub app
                </button>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      {/* Sidebar — Linear Agent promo */}
      {showLinearPromo && (
        <div className="hidden lg:block w-72 border-l border-white/[0.06] p-4">
          <div
            className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-4 relative"
            data-testid="linear-promo-card"
          >
            <button
              type="button"
              onClick={() => setShowLinearPromo(false)}
              className="absolute top-3 right-3 p-1 rounded-md hover:bg-white/[0.06] text-gray-500 hover:text-white transition-colors"
              aria-label="Dismiss"
              data-testid="dismiss-linear-promo"
            >
              <X size={14} />
            </button>

            <div className="w-full h-24 rounded-lg bg-gradient-to-br from-indigo-600/20 to-purple-600/20 flex items-center justify-center mb-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Bot size={20} className="text-indigo-400" />
              </div>
            </div>

            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 mb-2">
              New
            </span>
            <h3 className="text-sm font-semibold text-white mb-1">
              Linear Agent
            </h3>
            <p className="text-xs text-gray-400 mb-3">
              Manage your docs directly from your Linear workspace
            </p>
            <a
              href="/docs/agent"
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1"
              data-testid="configure-linear-link"
            >
              Configure Linear
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
