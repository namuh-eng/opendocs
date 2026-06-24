"use client";

import { ArrowLeft, Clock, GitMerge } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getTemplateById } from "@/lib/workflow-templates";

type TriggerType = "on_pr_merge" | "on_schedule";
type Frequency = "daily" | "weekly" | "monthly" | "custom";

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return { value: `${h}:00`, label: `${h}:00 AM`.replace(/^0/, "") };
}).map((opt) => {
  const hour = Number.parseInt(opt.value.split(":")[0], 10);
  if (hour === 0) return { value: opt.value, label: "12:00 AM" };
  if (hour < 12) return { value: opt.value, label: `${hour}:00 AM` };
  if (hour === 12) return { value: opt.value, label: "12:00 PM" };
  return { value: opt.value, label: `${hour - 12}:00 PM` };
});

function getScheduleDescription(frequency: Frequency, time: string): string {
  const timeLabel = TIME_OPTIONS.find((o) => o.value === time)?.label ?? time;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  switch (frequency) {
    case "daily":
      return `Runs daily at ${timeLabel} ${tz}`;
    case "weekly":
      return `Runs weekly on Mondays at ${timeLabel} ${tz}`;
    case "monthly":
      return `Runs monthly on the 1st at ${timeLabel} ${tz}`;
    case "custom":
      return "Runs on a custom cron schedule";
  }
}

function mapTemplateTrigger(trigger: string): TriggerType {
  if (trigger === "on_merge") return "on_pr_merge";
  if (trigger === "on_schedule") return "on_schedule";
  return "on_pr_merge";
}

