"use client";

import { useCallback, useEffect, useState } from "react";

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: "admin" | "editor" | "viewer";
  joinedAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin:
    "bg-[var(--od-accent-soft)] text-[var(--od-accent-text)] border-[var(--od-accent)]",
  editor:
    "bg-[var(--od-sage-soft)] text-[var(--od-sage)] border-[var(--od-sage)]",
  viewer:
    "bg-[var(--od-panel-muted)] text-[var(--od-text-muted)] border-[var(--od-border)]",
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer">(
    "viewer",
  );
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Role edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<"admin" | "editor" | "viewer">(
    "viewer",
  );
  const [savingRole, setSavingRole] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/members");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");

    const trimmed = inviteEmail.trim();
    if (!trimmed) {
      setInviteError("Email is required");
      return;
    }

    setInviting(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || "Failed to invite member");
        return;
      }

      setInviteSuccess(
        `${data.member.name || data.member.email} has been added.`,
      );
      setInviteEmail("");
      await fetchMembers();
    } catch {
      setInviteError("Something went wrong");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (membershipId: string) => {
    setSavingRole(true);
    try {
      const res = await fetch(`/api/members/${membershipId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole }),
      });

      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === membershipId ? { ...m, role: editRole } : m,
          ),
        );
        setEditingId(null);
      }
    } finally {
      setSavingRole(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/members/${deleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== deleteId));
        setDeleteId(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const openInvite = () => {
    setInviteEmail("");
    setInviteRole("viewer");
    setInviteError("");
    setInviteSuccess("");
    setShowInvite(true);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const deleteMember = members.find((m) => m.id === deleteId);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Breadcrumb */}
        <div className="mb-2 text-sm text-gray-400">
          Settings / <span className="text-white">Members</span>
        </div>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Members</h1>
          <button
            type="button"
            onClick={openInvite}
            className="rounded-lg bg-[var(--od-accent-strong)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--od-accent-deep,#3d4ea4)]"
          >
            Invite member
          </button>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-400">
              {members.length} member{members.length !== 1 ? "s" : ""} in this
              organization
            </p>

            <div className="overflow-hidden rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/50">
                    <th className="px-4 py-2 text-left font-medium text-gray-400">
                      Member
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-400">
                      Role
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-400">
                      Joined
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-gray-800 last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {member.image ? (
                            <img
                              src={member.image}
                              alt={member.name}
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-xs font-medium text-gray-300">
                              {getInitials(member.name)}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-white">
                              {member.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {editingId === member.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={editRole}
                              onChange={(e) =>
                                setEditRole(
                                  e.target.value as
                                    | "admin"
                                    | "editor"
                                    | "viewer",
                                )
                              }
                              className="rounded border border-[var(--od-border)] bg-[var(--od-panel)] px-2 py-1 text-xs text-[var(--od-text)]"
                            >
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleRoleChange(member.id)}
                              disabled={savingRole}
                              className="text-xs text-[var(--od-accent-strong)] hover:text-[var(--od-accent)]"
                            >
                              {savingRole ? "..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="text-xs text-gray-400 hover:text-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[member.role]}`}
                          >
                            {member.role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {formatDate(member.joinedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(member.id);
                              setEditRole(member.role);
                            }}
                            className="text-xs text-gray-400 hover:text-white"
                          >
                            Edit role
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(member.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-[#1a1a1a] p-6">
            <form onSubmit={handleInvite} className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                Invite member
              </h2>
              <p className="text-sm text-gray-400">
                Add a team member by their email address. They must have an
                existing account.
              </p>

              <div className="space-y-2">
                <label
                  htmlFor="invite-email"
                  className="block text-sm font-medium text-gray-300"
                >
                  Email address
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full rounded-lg border border-[var(--od-border)] bg-[var(--od-panel)] px-4 py-2.5 text-sm text-[var(--od-text)] placeholder-[var(--od-text-subtle)] outline-none focus:border-[var(--od-accent)] focus:ring-1 focus:ring-[var(--od-accent)]"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="invite-role"
                  className="block text-sm font-medium text-gray-300"
                >
                  Role
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(
                      e.target.value as "admin" | "editor" | "viewer",
                    )
                  }
                  className="w-full rounded-lg border border-[var(--od-border)] bg-[var(--od-panel)] px-4 py-2.5 text-sm text-[var(--od-text)] outline-none focus:border-[var(--od-accent)] focus:ring-1 focus:ring-[var(--od-accent)]"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {inviteError && (
                <p className="text-sm text-red-400">{inviteError}</p>
              )}
              {inviteSuccess && (
                <p className="text-sm text-[var(--od-success)]">
                  {inviteSuccess}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="flex-1 rounded-lg border border-[var(--od-border)] px-4 py-2.5 text-sm text-[var(--od-text-muted)] transition-colors hover:border-[var(--od-accent)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 rounded-lg bg-[var(--od-accent-strong)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--od-accent-deep,#3d4ea4)] disabled:opacity-50"
                >
                  {inviting ? "Sending..." : "Send invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-[#1a1a1a] p-6">
            <h2 className="mb-2 text-lg font-semibold text-white">
              Remove member
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              Are you sure you want to remove{" "}
              <span className="text-white">
                {deleteMember?.name || "this member"}
              </span>{" "}
              from the organization? They will lose access to all projects.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:border-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
