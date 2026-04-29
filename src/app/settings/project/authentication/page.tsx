"use client";

import { useActiveProject } from "@/hooks/use-active-project";
import { useProjectUpdater } from "@/hooks/use-project-updater";
import {
  type ProjectAuthenticationMode,
  hashDocsPassword,
  mergeProjectAuthenticationSettings,
  readProjectAuthenticationSettings,
  validateProjectAuthenticationSettings,
} from "@/lib/project-authentication-settings";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

interface ProjectData {
  id: string;
  name: string;
  settings: Record<string, unknown> | null;
}

export default function AuthenticationSettingsPage() {
  const { project, setProject, loading } = useActiveProject<ProjectData>();
  const { saving, updateProject } = useProjectUpdater<ProjectData>({
    projectId: project?.id,
    setProject,
  });
  const [mode, setMode] = useState<ProjectAuthenticationMode>("public");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!project) {
      return;
    }

    const authentication = readProjectAuthenticationSettings(project.settings);
    setMode(authentication.mode);
    setPassword("");
  }, [project]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!project) return;

    setMessage(null);

    const trimmedPassword = password.trim();
    const authentication = {
      mode,
      password: trimmedPassword,
      passwordHash:
        mode === "password" ? await hashDocsPassword(trimmedPassword) : "",
    };
    const validationError =
      validateProjectAuthenticationSettings(authentication);
    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    const result = await updateProject({
      settings: mergeProjectAuthenticationSettings(
        project.settings,
        authentication,
      ),
    });

    if (!result.ok) {
      setMessage({ type: "error", text: result.error });
      return;
    }

    setMessage({ type: "success", text: "Authentication settings saved" });
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
      <div className="mb-1 text-sm text-gray-400">
        Settings / Project Settings / Authentication
      </div>
      <h1 className="mb-2 text-xl font-semibold text-white">Authentication</h1>
      <p className="mb-6 text-sm text-gray-400">
        Control whether this project is public or requires a shared password.
      </p>

      <form onSubmit={handleSave} className="space-y-5">
        <label className="flex cursor-pointer gap-4 rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-4 transition-colors hover:border-white/[0.16]">
          <input
            type="radio"
            name="authentication-mode"
            value="public"
            checked={mode === "public"}
            onChange={() => setMode("public")}
            className="mt-1 accent-emerald-500"
          />
          <ShieldCheck size={20} className="mt-0.5 text-emerald-400" />
          <span>
            <span className="block text-sm font-medium text-white">
              Public docs
            </span>
            <span className="mt-1 block text-sm text-gray-400">
              Anyone with the docs URL can view this project.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer gap-4 rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-4 transition-colors hover:border-white/[0.16]">
          <input
            type="radio"
            name="authentication-mode"
            value="password"
            checked={mode === "password"}
            onChange={() => setMode("password")}
            className="mt-1 accent-emerald-500"
          />
          <LockKeyhole size={20} className="mt-0.5 text-emerald-400" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-white">
              Password protected
            </span>
            <span className="mt-1 block text-sm text-gray-400">
              Require a shared password before visitors can access these docs.
            </span>
          </span>
        </label>

        {mode === "password" && (
          <div className="space-y-1.5">
            <label
              htmlFor="docs-password"
              className="block text-sm font-medium text-white"
            >
              Shared password
            </label>
            <input
              id="docs-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Enter a shared password"
            />
          </div>
        )}

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
          {saving ? "Saving..." : "Save authentication settings"}
        </button>
      </form>
    </div>
  );
}
