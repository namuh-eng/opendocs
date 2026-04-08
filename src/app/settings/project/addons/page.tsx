"use client";

import {
  type AddonsSettings,
  type CiCheckValue,
  mergeAddons,
} from "@/lib/addons";
import {
  AlertTriangle,
  Code,
  Eye,
  Link2,
  MessageSquare,
  Pencil,
  Sparkles,
  ThumbsUp,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface ProjectData {
  id: string;
  settings: Record<string, unknown>;
}

export default function AddonsSettingsPage() {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addons, setAddons] = useState<AddonsSettings>(mergeAddons(undefined));
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.projects?.length > 0) {
          const p = data.projects[0];
          setProject(p);
          const existing = (p.settings as Record<string, unknown>)?.addons as
            | Partial<AddonsSettings>
            | undefined;
          setAddons(mergeAddons(existing));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!project) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: { ...project.settings, addons },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save" });
        setSaving(false);
        return;
      }

      const data = await res.json();
      setProject(data.project);
      setMessage({ type: "success", text: "Changes saved" });
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setSaving(false);
    }
  };

  const toggleFeedback = (key: keyof AddonsSettings["feedback"]) => {
    setAddons((prev) => ({
      ...prev,
      feedback: { ...prev.feedback, [key]: !prev.feedback[key] },
    }));
  };

  const setCiCheck = (
    key: keyof AddonsSettings["ciChecks"],
    value: CiCheckValue,
  ) => {
    setAddons((prev) => ({
      ...prev,
      ciChecks: { ...prev.ciChecks, [key]: value },
    }));
  };

  const togglePreview = (key: keyof AddonsSettings["previews"]) => {
    setAddons((prev) => ({
      ...prev,
      previews: { ...prev.previews, [key]: !prev.previews[key] },
    }));
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="text-gray-400">No project found.</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-1 text-sm text-gray-400">Settings / Add-ons</div>

      {/* ── Feedback ── */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-white">Feedback</h2>
        <p className="mt-1 text-sm text-gray-400">
          Enable feedback widgets on your docs
        </p>

        <div className="mt-4 space-y-1">
          <FeedbackToggle
            icon={ThumbsUp}
            label="Thumbs rating"
            description="Enable thumbs up/down on your docs"
            checked={addons.feedback.thumbsRating}
            onChange={() => toggleFeedback("thumbsRating")}
            testId="toggle-thumbsRating"
          />
          <FeedbackToggle
            icon={Pencil}
            label="Edit suggestions"
            description="This feature is only available for public GitHub repositories"
            checked={addons.feedback.editSuggestions}
            onChange={() => toggleFeedback("editSuggestions")}
            testId="toggle-editSuggestions"
          />
          <FeedbackToggle
            icon={AlertTriangle}
            label="Raise issues"
            description="This feature is only available for public GitHub repositories"
            checked={addons.feedback.raiseIssues}
            onChange={() => toggleFeedback("raiseIssues")}
            testId="toggle-raiseIssues"
          />
          <FeedbackToggle
            icon={MessageSquare}
            label="Contextual feedback"
            description="Please contact sales to enable this feature"
            checked={addons.feedback.contextualFeedback}
            onChange={() => toggleFeedback("contextualFeedback")}
            testId="toggle-contextualFeedback"
          />
          <FeedbackToggle
            icon={Code}
            label="Code snippet feedback"
            description="Please contact sales to enable this feature"
            checked={addons.feedback.codeSnippetFeedback}
            onChange={() => toggleFeedback("codeSnippetFeedback")}
            testId="toggle-codeSnippetFeedback"
          />
        </div>
      </section>

      {/* ── CI/CD Checks ── */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white">CI/CD checks</h2>
        <p className="mt-1 text-sm text-gray-400">
          Add checks to the pull request pipeline
        </p>

        <div className="mt-4 space-y-4">
          <CiCheckRow
            icon={Link2}
            label="Broken links"
            description="Automatically check your docs for broken links"
            value={addons.ciChecks.brokenLinks}
            onChange={(v) => setCiCheck("brokenLinks", v)}
            testId="select-brokenLinks"
          />
          <CiCheckRow
            icon={Type}
            label="Grammar linter"
            description="Automatically check your docs for grammar issues"
            value={addons.ciChecks.grammarLinter}
            onChange={(v) => setCiCheck("grammarLinter", v)}
            testId="select-grammarLinter"
          />
        </div>
      </section>

      {/* ── Previews ── */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white">Previews</h2>
        <p className="mt-1 text-sm text-gray-400">
          Configure preview deployment behavior
        </p>

        <div className="mt-4 space-y-1">
          <FeedbackToggle
            icon={Eye}
            label="Preview deployments"
            description="Enable preview deployments for pull requests"
            checked={addons.previews.previewDeployments}
            onChange={() => togglePreview("previewDeployments")}
            testId="toggle-previewDeployments"
          />
          <FeedbackToggle
            icon={Sparkles}
            label="Preview auth"
            description="Restrict preview access to organization members only"
            checked={addons.previews.previewAuth}
            onChange={() => togglePreview("previewAuth")}
            testId="toggle-previewAuth"
          />
        </div>
      </section>

      {/* ── Save ── */}
      <div className="mt-8 flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
        {message && (
          <p
            className={`text-sm ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Toggle Row ── */
function FeedbackToggle({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
  testId,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  testId: string;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#141414] px-4 py-3"
      data-testid={testId}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-gray-400" />
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
          checked ? "bg-emerald-600" : "bg-white/[0.12]"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-[3px]"
          }`}
        />
      </button>
    </div>
  );
}

/* ── CI Check Dropdown Row ── */
function CiCheckRow({
  icon: Icon,
  label,
  description,
  value,
  onChange,
  testId,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  value: CiCheckValue;
  onChange: (v: CiCheckValue) => void;
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#141414] px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-gray-400" />
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <select
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value as CiCheckValue)}
        className="rounded-md border border-white/[0.08] bg-[#1a1a1a] px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
      >
        <option value="disabled">Disabled</option>
        <option value="enabled">Enabled</option>
      </select>
    </div>
  );
}
