"use client";

import { useCallback, useEffect, useState } from "react";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  type: "admin" | "assistant";
  createdAt: string;
  lastUsedAt: string | null;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<"admin" | "assistant">("admin");
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Newly created key (shown once)
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    const trimmed = keyName.trim();
    if (!trimmed) {
      setCreateError("API key name is required");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, type: createType }),
      });

      if (!res.ok) {
        const data = await res.json();
        setCreateError(data.error || "Failed to create key");
        return;
      }

      const data = await res.json();
      setNewRawKey(data.rawKey);
      setCopied(false);
      setKeyName("");
      // Refresh list
      await fetchKeys();
    } catch {
      setCreateError("Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/api-keys/${deleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== deleteId));
        setDeleteId(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  };

  const openCreate = (type: "admin" | "assistant") => {
    setCreateType(type);
    setKeyName("");
    setCreateError("");
    setNewRawKey(null);
    setCopied(false);
    setShowCreateModal(true);
  };

  const closeCreate = () => {
    setShowCreateModal(false);
    setNewRawKey(null);
    setCopied(false);
  };

  const adminKeys = keys.filter((k) => k.type === "admin");
  const assistantKeys = keys.filter((k) => k.type === "assistant");

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Header */}
        <div className="mb-2 text-sm text-gray-400">
          Settings / <span className="text-white">API keys</span>
        </div>
        <h1 className="mb-8 text-2xl font-semibold">API keys</h1>

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : (
          <>
            {/* Admin API Keys Section */}
            <section className="mb-10">
              <h2 className="mb-1 text-lg font-medium">Admin API keys</h2>
              <p className="mb-4 text-sm text-gray-400">
                Learn more about how to use the API in our docs
              </p>

              <h3 className="mb-2 text-sm font-medium text-gray-300">
                Active admin keys
              </h3>
              <p className="mb-4 text-sm text-gray-500">
                Please ensure to copy your API keys once generated as you may
                not be able to see them again.
              </p>

              {adminKeys.length > 0 && (
                <div className="mb-4 overflow-hidden rounded-lg border border-gray-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-900/50">
                        <th className="px-4 py-2 text-left font-medium text-gray-400">
                          Name
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-400">
                          Key
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-400">
                          Created
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-gray-400">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminKeys.map((key) => (
                        <tr
                          key={key.id}
                          className="border-b border-gray-800 last:border-b-0"
                        >
                          <td className="px-4 py-3 text-white">{key.name}</td>
                          <td className="px-4 py-3 font-mono text-gray-400">
                            {key.keyPrefix}....
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {formatDate(key.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setDeleteId(key.id)}
                              className="text-sm text-red-400 hover:text-red-300"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                type="button"
                onClick={() => openCreate("admin")}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
              >
                + Create Admin API Key
              </button>
            </section>

            {/* Assistant API Keys Section */}
            <section className="mb-10">
              <h2 className="mb-1 text-lg font-medium">Assistant API keys</h2>
              <p className="mb-4 text-sm text-gray-400">
                Create public API keys for the assistant API
              </p>

              <h3 className="mb-2 text-sm font-medium text-gray-300">
                Active assistant keys
              </h3>
              <p className="mb-4 text-sm text-gray-500">
                Please ensure to copy your API keys once generated as you may
                not be able to see them again.
              </p>

              {assistantKeys.length > 0 && (
                <div className="mb-4 overflow-hidden rounded-lg border border-gray-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-900/50">
                        <th className="px-4 py-2 text-left font-medium text-gray-400">
                          Name
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-400">
                          Key
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-400">
                          Created
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-gray-400">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {assistantKeys.map((key) => (
                        <tr
                          key={key.id}
                          className="border-b border-gray-800 last:border-b-0"
                        >
                          <td className="px-4 py-3 text-white">{key.name}</td>
                          <td className="px-4 py-3 font-mono text-gray-400">
                            {key.keyPrefix}....
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {formatDate(key.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setDeleteId(key.id)}
                              className="text-sm text-red-400 hover:text-red-300"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                type="button"
                onClick={() => openCreate("assistant")}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
              >
                + Create Assistant API Key
              </button>
            </section>
          </>
        )}
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-[#1a1a1a] p-6">
            {newRawKey ? (
              /* Show the newly created key */
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">
                  API key created
                </h2>
                <p className="text-sm text-gray-400">
                  Copy this key now. It will only be shown once and cannot be
                  retrieved later.
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 p-3">
                  <code className="flex-1 break-all font-mono text-sm text-green-400">
                    {newRawKey}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(newRawKey)}
                    className="shrink-0 rounded-md bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={closeCreate}
                  className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-500"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Create key form */
              <form onSubmit={handleCreate} className="space-y-4">
                <h2 className="text-lg font-semibold text-white">
                  Create {createType === "admin" ? "Admin" : "Assistant"} API
                  key
                </h2>
                <div className="space-y-2">
                  <label
                    htmlFor="key-name"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Key name
                  </label>
                  <input
                    id="key-name"
                    type="text"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="e.g. Production API key"
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />
                  {createError && (
                    <p className="text-sm text-red-400">{createError}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeCreate}
                    className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:border-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-500 disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-[#1a1a1a] p-6">
            <h2 className="mb-2 text-lg font-semibold text-white">
              Revoke API key
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              Are you sure you want to revoke this API key? This action cannot
              be undone. Any applications using this key will stop working.
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
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
