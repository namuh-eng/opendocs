"use client";

import {
  type AppearanceSettings,
  DEFAULT_APPEARANCE,
  buildAssetFilename,
  isValidHexColor,
  mergeAppearance,
  validateAppearance,
} from "@/lib/appearance";
import { clsx } from "clsx";
import { Monitor, Moon, Sun, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ProjectData {
  id: string;
  orgId: string;
  settings: Record<string, unknown>;
}

type DarkModeOption = AppearanceSettings["darkMode"];

const DARK_MODE_OPTIONS: {
  value: DarkModeOption;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "light", label: "Light", icon: <Sun size={16} /> },
  { value: "dark", label: "Dark", icon: <Moon size={16} /> },
  { value: "system", label: "System", icon: <Monitor size={16} /> },
];

function ColorField({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  testId: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={testId} className="block text-sm font-medium text-white">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 shrink-0 rounded-lg border border-white/[0.08]"
          style={{ backgroundColor: isValidHexColor(value) ? value : "#000" }}
        />
        <input
          id={testId}
          type="text"
          data-testid={testId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          maxLength={7}
          className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
        <input
          type="color"
          value={isValidHexColor(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-10 w-10 shrink-0 cursor-pointer rounded border border-white/[0.08] bg-transparent"
        />
      </div>
    </div>
  );
}

function FileUploadZone({
  label,
  currentKey,
  onUpload,
  onRemove,
  accept,
  testId,
  orgId,
  projectId,
}: {
  label: string;
  currentKey: string | null;
  onUpload: (key: string) => void;
  onRemove: () => void;
  accept: string;
  testId: string;
  orgId: string;
  projectId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load preview URL for existing key
  useEffect(() => {
    if (!currentKey) {
      setPreviewUrl(null);
      return;
    }
    fetch(`/api/uploads/presign?key=${encodeURIComponent(currentKey)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.url) setPreviewUrl(data.url);
      })
      .catch(() => setPreviewUrl(null));
  }, [currentKey]);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);

      const assetType = testId.replace("upload-", "") as
        | "logo-light"
        | "logo-dark"
        | "favicon";
      const filename = buildAssetFilename(assetType, file.name);

      try {
        // Get presigned URL
        const presignRes = await fetch("/api/uploads/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId,
            projectId,
            filename,
            contentType: file.type,
            size: file.size,
          }),
        });

        if (!presignRes.ok) {
          const data = await presignRes.json();
          setError(data.error || "Failed to get upload URL");
          setUploading(false);
          return;
        }

        const { url, key } = await presignRes.json();

        // Upload to S3
        const uploadRes = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadRes.ok) {
          setError("Upload failed");
          setUploading(false);
          return;
        }

        onUpload(key);
        setPreviewUrl(URL.createObjectURL(file));
      } catch {
        setError("Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [orgId, projectId, testId, onUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={`${testId}-input`}
        className="block text-sm font-medium text-white"
      >
        {label}
      </label>
      {currentKey && previewUrl ? (
        <div className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-3">
          <img
            src={previewUrl}
            alt={label}
            className="h-10 w-10 rounded object-contain"
          />
          <span className="flex-1 truncate text-sm text-gray-400">
            {currentKey.split("/").pop()}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 text-gray-500 hover:bg-white/[0.06] hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          data-testid={testId}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.12] bg-[#1a1a1a] px-4 py-6 transition-colors hover:border-emerald-500/40 hover:bg-[#1a1a1a]/80"
        >
          {uploading ? (
            <p className="text-sm text-gray-400">Uploading...</p>
          ) : (
            <>
              <Upload size={20} className="text-gray-500" />
              <p className="text-sm text-gray-400">
                Drop file here or click to browse
              </p>
            </>
          )}
        </button>
      )}
      <input
        id={`${testId}-input`}
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function AppearanceSettingsPage() {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [appearance, setAppearance] =
    useState<AppearanceSettings>(DEFAULT_APPEARANCE);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.projects?.length > 0) {
          const p = data.projects[0];
          setProject(p);
          const existing =
            (p.settings as Record<string, unknown>)?.appearance ?? {};
          setAppearance(
            mergeAppearance(existing as Partial<AppearanceSettings>),
          );
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updateField = <K extends keyof AppearanceSettings>(
    field: K,
    value: AppearanceSettings[K],
  ) => {
    setAppearance((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    const validation = validateAppearance(appearance);
    if (!validation.valid) {
      setMessage({ type: "error", text: validation.error });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            ...((project.settings as Record<string, unknown>) ?? {}),
            appearance,
          },
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
      <div className="mb-1 text-sm text-gray-400">Settings / Appearance</div>
      <h1 className="mb-6 text-xl font-semibold text-white">Appearance</h1>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Colors */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500">
            Colors
          </h2>
          <ColorField
            label="Primary color"
            value={appearance.primaryColor}
            onChange={(v) => updateField("primaryColor", v)}
            testId="primary-color-input"
          />
          <ColorField
            label="Background color"
            value={appearance.backgroundColor}
            onChange={(v) => updateField("backgroundColor", v)}
            testId="background-color-input"
          />
        </section>

        {/* Dark mode */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500">
            Dark mode
          </h2>
          <div className="flex gap-2">
            {DARK_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                data-testid={`darkmode-${opt.value}`}
                onClick={() => updateField("darkMode", opt.value)}
                className={clsx(
                  "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                  appearance.darkMode === opt.value
                    ? "border-emerald-500 bg-emerald-600/10 text-emerald-400"
                    : "border-white/[0.08] bg-[#1a1a1a] text-gray-400 hover:border-white/[0.16] hover:text-white",
                )}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Logos */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500">
            Branding
          </h2>
          <FileUploadZone
            label="Logo (light)"
            currentKey={appearance.logoLight}
            onUpload={(key) => updateField("logoLight", key)}
            onRemove={() => updateField("logoLight", null)}
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            testId="upload-logo-light"
            orgId={project.orgId}
            projectId={project.id}
          />
          <FileUploadZone
            label="Logo (dark)"
            currentKey={appearance.logoDark}
            onUpload={(key) => updateField("logoDark", key)}
            onRemove={() => updateField("logoDark", null)}
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            testId="upload-logo-dark"
            orgId={project.orgId}
            projectId={project.id}
          />
          <FileUploadZone
            label="Favicon"
            currentKey={appearance.favicon}
            onUpload={(key) => updateField("favicon", key)}
            onRemove={() => updateField("favicon", null)}
            accept="image/png,image/x-icon,image/svg+xml"
            testId="upload-favicon"
            orgId={project.orgId}
            projectId={project.id}
          />
        </section>

        {/* Preview */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500">
            Preview
          </h2>
          <div
            className="rounded-lg border border-white/[0.08] p-4"
            style={{
              backgroundColor: isValidHexColor(appearance.backgroundColor)
                ? appearance.backgroundColor
                : "#FFFFFF",
            }}
          >
            <div
              className="h-3 w-24 rounded"
              style={{
                backgroundColor: isValidHexColor(appearance.primaryColor)
                  ? appearance.primaryColor
                  : "#16A34A",
              }}
            />
            <div className="mt-2 h-2 w-40 rounded bg-gray-300" />
            <div className="mt-1 h-2 w-32 rounded bg-gray-200" />
          </div>
        </section>

        {/* Save */}
        {message && (
          <p
            className={`text-sm ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
