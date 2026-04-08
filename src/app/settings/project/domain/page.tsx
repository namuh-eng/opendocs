"use client";

import { useEffect, useState } from "react";

type VerificationStatus = "not_configured" | "pending" | "verified" | "failed";

interface ProjectData {
  id: string;
  slug: string;
  subdomain: string | null;
  customDomain: string | null;
  settings: Record<string, unknown> | null;
}

export default function DomainSettingsPage() {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState<VerificationStatus>("not_configured");
  const [cnameTarget, setCnameTarget] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.projects?.length > 0) {
          const p = data.projects[0] as ProjectData;
          setProject(p);
          if (p.customDomain) {
            setDomain(p.customDomain);
            const sub = p.subdomain ?? p.slug;
            setCnameTarget(`${sub}.mintlify-hosting.app`);
            const verifiedAt = p.settings?.domainVerifiedAt;
            setStatus(verifiedAt ? "verified" : "pending");
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customDomain: domain.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save" });
        setSaving(false);
        return;
      }

      const data = await res.json();
      setProject(data.project);

      if (domain.trim()) {
        const sub = data.project.subdomain ?? data.project.slug;
        setCnameTarget(`${sub}.mintlify-hosting.app`);
        setStatus("pending");
        setMessage({
          type: "success",
          text: "Domain saved. Configure the DNS record below, then verify.",
        });
      } else {
        setCnameTarget("");
        setStatus("not_configured");
        setMessage({ type: "success", text: "Custom domain removed" });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    if (!project) return;

    setVerifying(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/projects/${project.id}/domain/verify`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.status === "verified") {
        setStatus("verified");
        setMessage({ type: "success", text: "Domain verified successfully!" });
      } else {
        setStatus("pending");
        setMessage({
          type: "error",
          text:
            data.message || "DNS verification failed. Check your CNAME record.",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Verification request failed" });
    } finally {
      setVerifying(false);
    }
  };

  const handleRemove = async () => {
    if (!project) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customDomain: "",
          settings: { domainVerifiedAt: null },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to remove" });
        setSaving(false);
        return;
      }

      const data = await res.json();
      setProject(data.project);
      setDomain("");
      setCnameTarget("");
      setStatus("not_configured");
      setMessage({ type: "success", text: "Custom domain removed" });
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

  const statusBadge: Record<
    VerificationStatus,
    { label: string; color: string }
  > = {
    not_configured: { label: "Not configured", color: "text-gray-400" },
    pending: { label: "Pending verification", color: "text-yellow-400" },
    verified: { label: "Verified", color: "text-emerald-400" },
    failed: { label: "Verification failed", color: "text-red-400" },
  };

  const badge = statusBadge[status];

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-1 text-sm text-gray-400">
        Settings / Project Settings / Domain Setup
      </div>

      <h1 className="text-xl font-semibold text-white mb-6">Custom Domain</h1>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="custom-domain"
            className="block text-sm font-medium text-white"
          >
            Domain
          </label>
          <p className="text-xs text-gray-500">
            Point your custom domain to your documentation site
          </p>
          <input
            id="custom-domain"
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="docs.example.com"
            className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {message && (
          <p
            className={`text-sm ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}
          >
            {message.text}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save domain"}
          </button>
          {project.customDomain && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={saving}
              className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      </form>

      {/* DNS Instructions — shown when a domain is configured */}
      {(status === "pending" || status === "verified" || status === "failed") &&
        cnameTarget && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-medium text-white">
                DNS Configuration
              </h2>
              <span className={`text-xs font-medium ${badge.color}`}>
                {badge.label}
              </span>
            </div>

            <p className="text-sm text-gray-400">
              Add the following CNAME record with your DNS provider:
            </p>

            <div className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-gray-400">
                    <th className="px-4 py-2.5 text-left font-medium">Type</th>
                    <th className="px-4 py-2.5 text-left font-medium">Name</th>
                    <th className="px-4 py-2.5 text-left font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-white">
                    <td className="px-4 py-2.5">
                      <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs">
                        CNAME
                      </code>
                    </td>
                    <td className="px-4 py-2.5">
                      <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs">
                        {project.customDomain ?? domain.trim()}
                      </code>
                    </td>
                    <td className="px-4 py-2.5">
                      <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs">
                        {cnameTarget}
                      </code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying || status === "verified"}
              className="rounded-lg border border-emerald-500/30 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10 disabled:opacity-50"
            >
              {verifying
                ? "Verifying..."
                : status === "verified"
                  ? "Verified"
                  : "Verify DNS"}
            </button>

            {status === "verified" && (
              <p className="text-sm text-emerald-400">
                Your documentation is accessible at{" "}
                <span className="font-medium">
                  https://{project.customDomain}
                </span>
              </p>
            )}
          </div>
        )}
    </div>
  );
}