export function NewWorkflowClient({
  templateId,
}: {
  templateId: string | undefined;
}) {
  const router = useRouter();
  const template = templateId ? getTemplateById(templateId) : undefined;

  const [name, setName] = useState(template?.name ?? "");
  const [triggerType, setTriggerType] = useState<TriggerType>(
    template ? mapTemplateTrigger(template.defaultTrigger) : "on_pr_merge",
  );
  const [repoSearch, setRepoSearch] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [time, setTime] = useState("09:00");
  const [customCron, setCustomCron] = useState("");
  const [prompt, setPrompt] = useState(template?.defaultPrompt ?? "");
  const [autoMerge, setAutoMerge] = useState(true);
  const [contextRepos, setContextRepos] = useState(false);
  const [slackNotify, setSlackNotify] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    name.trim().length > 0 && prompt.trim().length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          triggerType,
          triggerConfig:
            triggerType === "on_schedule"
              ? {
                  frequency,
                  time,
                  ...(frequency === "custom" ? { customCron } : {}),
                }
              : { repos: [] },
          prompt: prompt.trim(),
          autoMerge,
          contextRepos: contextRepos ? [] : [],
          slackNotify,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create workflow");
        setSubmitting(false);
        return;
      }

      router.push("/products/workflows");
    } catch {
      setError("Network error — please try again");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/products/workflows"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft size={16} />
        Back to templates
      </Link>

      <p className="mb-1 text-sm text-gray-400">
        Set up your trigger, instructions, and notifications
      </p>
      <h1 className="mb-8 text-2xl font-semibold text-white">
        {template ? template.name : "New custom workflow"}
      </h1>

      <div className="space-y-8">
        {/* Name */}
        <div>
          <label
            htmlFor="workflow-name"
            className="mb-1.5 block text-sm font-medium text-gray-300"
          >
            Name
          </label>
          <input
            id="workflow-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My workflow"
            className="w-full rounded-md border border-[var(--od-border)] bg-[var(--od-panel)] px-3 py-2 text-sm text-[var(--od-text)] placeholder-[var(--od-text-subtle)] outline-none focus:border-[var(--od-accent)] focus:ring-1 focus:ring-[var(--od-accent)]"
          />
        </div>

        {/* Trigger type */}
        <div>
          <p className="mb-3 text-sm font-medium text-gray-300">Trigger type</p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setTriggerType("on_pr_merge")}
              data-testid="trigger-on_pr_merge"
              className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                triggerType === "on_pr_merge"
                  ? "border-[var(--od-accent)] bg-[var(--od-accent-soft)]"
                  : "border-[var(--od-border)] bg-[var(--od-panel-muted)] hover:border-[var(--od-accent)]"
              }`}
            >
              <GitMerge
                size={20}
                className={
                  triggerType === "on_pr_merge"
                    ? "text-[var(--od-accent-strong)]"
                    : "text-[var(--od-text-muted)]"
                }
              />
              <div className="flex-1">
                <div className="font-medium text-white">
                  On pull request merge
                </div>
                <div className="text-sm text-gray-400">
                  Runs when a pull request is merged
                </div>
              </div>
              <div
                className={`h-5 w-5 rounded-full border-2 ${
                  triggerType === "on_pr_merge"
                    ? "border-[var(--od-accent)] bg-[var(--od-accent)]"
                    : "border-[var(--od-border)]"
                }`}
              >
                {triggerType === "on_pr_merge" && (
                  <svg
                    viewBox="0 0 20 20"
                    fill="white"
                    className="h-full w-full"
                    aria-hidden="true"
                  >
                    <title>Selected</title>
                    <circle cx="10" cy="10" r="4" />
                  </svg>
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTriggerType("on_schedule")}
              data-testid="trigger-on_schedule"
              className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                triggerType === "on_schedule"
                  ? "border-[var(--od-accent)] bg-[var(--od-accent-soft)]"
                  : "border-[var(--od-border)] bg-[var(--od-panel-muted)] hover:border-[var(--od-accent)]"
              }`}
            >
              <Clock
                size={20}
                className={
                  triggerType === "on_schedule"
                    ? "text-[var(--od-accent-strong)]"
                    : "text-[var(--od-text-muted)]"
                }
              />
              <div className="flex-1">
                <div className="font-medium text-white">On schedule</div>
                <div className="text-sm text-gray-400">
                  Runs on a recurring schedule
                </div>
              </div>
              <div
                className={`h-5 w-5 rounded-full border-2 ${
                  triggerType === "on_schedule"
                    ? "border-[var(--od-accent)] bg-[var(--od-accent)]"
                    : "border-[var(--od-border)]"
                }`}
              >
                {triggerType === "on_schedule" && (
                  <svg
                    viewBox="0 0 20 20"
                    fill="white"
                    className="h-full w-full"
                    aria-hidden="true"
                  >
                    <title>Selected</title>
                    <circle cx="10" cy="10" r="4" />
                  </svg>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* PR Merge: Repo selector */}
        {triggerType === "on_pr_merge" && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-300">
              Trigger repos
            </p>
            <p className="mb-2 text-sm text-gray-500">
              Repositories to watch for pull request merges.
            </p>
            <div className="rounded-md border border-[var(--od-border)] bg-[var(--od-panel)]">
              <div className="flex items-center gap-2 border-b border-[var(--od-border)] px-3 py-2">
                <svg
                  className="h-4 w-4 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <title>Search</title>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  placeholder="Search repositories..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
                  data-testid="repo-search"
                />
              </div>
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                No repositories available
              </div>
            </div>
          </div>
        )}

        {/* Schedule: Frequency + Time */}
        {triggerType === "on_schedule" && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-300">Schedule</p>
            <div className="mb-3 flex gap-2">
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequency(opt.value)}
                  data-testid={`freq-${opt.value}`}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    frequency === opt.value
                      ? "bg-[var(--od-accent-strong)] text-white"
                      : "bg-[var(--od-panel-muted)] text-[var(--od-text-muted)] hover:bg-[var(--od-panel)] hover:text-[var(--od-text)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {frequency === "custom" ? (
              <input
                type="text"
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                placeholder="0 9 * * 1"
                data-testid="custom-cron"
                className="mb-2 w-full rounded-md border border-[var(--od-border)] bg-[var(--od-panel)] px-3 py-2 text-sm text-[var(--od-text)] placeholder-[var(--od-text-subtle)] outline-none focus:border-[var(--od-accent)] focus:ring-1 focus:ring-[var(--od-accent)]"
              />
            ) : (
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                data-testid="time-select"
                className="mb-2 w-full rounded-md border border-[var(--od-border)] bg-[var(--od-panel)] px-3 py-2 text-sm text-[var(--od-text)] outline-none focus:border-[var(--od-accent)] focus:ring-1 focus:ring-[var(--od-accent)]"
              >
                {TIME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}

            <p className="text-sm text-gray-500">
              {getScheduleDescription(frequency, time)}
            </p>
          </div>
        )}

        {/* Prompt */}
        <div>
          <label
            htmlFor="workflow-prompt"
            className="mb-1 block text-sm font-medium text-gray-300"
          >
            Prompt
          </label>
          <p className="mb-2 text-sm text-gray-500">
            Tell it what to update and format to follow
          </p>
          <textarea
            id="workflow-prompt"
            rows={6}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what this workflow should do..."
            className="w-full rounded-md border border-[var(--od-border)] bg-[var(--od-panel)] px-3 py-2 text-sm text-[var(--od-text)] placeholder-[var(--od-text-subtle)] outline-none focus:border-[var(--od-accent)] focus:ring-1 focus:ring-[var(--od-accent)]"
          />
        </div>

        {/* Settings */}
        <div>
          <p className="mb-3 text-sm font-medium text-gray-300">Settings</p>
          <div className="space-y-4">
            <ToggleRow
              label="Context repos"
              description="Include connected repository context"
              checked={contextRepos}
              onChange={setContextRepos}
              testId="toggle-context-repos"
            />
            <ToggleRow
              label="Auto-merge"
              description="Automatically merge generated PRs"
              checked={autoMerge}
              onChange={setAutoMerge}
              testId="toggle-auto-merge"
            />
          </div>
        </div>

        {/* Notifications */}
        <div>
          <p className="mb-3 text-sm font-medium text-gray-300">
            Notifications
          </p>
          <div className="flex items-center justify-between rounded-lg border border-[var(--od-border)] bg-[var(--od-panel-muted)] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--od-panel)]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <title>Slack</title>
                  <path
                    d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
                    fill="#E01E5A"
                  />
                  <path d="M14 2v6h6" fill="#ECB22E" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-white">
                  Slack notifications
                </div>
                <div className="text-xs text-gray-500">
                  Get notified when workflows complete
                </div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={slackNotify}
              onClick={() => setSlackNotify(!slackNotify)}
              data-testid="toggle-slack"
              className={`relative h-5 w-9 rounded-full transition-colors ${
                slackNotify
                  ? "bg-[var(--od-accent-strong)]"
                  : "bg-[var(--od-border)]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  slackNotify ? "translate-x-[18px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400" data-testid="form-error">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          data-testid="create-workflow-btn"
          className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${
            canSubmit
              ? "bg-[var(--od-accent-strong)] hover:bg-[var(--od-accent-deep,#3d4ea4)]"
              : "cursor-not-allowed bg-[var(--od-accent-strong)] opacity-50"
          }`}
        >
          {submitting ? "Creating..." : "Create workflow"}
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  testId,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        data-testid={testId}
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-[var(--od-accent-strong)]" : "bg-[var(--od-border)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
