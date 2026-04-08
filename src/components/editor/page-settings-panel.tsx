"use client";

import { clsx } from "clsx";
import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface PageSettings {
  title: string;
  path: string;
  description: string;
  isPublished: boolean;
  frontmatter?: Record<string, unknown>;
}

interface PageSettingsPanelProps {
  settings: PageSettings;
  onSave: (settings: Partial<PageSettings>) => void;
  onClose: () => void;
}

export function PageSettingsPanel({
  settings,
  onSave,
  onClose,
}: PageSettingsPanelProps) {
  const [title, setTitle] = useState(settings.title);
  const [slug, setSlug] = useState(settings.path);
  const [description, setDescription] = useState(settings.description);
  const [isPublished, setIsPublished] = useState(settings.isPublished);
  const fm = settings.frontmatter || {};
  const [externalUrl, setExternalUrl] = useState(
    (fm.externalUrl as string) || "",
  );
  const [ogImageUrl, setOgImageUrl] = useState((fm.ogImage as string) || "");
  const [sidebarTitle, setSidebarTitle] = useState(
    (fm.sidebarTitle as string) || "",
  );
  const [hidden, setHidden] = useState(fm.hidden === true);
  const [noindex, setNoindex] = useState(fm.noindex === true);

  // Sync from props when settings change
  useEffect(() => {
    setTitle(settings.title);
    setSlug(settings.path);
    setDescription(settings.description);
    setIsPublished(settings.isPublished);
    const f = settings.frontmatter || {};
    setExternalUrl((f.externalUrl as string) || "");
    setOgImageUrl((f.ogImage as string) || "");
    setSidebarTitle((f.sidebarTitle as string) || "");
    setHidden(f.hidden === true);
    setNoindex(f.noindex === true);
  }, [settings]);

  const handleSave = useCallback(() => {
    const updates: Partial<PageSettings> = {};
    if (title !== settings.title) updates.title = title;
    if (slug !== settings.path) updates.path = slug;
    if (description !== settings.description) updates.description = description;
    if (isPublished !== settings.isPublished) updates.isPublished = isPublished;

    // Build frontmatter updates
    const prevFm = settings.frontmatter || {};
    const newFm: Record<string, unknown> = { ...prevFm };
    newFm.ogImage = ogImageUrl || undefined;
    newFm.hidden = hidden || undefined;
    newFm.noindex = noindex || undefined;
    newFm.sidebarTitle = sidebarTitle || undefined;
    newFm.externalUrl = externalUrl || undefined;

    // Check if frontmatter changed
    if (JSON.stringify(newFm) !== JSON.stringify(prevFm)) {
      updates.frontmatter = newFm;
    }

    if (Object.keys(updates).length > 0) {
      onSave(updates);
    }
  }, [
    title,
    slug,
    description,
    isPublished,
    ogImageUrl,
    hidden,
    noindex,
    sidebarTitle,
    externalUrl,
    settings,
    onSave,
  ]);

  return (
    <div
      className="w-80 border-l border-white/[0.08] bg-[#0f0f0f] flex flex-col shrink-0 overflow-y-auto"
      data-testid="page-settings-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
        <h3 className="text-sm font-medium text-white">Page settings</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Close settings"
        >
          <X size={14} />
        </button>
      </div>

      {/* Settings form */}
      <div className="p-4 space-y-4">
        <SettingsField label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-md text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </SettingsField>

        <SettingsField label="Slug">
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            onBlur={handleSave}
            className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-md text-sm text-gray-400 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </SettingsField>

        <SettingsField label="External URL">
          <input
            type="text"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            onBlur={handleSave}
            placeholder="Enter external url"
            className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-md text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </SettingsField>

        <SettingsField label="Description">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleSave}
            placeholder="Enter page description"
            className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-md text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </SettingsField>

        <SettingsField label="Sidebar title">
          <input
            type="text"
            value={sidebarTitle}
            onChange={(e) => setSidebarTitle(e.target.value)}
            onBlur={handleSave}
            placeholder="Enter sidebar title"
            className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-md text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </SettingsField>

        <SettingsField label="OG Image URL">
          <input
            type="text"
            value={ogImageUrl}
            onChange={(e) => setOgImageUrl(e.target.value)}
            onBlur={handleSave}
            placeholder="Enter URL (Auto generated by default)"
            className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-md text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </SettingsField>

        <SettingsToggle
          label="Tag"
          description="On"
          checked={isPublished}
          onChange={(val) => {
            setIsPublished(val);
            onSave({ isPublished: val });
          }}
        />

        <SettingsToggle
          label="Hidden"
          description={hidden ? "Yes" : "No"}
          checked={hidden}
          onChange={(val) => {
            setHidden(val);
            // Defer save so state updates first
            setTimeout(
              () =>
                onSave({
                  frontmatter: {
                    ...(settings.frontmatter || {}),
                    hidden: val || undefined,
                  },
                }),
              0,
            );
          }}
        />

        <SettingsToggle
          label="No index"
          description={noindex ? "Yes" : "No"}
          checked={noindex}
          onChange={(val) => {
            setNoindex(val);
            setTimeout(
              () =>
                onSave({
                  frontmatter: {
                    ...(settings.frontmatter || {}),
                    noindex: val || undefined,
                  },
                }),
              0,
            );
          }}
        />

        <SettingsField label="Mode">
          <div className="px-3 py-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-md text-sm text-gray-400">
            Default
          </div>
        </SettingsField>
      </div>
    </div>
  );
}

function SettingsField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-sm text-gray-500 w-24 shrink-0 pt-1.5">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function SettingsToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-500 w-24 shrink-0">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={clsx(
            "relative w-8 h-[18px] rounded-full transition-colors",
            checked ? "bg-emerald-600" : "bg-gray-700",
          )}
        >
          <span
            className={clsx(
              "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform",
              checked ? "translate-x-[14px]" : "translate-x-0.5",
            )}
          />
        </button>
        <span className="text-sm text-gray-400">{description}</span>
      </div>
    </div>
  );
}
