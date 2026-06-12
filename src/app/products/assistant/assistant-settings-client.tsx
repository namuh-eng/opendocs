"use client";

import { clsx } from "clsx";
import {
  ArrowRight,
  Calendar,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type {
  AssistantSettingsData,
  AssistantUsageData,
} from "@/lib/assistant-settings";
import {
  formatBillingDate,
  formatCents,
  isValidDomain,
  MAX_STARTER_QUESTIONS,
  usagePercent,
} from "@/lib/assistant-settings";

interface Props {
  initialSettings: AssistantSettingsData;
  initialUsage: AssistantUsageData;
  initialTab: "general" | "billing";
}

function Toggle({
  checked,
  onChange,
  disabled,
  testId,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  testId?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={clsx(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-[var(--od-accent-strong)]" : "bg-[var(--od-border)]",
        disabled && "opacity-50 cursor-not-allowed",
      )}
      data-testid={testId}
      aria-label={label}
    >
      <span
        className={clsx(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

export function AssistantSettingsClient({
  initialSettings,
  initialUsage,
  initialTab,
}: Props) {
  const [tab, setTab] = useState<"general" | "billing">(initialTab);
  const [settings, setSettings] =
    useState<AssistantSettingsData>(initialSettings);
  const [usage, setUsage] = useState<AssistantUsageData>(initialUsage);
  const [saving, setSaving] = useState(false);
  const [deflectionEmail, setDeflectionEmail] = useState(
    initialSettings.deflectionEmail ?? "",
  );
  const [domainInput, setDomainInput] = useState("");
  const [domainError, setDomainError] = useState("");

  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setDeflectionEmail(data.settings.deflectionEmail ?? "");
      }
    } catch {
      // ignore
    }
  }, []);

  const refreshUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant/usage");
      if (res.ok) {
        const data = await res.json();
        setUsage(data.usage);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshSettings();
    refreshUsage();
  }, [refreshSettings, refreshUsage]);

  const updateSettings = async (updates: Partial<AssistantSettingsData>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/assistant/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setDeflectionEmail(data.settings.deflectionEmail ?? "");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = () => {
    const domain = domainInput.trim();
    if (!domain) return;
    if (!isValidDomain(domain)) {
      setDomainError("Please enter a valid domain");
      return;
    }
    if (settings.searchDomains.includes(domain)) {
      setDomainError("Domain already added");
      return;
    }
    setDomainError("");
    updateSettings({ searchDomains: [...settings.searchDomains, domain] });
    setDomainInput("");
  };

  const handleRemoveDomain = (domain: string) => {
    updateSettings({
      searchDomains: settings.searchDomains.filter((d) => d !== domain),
    });
  };

  const handleRemoveQuestion = (index: number) => {
    const updated = settings.starterQuestions.filter((_, i) => i !== index);
    updateSettings({ starterQuestions: updated });
  };

  const pct = usagePercent(usage.messagesUsed, usage.messageLimit);

  return (
    <div
      className="flex-1 overflow-y-auto"
      data-testid="assistant-settings-page"
    >
      {/* Usage stats bar */}
      <div className="px-6 pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div
            className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-5"
            data-testid="stat-monthly-spend"
          >
            <p className="text-sm text-gray-400 mb-1">Current monthly spend</p>
            <p className="text-3xl font-bold text-white">
              ${(usage.monthlyPrice / 100).toFixed(2).split(".")[0]}
              <span className="text-lg">
                .{(usage.monthlyPrice / 100).toFixed(2).split(".")[1]}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Calendar size={12} />
              {usage.billingCycleEnd
                ? `${formatBillingDate(usage.billingCycleEnd)} next renewal`
                : "May 5 next renewal"}
            </p>
          </div>

          <div
            className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-5"
            data-testid="stat-total-questions"
          >
            <p className="text-sm text-gray-400 mb-1">Total questions</p>
            <p className="text-3xl font-bold text-white">
              {usage.messagesUsed}
            </p>
            <p className="text-xs text-gray-500 mt-1">—</p>
          </div>

          <div
            className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-5"
            data-testid="stat-answered"
          >
            <p className="text-sm text-gray-400 mb-1">Answered properly</p>
            <p className="text-3xl font-bold text-white">
              {usage.messagesUsed}
            </p>
            <p className="text-xs text-gray-500 mt-1">—</p>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-5">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle size={16} className="text-gray-500" />
              <p className="text-sm text-gray-400">Not Answered</p>
            </div>
            <p className="text-3xl font-bold text-white">0</p>
            <p className="text-xs text-gray-500 mt-1">—</p>
          </div>
        </div>

        {/* Insights card */}
        <div
          className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-5 mb-6 max-w-md"
          data-testid="insights-card"
        >
          <MessageCircle size={20} className="text-gray-500 mb-2" />
          <p className="text-sm text-white font-medium">
            Get insights into your Assistant usage
          </p>
          <a
            href="/analytics/assistant"
            className="text-sm text-[var(--od-accent-strong)] hover:text-[var(--od-accent)] inline-flex items-center gap-1 mt-2"
            data-testid="view-more-link"
          >
            View more <ArrowRight size={14} />
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6">
        <div className="flex gap-1 mb-6" data-testid="assistant-tabs">
          <button
            type="button"
            onClick={() => setTab("general")}
            className={clsx(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              tab === "general"
                ? "bg-white/[0.1] text-white"
                : "text-gray-400 hover:text-white hover:bg-white/[0.05]",
            )}
            data-testid="tab-general"
          >
            General
          </button>
          <button
            type="button"
            onClick={() => setTab("billing")}
            className={clsx(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              tab === "billing"
                ? "bg-white/[0.1] text-white"
                : "text-gray-400 hover:text-white hover:bg-white/[0.05]",
            )}
            data-testid="tab-billing"
          >
            Billing
          </button>
        </div>

        {tab === "general" ? (
          <div className="space-y-8 max-w-2xl pb-12">
            {/* Status & Control */}
            <section data-testid="status-control-section">
              <h2 className="text-lg font-semibold text-white mb-1">
                Status & Control
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Manage your assistant&apos;s operational status
              </p>

              <div className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        Assistant Status
                      </span>
                      <span
                        className={clsx(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                          settings.enabled
                            ? "bg-[var(--od-sage-soft)] text-[var(--od-success)]"
                            : "bg-[var(--od-panel-muted)] text-[var(--od-text-muted)]",
                        )}
                        data-testid="assistant-status-badge"
                      >
                        <span
                          className={clsx(
                            "w-1.5 h-1.5 rounded-full",
                            settings.enabled
                              ? "bg-[var(--od-success)]"
                              : "bg-[var(--od-text-muted)]",
                          )}
                        />
                        {settings.enabled ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      Enable or disable your assistant.
                    </p>
                  </div>
                  <Toggle
                    checked={settings.enabled}
                    onChange={(val) => updateSettings({ enabled: val })}
                    disabled={saving}
                    testId="assistant-toggle"
                    label={
                      settings.enabled
                        ? "Disable assistant"
                        : "Enable assistant"
                    }
                  />
                </div>
              </div>
            </section>

            {/* Response Handling */}
            <section data-testid="response-handling-section">
              <h2 className="text-lg font-semibold text-white mb-1">
                Response Handling
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Configure how your assistant handles queries and searches
              </p>

              <div className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-5 space-y-5">
                {/* Deflection toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        Assistant Deflection
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--od-sage-soft)] text-[var(--od-success)]">
                        Recommended
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      Enable assistant to deflect questions with no responses to
                      your support team.
                    </p>
                  </div>
                  <Toggle
                    checked={settings.deflectionEnabled}
                    onChange={(val) =>
                      updateSettings({ deflectionEnabled: val })
                    }
                    disabled={saving}
                    testId="deflection-toggle"
                    label="Toggle deflection"
                  />
                </div>

                {/* Email input */}
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    type="email"
                    value={deflectionEmail}
                    onChange={(e) => setDeflectionEmail(e.target.value)}
                    placeholder="support@example.com"
                    className="w-full rounded-lg border border-[var(--od-border)] bg-[var(--od-panel)] py-2.5 pl-10 pr-3 text-sm text-[var(--od-text)] placeholder:text-[var(--od-text-subtle)] outline-none focus:border-[var(--od-accent)] focus:ring-1 focus:ring-[var(--od-accent)]"
                    data-testid="deflection-email-input"
                  />
                </div>

                {/* Help button checkbox */}
                <label
                  className="flex items-start gap-3 cursor-pointer"
                  data-testid="show-help-button-label"
                >
                  <input
                    type="checkbox"
                    checked={settings.showHelpButton}
                    onChange={(e) =>
                      updateSettings({ showHelpButton: e.target.checked })
                    }
                    className="mt-0.5 h-4 w-4 rounded border-[var(--od-border)] bg-transparent accent-[var(--od-accent-strong)] focus:ring-[var(--od-accent)]"
                    data-testid="show-help-button-checkbox"
                  />
                  <div>
                    <span className="text-sm font-medium text-white">
                      Show help button on AI chat
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Display the &quot;Contact support&quot; button to allow
                      users to email your support team
                    </p>
                  </div>
                </label>

                {/* Save deflection */}
                <button
                  type="button"
                  onClick={() =>
                    updateSettings({
                      deflectionEmail: deflectionEmail || null,
                    })
                  }
                  disabled={saving}
                  className="rounded-lg bg-[var(--od-accent-strong)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--od-accent-deep,#3d4ea4)] transition-colors disabled:opacity-50"
                  data-testid="save-deflection-btn"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin inline" />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </section>

            {/* Search Domains */}
            <section data-testid="search-domains-section">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Search Domains
                  </h2>
                  <p className="text-sm text-gray-400">
                    Restrict assistant search to specific domains
                  </p>
                </div>
                <Toggle
                  checked={settings.searchDomainsEnabled}
                  onChange={(val) =>
                    updateSettings({ searchDomainsEnabled: val })
                  }
                  disabled={saving}
                  testId="search-domains-toggle"
                  label="Toggle search domains"
                />
              </div>

              {settings.searchDomainsEnabled && (
                <div className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-5">
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={domainInput}
                      onChange={(e) => {
                        setDomainInput(e.target.value);
                        setDomainError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddDomain();
                      }}
                      placeholder="example.com"
                      className="flex-1 rounded-lg border border-[var(--od-border)] bg-[var(--od-panel)] py-2 px-3 text-sm text-[var(--od-text)] placeholder:text-[var(--od-text-subtle)] outline-none focus:border-[var(--od-accent)] focus:ring-1 focus:ring-[var(--od-accent)]"
                      data-testid="domain-input"
                    />
                    <button
                      type="button"
                      onClick={handleAddDomain}
                      className="rounded-lg bg-[var(--od-accent-strong)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--od-accent-deep,#3d4ea4)] transition-colors"
                      data-testid="add-domain-btn"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {domainError && (
                    <p
                      className="text-xs text-red-400 mb-2"
                      data-testid="domain-error"
                    >
                      {domainError}
                    </p>
                  )}
                  {settings.searchDomains.length > 0 && (
                    <div className="space-y-2" data-testid="domains-list">
                      {settings.searchDomains.map((domain) => (
                        <div
                          key={domain}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03]"
                          data-testid="domain-item"
                        >
                          <span className="text-sm text-white">{domain}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDomain(domain)}
                            className="p-1 rounded hover:bg-white/[0.06] text-gray-500 hover:text-red-400 transition-colors"
                            aria-label={`Remove ${domain}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Starter Questions */}
            <section data-testid="starter-questions-section">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-white">
                      Starter Questions
                    </h2>
                    <span className="text-sm text-gray-500">
                      {settings.starterQuestions.length}/{MAX_STARTER_QUESTIONS}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Suggested questions shown to users when they open the
                    assistant
                  </p>
                </div>
                <Toggle
                  checked={settings.starterQuestionsEnabled}
                  onChange={(val) =>
                    updateSettings({ starterQuestionsEnabled: val })
                  }
                  disabled={saving}
                  testId="starter-questions-toggle"
                  label="Toggle starter questions"
                />
              </div>

              {settings.starterQuestionsEnabled && (
                <div className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-5">
                  {settings.starterQuestions.length > 0 && (
                    <div
                      className="space-y-2 mb-3"
                      data-testid="questions-list"
                    >
                      {settings.starterQuestions.map((q, i) => (
                        <div
                          key={`q-${q}`}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.03]"
                          data-testid="question-item"
                        >
                          <span className="text-sm text-white">{q}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(i)}
                            className="p-1 rounded hover:bg-white/[0.06] text-gray-500 hover:text-red-400 transition-colors"
                            aria-label="Remove question"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {settings.starterQuestions.length < MAX_STARTER_QUESTIONS && (
                    <StarterQuestionInput
                      onAdd={(q) =>
                        updateSettings({
                          starterQuestions: [...settings.starterQuestions, q],
                        })
                      }
                    />
                  )}
                </div>
              )}
            </section>
          </div>
        ) : (
          /* Billing Tab */
          <div className="max-w-2xl pb-12" data-testid="billing-tab">
            <div className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-6 space-y-6">
              {/* Usage & Credits Overview */}
              <div>
                <h3 className="text-base font-semibold text-white mb-1">
                  Usage & Credits Overview
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  {pct}% ({usage.messagesUsed} of {usage.messageLimit}) messages
                  used
                </p>

                {/* Progress bar */}
                <div className="relative h-3 rounded-full bg-white/[0.06] mb-3">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[var(--od-accent)] transition-all"
                    style={{ width: `${pct}%` }}
                    data-testid="usage-progress-bar"
                  />
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[var(--od-accent)]" />
                    Used: {usage.messagesUsed}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[var(--od-gold,#c9a649)]" />
                    Overage Kick In
                  </span>
                </div>
              </div>

              {/* Stats grid — two-column side-by-side layout */}
              <div className="grid grid-cols-2 gap-x-8 text-sm">
                {/* Left column */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Message Range</span>
                    <span className="text-white">0 - {usage.messageLimit}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Messages Remaining</span>
                    <span className="text-white">
                      {Math.max(0, usage.messageLimit - usage.messagesUsed)}
                    </span>
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Next Billing</span>
                    <span className="text-white">
                      {formatBillingDate(usage.billingCycleEnd)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Monthly Price</span>
                    <span className="text-white">
                      {formatCents(usage.monthlyPrice)}/mo
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Overage Spend</span>
                    <span className="text-white">
                      +{formatCents(usage.overageSpend)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Spending Controls */}
            <div className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-6 mt-6">
              <h3 className="text-base font-semibold text-white mb-1">
                Spending Controls
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Manage your usage limits and spending caps
              </p>
              <button
                type="button"
                className="rounded-lg border border-white/[0.08] bg-white/[0.05] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.08] transition-colors"
                data-testid="change-tier-btn"
              >
                Change Tier
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StarterQuestionInput({ onAdd }: { onAdd: (q: string) => void }) {
  const [value, setValue] = useState("");

  const handleAdd = () => {
    const q = value.trim();
    if (!q) return;
    onAdd(q);
    setValue("");
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
        }}
        placeholder="Type a starter question..."
        className="flex-1 rounded-lg border border-[var(--od-border)] bg-[var(--od-panel)] py-2 px-3 text-sm text-[var(--od-text)] placeholder:text-[var(--od-text-subtle)] outline-none focus:border-[var(--od-accent)] focus:ring-1 focus:ring-[var(--od-accent)]"
        data-testid="question-input"
      />
      <button
        type="button"
        onClick={handleAdd}
        className="rounded-lg bg-[var(--od-accent-strong)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--od-accent-deep,#3d4ea4)] transition-colors"
        data-testid="add-question-btn"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
