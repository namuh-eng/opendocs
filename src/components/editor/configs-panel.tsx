"use client";

import { isValidHexColor } from "@/lib/appearance";
import {
  type AssistantSearchConfig,
  CODE_THEME_OPTIONS,
  CONFIG_SECTIONS,
  type ConfigSectionId,
  type ContentFeaturesConfig,
  type DocsConfig,
  type FooterSocialLink,
  ICON_LIBRARY_OPTIONS,
  type RedirectEntry,
  SOCIAL_LINK_TYPES,
  THEME_OPTIONS,
  type TopbarLink,
  exportDocsConfigJson,
  importDocsConfigJson,
  mergeDocsConfig,
  validateDocsConfig,
} from "@/lib/docs-config";
import * as Accordion from "@radix-ui/react-accordion";
import { clsx } from "clsx";
import { ChevronDown, Download, Plus, Trash2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Props ────────────────────────────────────────────────────────────────

interface ConfigsPanelProps {
  projectId: string;
  onClose?: () => void;
}

export function ConfigsPanel({ projectId }: ConfigsPanelProps) {
  const [config, setConfig] = useState<DocsConfig>(mergeDocsConfig(undefined));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [projectSettings, setProjectSettings] = useState<
    Record<string, unknown>
  >({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch project settings
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/projects");
        const data = await res.json();
        const p =
          data.projects?.find(
            (proj: { id: string }) => proj.id === projectId,
          ) ?? data.projects?.[0];
        if (p) {
          const settings = (p.settings as Record<string, unknown>) ?? {};
          setProjectSettings(settings);
          setConfig(
            mergeDocsConfig(
              settings.docsConfig as
                | Partial<Record<string, unknown>>
                | undefined,
            ),
          );
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  // Save config
  const handleSave = useCallback(async () => {
    const result = validateDocsConfig(config);
    if (!result.valid) {
      setMessage({ type: "error", text: result.error });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: { ...projectSettings, docsConfig: config },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({
          type: "error",
          text: (data as { error?: string }).error || "Failed to save",
        });
      } else {
        setProjectSettings((prev) => ({ ...prev, docsConfig: config }));
        setMessage({ type: "success", text: "Saved" });
        setTimeout(() => setMessage(null), 2000);
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }, [config, projectId, projectSettings]);

  // Update a top-level section
  function updateSection<K extends keyof DocsConfig>(
    key: K,
    value: DocsConfig[K],
  ) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  // Export
  function handleExport() {
    const json = exportDocsConfigJson(config);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "docs-config.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import
  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const result = importDocsConfigJson(text);
      if (result.ok) {
        setConfig(result.config);
        setMessage({ type: "success", text: "Imported configuration" });
        setTimeout(() => setMessage(null), 2000);
      } else {
        setMessage({ type: "error", text: result.error });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  if (loading) {
    return (
      <div
        className="flex flex-col h-full bg-[#0f0f0f]"
        data-testid="configs-panel"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08]">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Configurations
          </span>
        </div>
        <div className="p-3">
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-10 rounded-lg bg-white/[0.04] animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full bg-[#0f0f0f] overflow-y-auto"
      data-testid="configs-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08] shrink-0">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Configurations
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleExport}
            className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/[0.06]"
            aria-label="Export config"
            data-testid="config-export-btn"
          >
            <Download size={14} />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/[0.06]"
            aria-label="Import config"
            data-testid="config-import-btn"
          >
            <Upload size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.json.gz"
            onChange={handleImportFile}
            className="hidden"
            data-testid="config-import-input"
          />
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={clsx(
            "mx-3 mt-2 px-3 py-2 rounded-md text-xs",
            message.type === "success"
              ? "bg-emerald-600/20 text-emerald-400"
              : "bg-red-600/20 text-red-400",
          )}
          data-testid="config-message"
        >
          {message.text}
        </div>
      )}

      {/* Accordion sections */}
      <Accordion.Root
        type="multiple"
        className="p-2"
        data-testid="config-accordion"
      >
        {CONFIG_SECTIONS.map((section) => (
          <ConfigAccordionItem key={section.id} section={section}>
            <SectionForm
              sectionId={section.id}
              config={config}
              updateSection={updateSection}
            />
          </ConfigAccordionItem>
        ))}
      </Accordion.Root>

      {/* Save button */}
      <div className="px-3 py-3 border-t border-white/[0.08] shrink-0">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          data-testid="config-save-btn"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}

// ── Accordion item wrapper ───────────────────────────────────────────────

function ConfigAccordionItem({
  section,
  children,
}: {
  section: { id: string; label: string; description: string };
  children: React.ReactNode;
}) {
  return (
    <Accordion.Item
      value={section.id}
      className="border-b border-white/[0.04]"
      data-testid={`config-section-${section.id}`}
    >
      <Accordion.Trigger className="flex items-center justify-between w-full py-3 px-2 text-left group">
        <div>
          <div className="text-sm font-medium text-white">{section.label}</div>
          <div className="text-xs text-gray-500">{section.description}</div>
        </div>
        <ChevronDown
          size={14}
          className="text-gray-500 transition-transform group-data-[state=open]:rotate-180"
        />
      </Accordion.Trigger>
      <Accordion.Content className="overflow-hidden data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
        <div className="px-2 pb-3 space-y-3">{children}</div>
      </Accordion.Content>
    </Accordion.Item>
  );
}

// ── Reusable field components ────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="block text-xs text-gray-400 mb-1">{children}</span>;
}

function TextInput({
  value,
  onChange,
  placeholder,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  testId?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      data-testid={testId}
      className="w-full px-2.5 py-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-md text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  testId?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid={testId}
      className="w-full px-2.5 py-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
  testId,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  testId?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        data-testid={testId}
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
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testId?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <div
          className="h-7 w-7 shrink-0 rounded border border-white/[0.08]"
          style={{
            backgroundColor: isValidHexColor(value) ? value : "#000",
          }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          maxLength={7}
          data-testid={testId}
          className="flex-1 px-2.5 py-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-md text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <input
          type="color"
          value={isValidHexColor(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-7 w-7 shrink-0 cursor-pointer rounded border border-white/[0.08] bg-transparent"
        />
      </div>
    </div>
  );
}

// ── Section forms ────────────────────────────────────────────────────────

function SectionForm({
  sectionId,
  config,
  updateSection,
}: {
  sectionId: ConfigSectionId;
  config: DocsConfig;
  updateSection: <K extends keyof DocsConfig>(
    key: K,
    value: DocsConfig[K],
  ) => void;
}) {
  switch (sectionId) {
    case "overview":
      return <OverviewForm config={config} updateSection={updateSection} />;
    case "visual-branding":
      return (
        <VisualBrandingForm config={config} updateSection={updateSection} />
      );
    case "typography":
      return <TypographyForm config={config} updateSection={updateSection} />;
    case "header-topbar":
      return <HeaderTopbarForm config={config} updateSection={updateSection} />;
    case "footer":
      return <FooterForm config={config} updateSection={updateSection} />;
    case "content-features":
      return (
        <ContentFeaturesForm config={config} updateSection={updateSection} />
      );
    case "assistant-search":
      return (
        <AssistantSearchForm config={config} updateSection={updateSection} />
      );
    case "integrations":
      return <IntegrationsForm config={config} updateSection={updateSection} />;
    case "api-docs":
      return <ApiDocsForm config={config} updateSection={updateSection} />;
    case "advanced":
      return <AdvancedForm config={config} updateSection={updateSection} />;
  }
}

type SectionProps = {
  config: DocsConfig;
  updateSection: <K extends keyof DocsConfig>(
    key: K,
    value: DocsConfig[K],
  ) => void;
};

function OverviewForm({ config, updateSection }: SectionProps) {
  const d = config.overview;
  const update = (patch: Partial<typeof d>) =>
    updateSection("overview", { ...d, ...patch });

  return (
    <>
      <div>
        <FieldLabel>Project name</FieldLabel>
        <TextInput
          value={d.name}
          onChange={(v) => update({ name: v })}
          placeholder="My Docs"
          testId="config-overview-name"
        />
      </div>
      <div>
        <FieldLabel>Description</FieldLabel>
        <TextInput
          value={d.description}
          onChange={(v) => update({ description: v })}
          placeholder="Documentation for..."
          testId="config-overview-description"
        />
      </div>
      <div>
        <FieldLabel>Base URL</FieldLabel>
        <TextInput
          value={d.baseUrl}
          onChange={(v) => update({ baseUrl: v })}
          placeholder="https://docs.example.com"
          testId="config-overview-baseurl"
        />
      </div>
    </>
  );
}

function VisualBrandingForm({ config, updateSection }: SectionProps) {
  const d = config.visualBranding;
  const update = (patch: Partial<typeof d>) =>
    updateSection("visualBranding", { ...d, ...patch });

  return (
    <>
      <div>
        <FieldLabel>Theme</FieldLabel>
        <SelectInput
          value={d.theme}
          onChange={(v) => update({ theme: v as "light" | "dark" | "system" })}
          options={THEME_OPTIONS}
          testId="config-branding-theme"
        />
      </div>
      <ColorField
        label="Primary color"
        value={d.primaryColor}
        onChange={(v) => update({ primaryColor: v })}
        testId="config-branding-primary"
      />
      <ColorField
        label="Light color"
        value={d.lightColor}
        onChange={(v) => update({ lightColor: v })}
        testId="config-branding-light"
      />
      <ColorField
        label="Dark color"
        value={d.darkColor}
        onChange={(v) => update({ darkColor: v })}
        testId="config-branding-dark"
      />
      <div>
        <FieldLabel>Logo (light mode path)</FieldLabel>
        <TextInput
          value={d.logoLightPath}
          onChange={(v) => update({ logoLightPath: v })}
          placeholder="/logo-light.svg"
          testId="config-branding-logo-light"
        />
      </div>
      <div>
        <FieldLabel>Logo (dark mode path)</FieldLabel>
        <TextInput
          value={d.logoDarkPath}
          onChange={(v) => update({ logoDarkPath: v })}
          placeholder="/logo-dark.svg"
          testId="config-branding-logo-dark"
        />
      </div>
      <div>
        <FieldLabel>Logo link</FieldLabel>
        <TextInput
          value={d.logoLink}
          onChange={(v) => update({ logoLink: v })}
          placeholder="/"
          testId="config-branding-logo-link"
        />
      </div>
    </>
  );
}

function TypographyForm({ config, updateSection }: SectionProps) {
  const d = config.typography;
  const update = (patch: Partial<typeof d>) =>
    updateSection("typography", { ...d, ...patch });

  return (
    <>
      <div>
        <FieldLabel>Heading font</FieldLabel>
        <TextInput
          value={d.headingFont}
          onChange={(v) => update({ headingFont: v })}
          placeholder="Inter"
          testId="config-typo-heading"
        />
      </div>
      <div>
        <FieldLabel>Body font</FieldLabel>
        <TextInput
          value={d.bodyFont}
          onChange={(v) => update({ bodyFont: v })}
          placeholder="Inter"
          testId="config-typo-body"
        />
      </div>
    </>
  );
}

function HeaderTopbarForm({ config, updateSection }: SectionProps) {
  const d = config.headerTopbar;
  const update = (patch: Partial<typeof d>) =>
    updateSection("headerTopbar", { ...d, ...patch });

  function addLink() {
    update({ topbarLinks: [...d.topbarLinks, { label: "", url: "" }] });
  }

  function updateLink(idx: number, patch: Partial<TopbarLink>) {
    const links = d.topbarLinks.map((l, i) =>
      i === idx ? { ...l, ...patch } : l,
    );
    update({ topbarLinks: links });
  }

  function removeLink(idx: number) {
    update({ topbarLinks: d.topbarLinks.filter((_, i) => i !== idx) });
  }

  return (
    <>
      <div>
        <FieldLabel>Logo path</FieldLabel>
        <TextInput
          value={d.logoPath}
          onChange={(v) => update({ logoPath: v })}
          placeholder="/logo.svg"
          testId="config-topbar-logo"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <FieldLabel>Topbar links</FieldLabel>
          <button
            type="button"
            onClick={addLink}
            className="p-0.5 rounded text-gray-500 hover:text-emerald-400"
            data-testid="config-topbar-add-link"
          >
            <Plus size={12} />
          </button>
        </div>
        {d.topbarLinks.map((link, idx) => (
          <div
            key={`topbar-${link.label}-${link.url}`}
            className="flex items-center gap-1.5 mb-1.5"
          >
            <input
              type="text"
              value={link.label}
              onChange={(e) => updateLink(idx, { label: e.target.value })}
              placeholder="Label"
              className="flex-1 px-2 py-1 bg-[#1a1a1a] border border-white/[0.08] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <input
              type="text"
              value={link.url}
              onChange={(e) => updateLink(idx, { url: e.target.value })}
              placeholder="URL"
              className="flex-1 px-2 py-1 bg-[#1a1a1a] border border-white/[0.08] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => removeLink(idx)}
              className="p-0.5 text-gray-500 hover:text-red-400"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {d.topbarLinks.length === 0 && (
          <p className="text-xs text-gray-600">No links yet</p>
        )}
      </div>
    </>
  );
}

function FooterForm({ config, updateSection }: SectionProps) {
  const d = config.footer;
  const update = (patch: Partial<typeof d>) =>
    updateSection("footer", { ...d, ...patch });

  function addSocial() {
    update({
      socialLinks: [...d.socialLinks, { type: "website", url: "" }],
    });
  }

  function updateSocial(idx: number, patch: Partial<FooterSocialLink>) {
    const links = d.socialLinks.map((l, i) =>
      i === idx ? { ...l, ...patch } : l,
    );
    update({ socialLinks: links });
  }

  function removeSocial(idx: number) {
    update({ socialLinks: d.socialLinks.filter((_, i) => i !== idx) });
  }

  return (
    <>
      <div>
        <FieldLabel>Brand name</FieldLabel>
        <TextInput
          value={d.brandName}
          onChange={(v) => update({ brandName: v })}
          placeholder="Your Company"
          testId="config-footer-brand"
        />
      </div>
      <div>
        <FieldLabel>Brand URL</FieldLabel>
        <TextInput
          value={d.brandUrl}
          onChange={(v) => update({ brandUrl: v })}
          placeholder="https://example.com"
          testId="config-footer-url"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <FieldLabel>Social links</FieldLabel>
          <button
            type="button"
            onClick={addSocial}
            className="p-0.5 rounded text-gray-500 hover:text-emerald-400"
            data-testid="config-footer-add-social"
          >
            <Plus size={12} />
          </button>
        </div>
        {d.socialLinks.map((link, idx) => (
          <div
            key={`social-${link.type}-${link.url}`}
            className="flex items-center gap-1.5 mb-1.5"
          >
            <select
              value={link.type}
              onChange={(e) =>
                updateSocial(idx, {
                  type: e.target.value as FooterSocialLink["type"],
                })
              }
              className="w-24 px-1.5 py-1 bg-[#1a1a1a] border border-white/[0.08] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {SOCIAL_LINK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={link.url}
              onChange={(e) => updateSocial(idx, { url: e.target.value })}
              placeholder="https://..."
              className="flex-1 px-2 py-1 bg-[#1a1a1a] border border-white/[0.08] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => removeSocial(idx)}
              className="p-0.5 text-gray-500 hover:text-red-400"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {d.socialLinks.length === 0 && (
          <p className="text-xs text-gray-600">No social links</p>
        )}
      </div>
    </>
  );
}

function ContentFeaturesForm({ config, updateSection }: SectionProps) {
  const d = config.contentFeatures;
  const update = (patch: Partial<ContentFeaturesConfig>) =>
    updateSection("contentFeatures", { ...d, ...patch });

  return (
    <>
      <ToggleSwitch
        label="Thumbnails"
        checked={d.thumbnails}
        onChange={(v) => update({ thumbnails: v })}
        testId="config-content-thumbnails"
      />
      <div>
        <FieldLabel>Code block theme</FieldLabel>
        <SelectInput
          value={d.codeBlockTheme}
          onChange={(v) =>
            update({
              codeBlockTheme: v as ContentFeaturesConfig["codeBlockTheme"],
            })
          }
          options={CODE_THEME_OPTIONS}
          testId="config-content-code-theme"
        />
      </div>
      <ToggleSwitch
        label="LaTeX"
        checked={d.latex}
        onChange={(v) => update({ latex: v })}
        testId="config-content-latex"
      />
      <div>
        <FieldLabel>Icon library</FieldLabel>
        <SelectInput
          value={d.iconLibrary}
          onChange={(v) =>
            update({
              iconLibrary: v as ContentFeaturesConfig["iconLibrary"],
            })
          }
          options={ICON_LIBRARY_OPTIONS}
          testId="config-content-icon-lib"
        />
      </div>
    </>
  );
}

function AssistantSearchForm({ config, updateSection }: SectionProps) {
  const d = config.assistantSearch;
  const update = (patch: Partial<AssistantSearchConfig>) =>
    updateSection("assistantSearch", { ...d, ...patch });

  return (
    <>
      <ToggleSwitch
        label="AI Assistant"
        checked={d.assistantEnabled}
        onChange={(v) => update({ assistantEnabled: v })}
        testId="config-assistant-enabled"
      />
      <ToggleSwitch
        label="Search"
        checked={d.searchEnabled}
        onChange={(v) => update({ searchEnabled: v })}
        testId="config-search-enabled"
      />
      <div>
        <FieldLabel>Search prompt</FieldLabel>
        <TextInput
          value={d.searchPrompt}
          onChange={(v) => update({ searchPrompt: v })}
          placeholder="Ask anything..."
          testId="config-search-prompt"
        />
      </div>
    </>
  );
}

function IntegrationsForm({ config, updateSection }: SectionProps) {
  const d = config.integrations;
  const update = (patch: Partial<typeof d>) =>
    updateSection("integrations", { ...d, ...patch });

  function addCustom() {
    update({ custom: [...d.custom, { name: "", value: "" }] });
  }

  function updateCustom(
    idx: number,
    patch: Partial<{ name: string; value: string }>,
  ) {
    const items = d.custom.map((item, i) =>
      i === idx ? { ...item, ...patch } : item,
    );
    update({ custom: items });
  }

  function removeCustom(idx: number) {
    update({ custom: d.custom.filter((_, i) => i !== idx) });
  }

  return (
    <>
      <div>
        <FieldLabel>GA4 Measurement ID</FieldLabel>
        <TextInput
          value={d.ga4MeasurementId}
          onChange={(v) => update({ ga4MeasurementId: v })}
          placeholder="G-XXXXXXXXXX"
          testId="config-int-ga4"
        />
      </div>
      <div>
        <FieldLabel>Intercom App ID</FieldLabel>
        <TextInput
          value={d.intercomAppId}
          onChange={(v) => update({ intercomAppId: v })}
          placeholder="abc123"
          testId="config-int-intercom"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <FieldLabel>Custom integrations</FieldLabel>
          <button
            type="button"
            onClick={addCustom}
            className="p-0.5 rounded text-gray-500 hover:text-emerald-400"
            data-testid="config-int-add-custom"
          >
            <Plus size={12} />
          </button>
        </div>
        {d.custom.map((entry, idx) => (
          <div
            key={`custom-${entry.name}-${entry.value}`}
            className="flex items-center gap-1.5 mb-1.5"
          >
            <input
              type="text"
              value={entry.name}
              onChange={(e) => updateCustom(idx, { name: e.target.value })}
              placeholder="Name"
              className="flex-1 px-2 py-1 bg-[#1a1a1a] border border-white/[0.08] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <input
              type="text"
              value={entry.value}
              onChange={(e) => updateCustom(idx, { value: e.target.value })}
              placeholder="Value"
              className="flex-1 px-2 py-1 bg-[#1a1a1a] border border-white/[0.08] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => removeCustom(idx)}
              className="p-0.5 text-gray-500 hover:text-red-400"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        {d.custom.length === 0 && (
          <p className="text-xs text-gray-600">No custom integrations</p>
        )}
      </div>
    </>
  );
}

function ApiDocsForm({ config, updateSection }: SectionProps) {
  const d = config.apiDocs;
  const update = (patch: Partial<typeof d>) =>
    updateSection("apiDocs", { ...d, ...patch });

  return (
    <>
      <div>
        <FieldLabel>OpenAPI spec URL</FieldLabel>
        <TextInput
          value={d.openApiSpecUrl}
          onChange={(v) => update({ openApiSpecUrl: v })}
          placeholder="https://api.example.com/openapi.json"
          testId="config-api-spec-url"
        />
      </div>
      <ToggleSwitch
        label="API Playground"
        checked={d.playgroundEnabled}
        onChange={(v) => update({ playgroundEnabled: v })}
        testId="config-api-playground"
      />
      <div>
        <FieldLabel>Base API URL</FieldLabel>
        <TextInput
          value={d.baseApiUrl}
          onChange={(v) => update({ baseApiUrl: v })}
          placeholder="https://api.example.com"
          testId="config-api-base-url"
        />
      </div>
    </>
  );
}

function AdvancedForm({ config, updateSection }: SectionProps) {
  const d = config.advanced;
  const update = (patch: Partial<typeof d>) =>
    updateSection("advanced", { ...d, ...patch });

  const redirects: RedirectEntry[] = d.redirects ?? [];

  const addRedirect = () => {
    update({ redirects: [...redirects, { source: "", destination: "" }] });
  };

  const removeRedirect = (idx: number) => {
    update({ redirects: redirects.filter((_, i) => i !== idx) });
  };

  const updateRedirect = (
    idx: number,
    field: "source" | "destination",
    value: string,
  ) => {
    const next = redirects.map((r, i) =>
      i === idx ? { ...r, [field]: value } : r,
    );
    update({ redirects: next });
  };

  return (
    <>
      <div>
        <FieldLabel>SEO title</FieldLabel>
        <TextInput
          value={d.seoTitle}
          onChange={(v) => update({ seoTitle: v })}
          placeholder="My Documentation"
          testId="config-adv-seo-title"
        />
      </div>
      <div>
        <FieldLabel>SEO description</FieldLabel>
        <TextInput
          value={d.seoDescription}
          onChange={(v) => update({ seoDescription: v })}
          placeholder="Documentation for..."
          testId="config-adv-seo-desc"
        />
      </div>
      <div>
        <FieldLabel>Custom head HTML</FieldLabel>
        <textarea
          value={d.customHead}
          onChange={(e) => update({ customHead: e.target.value })}
          placeholder="<script>...</script>"
          rows={3}
          data-testid="config-adv-custom-head"
          className="w-full px-2.5 py-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-md text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono resize-none"
        />
      </div>

      <div>
        <FieldLabel>Custom CSS</FieldLabel>
        <p className="text-[10px] text-gray-500 mb-1">
          Injected in &lt;head&gt; after default styles. Use for branding
          overrides.
        </p>
        <textarea
          value={d.customCSS}
          onChange={(e) => update({ customCSS: e.target.value })}
          placeholder=".docs-page-title { color: #ff6600; }"
          rows={4}
          data-testid="config-adv-custom-css"
          className="w-full px-2.5 py-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-md text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono resize-none"
        />
      </div>
      <div>
        <FieldLabel>Custom JavaScript</FieldLabel>
        <p className="text-[10px] text-gray-500 mb-1">
          Injected before &lt;/body&gt;. Use for analytics, support widgets, or
          third-party integrations.
        </p>
        <textarea
          value={d.customJS}
          onChange={(e) => update({ customJS: e.target.value })}
          placeholder="console.log('Hello from custom JS');"
          rows={4}
          data-testid="config-adv-custom-js"
          className="w-full px-2.5 py-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-md text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono resize-none"
        />
      </div>

      {/* Redirects */}
      <div className="pt-3 border-t border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <FieldLabel>URL Redirects</FieldLabel>
          <button
            type="button"
            onClick={addRedirect}
            data-testid="config-add-redirect"
            className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
          >
            <Plus size={12} /> Add redirect
          </button>
        </div>
        {redirects.length === 0 && (
          <p className="text-[11px] text-gray-500">
            No redirects configured. Add one to redirect old paths to new
            destinations.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {redirects.map((r, idx) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: redirect entries have no stable ID
              key={`redirect-${idx}`}
              className="flex items-center gap-2"
              data-testid={`config-redirect-${idx}`}
            >
              <TextInput
                value={r.source}
                onChange={(v) => updateRedirect(idx, "source", v)}
                placeholder="/old-path"
                testId={`config-redirect-${idx}-source`}
              />
              <span className="text-gray-500 text-xs shrink-0">→</span>
              <TextInput
                value={r.destination}
                onChange={(v) => updateRedirect(idx, "destination", v)}
                placeholder="/new-path"
                testId={`config-redirect-${idx}-destination`}
              />
              <button
                type="button"
                onClick={() => removeRedirect(idx)}
                data-testid={`config-redirect-${idx}-remove`}
                className="p-1 text-gray-500 hover:text-red-400 shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
