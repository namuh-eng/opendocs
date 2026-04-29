"use client";

import { AlertCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  image: string | null;
  emailNotifications: boolean;
  githubAuthorized: boolean;
  githubUsername: string | null;
}

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);

  // User deletion state
  const [showUserConfirm, setShowUserConfirm] = useState(false);
  const [userConfirmText, setUserConfirmText] = useState("");
  const [deletingUser, setDeletingUser] = useState(false);
  const [userError, setUserError] = useState("");

  const router = useRouter();

  useEffect(() => {
    fetch("/api/users/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          setFirstName(data.profile.firstName);
          setLastName(data.profile.lastName);
          setEmailNotifications(data.profile.emailNotifications);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (firstName.trim().length === 0) {
      setMessage({ type: "error", text: "First name is required" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save" });
        setSaving(false);
        return;
      }

      const data = await res.json();
      setProfile(data.profile);
      setMessage({ type: "success", text: "Changes saved" });
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNotifications = async () => {
    const newValue = !emailNotifications;
    setEmailNotifications(newValue);

    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailNotifications: newValue }),
      });

      if (!res.ok) {
        // Revert on failure
        setEmailNotifications(!newValue);
      } else {
        const data = await res.json();
        setProfile(data.profile);
      }
    } catch {
      setEmailNotifications(!newValue);
    }
  };

  const handleDeleteUser = async () => {
    if (userConfirmText !== profile?.email) return;
    setDeletingUser(true);
    setUserError("");

    try {
      const res = await fetch("/api/users/profile", {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setUserError(data.error || "Failed to delete account");
        setDeletingUser(false);
        return;
      }

      // Final redirect to marketing site or login
      window.location.href = "https://mintlify.app";
    } catch {
      setUserError("Something went wrong");
      setDeletingUser(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="text-gray-400">Could not load profile.</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-1 text-sm text-gray-400">
        Settings / Workspace / My Profile
      </div>
      <h1 className="mb-6 text-xl font-semibold text-white">My Profile</h1>

      {/* ── Name Section ──────────────────────────────────────────── */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-white">Name</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="firstName"
                className="block text-xs text-gray-400"
              >
                First name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="First name"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="lastName" className="block text-xs text-gray-400">
                Last name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="Last name"
              />
            </div>
          </div>
        </div>

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

      {/* ── Notifications Section ─────────────────────────────────── */}
      <div className="mt-10 border-t border-white/[0.08] pt-6">
        <h2 className="mb-4 text-sm font-medium text-white">Notifications</h2>

        <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-4">
          <div>
            <p className="text-sm text-white">Comment reply emails</p>
            <p className="text-xs text-gray-500">
              Receive email notifications when someone replies to your comments
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Comment reply emails"
            aria-checked={emailNotifications}
            onClick={handleToggleNotifications}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#0f0f0f] ${
              emailNotifications ? "bg-emerald-600" : "bg-gray-600"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                emailNotifications ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── Integrations Section ──────────────────────────────────── */}
      <div className="mt-10 border-t border-white/[0.08] pt-6">
        <h2 className="mb-4 text-sm font-medium text-white">Integrations</h2>

        <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-4">
          <div className="flex items-center gap-3">
            <svg
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-5 w-5 text-white"
              aria-hidden="true"
            >
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
            </svg>
            <div>
              <p className="text-sm text-white">GitHub</p>
              <p className="text-xs text-gray-500">
                {profile.githubAuthorized
                  ? `Connected as ${profile.githubUsername}`
                  : "Not connected"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              profile.githubAuthorized
                ? "border border-white/[0.08] bg-transparent text-gray-400 hover:text-white"
                : "bg-emerald-600 text-white hover:bg-emerald-500"
            }`}
          >
            {profile.githubAuthorized ? "Disconnect" : "Authorize"}
          </button>
        </div>
      </div>

      {/* ── Danger Zone Section ──────────────────────────────────── */}
      <div className="mt-10 border-t border-white/[0.08] pt-6">
        <h2 className="mb-4 text-sm font-medium text-white">Danger Zone</h2>

        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">
              Delete account
            </h3>
          </div>

          <p className="mb-4 text-sm text-gray-300">
            Permanently delete your account and all of your personal data. This
            action cannot be undone.
          </p>

          <button
            type="button"
            onClick={() => {
              setShowUserConfirm(true);
              setUserConfirmText("");
            }}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
          >
            Delete account
          </button>
        </div>
      </div>

      {/* User Deletion Confirmation Dialog */}
      {showUserConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-[#1a1a1a] p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Delete your account?</h2>
            </div>

            <p className="mb-4 text-sm text-gray-400 leading-relaxed">
              This will permanently delete your profile, preferences, and
              organization memberships. If you are the only member of an
              organization, those projects will become inaccessible.
            </p>

            <div className="mb-4 space-y-1.5">
              <label
                htmlFor="user-confirm"
                className="block text-sm text-gray-400"
              >
                To confirm, type{" "}
                <span className="font-mono text-white selection:bg-red-500/30">
                  {profile.email}
                </span>{" "}
                below:
              </label>
              <input
                id="user-confirm"
                type="text"
                value={userConfirmText}
                onChange={(e) => setUserConfirmText(e.target.value)}
                placeholder={profile.email}
                className="w-full rounded-lg border border-white/[0.08] bg-[#111] px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            {userError && (
              <p className="mb-4 text-sm text-red-400">{userError}</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowUserConfirm(false)}
                className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:border-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={userConfirmText !== profile.email || deletingUser}
                onClick={handleDeleteUser}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingUser ? "Deleting..." : "Permanently delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
