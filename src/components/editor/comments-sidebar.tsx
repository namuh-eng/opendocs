"use client";

import { clsx } from "clsx";
import { Check, MessageSquare, RotateCcw, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CommentThread } from "@/lib/collaboration";
import { formatCommentDate } from "@/lib/collaboration";

interface CommentsSidebarProps {
  pageId: string | null;
  onClose: () => void;
}

export function CommentsSidebar({ pageId, onClose }: CommentsSidebarProps) {
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [submitting, setSubmitting] = useState(false);
  const newCommentRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = useCallback(async () => {
    if (!pageId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pages/${pageId}/comments`);
      const data = await res.json();
      if (data.comments) {
        // Build threads from flat list
        const flat = data.comments as Array<{
          id: string;
          pageId: string;
          userId: string;
          parentId: string | null;
          content: string;
          resolved: boolean;
          createdAt: string;
          updatedAt: string;
        }>;

        const topLevel = flat.filter((c) => !c.parentId);
        const repliesMap = new Map<string, typeof flat>();
        for (const c of flat) {
          if (c.parentId) {
            const existing = repliesMap.get(c.parentId) ?? [];
            existing.push(c);
            repliesMap.set(c.parentId, existing);
          }
        }

        const built: CommentThread[] = topLevel.map((c) => ({
          id: c.id,
          pageId: c.pageId,
          userId: c.userId,
          content: c.content,
          resolved: c.resolved,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          replies: (repliesMap.get(c.id) ?? [])
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            )
            .map((r) => ({
              id: r.id,
              userId: r.userId,
              content: r.content,
              createdAt: r.createdAt,
            })),
        }));
        setThreads(built);
      }
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const filteredThreads = threads.filter((t) => {
    if (filter === "open") return !t.resolved;
    if (filter === "resolved") return t.resolved;
    return true;
  });

  async function handleSubmitComment() {
    if (!pageId || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/pages/${pageId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      if (res.ok) {
        setNewComment("");
        fetchComments();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReply(parentId: string) {
    if (!pageId || !replyContent.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/pages/${pageId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent, parentId }),
      });
      if (res.ok) {
        setReplyTo(null);
        setReplyContent("");
        fetchComments();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResolve(commentId: string, resolved: boolean) {
    if (!pageId) return;
    await fetch(`/api/pages/${pageId}/comments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, resolved }),
    });
    fetchComments();
  }

  return (
    <div
      className="w-80 border-l border-white/[0.08] bg-[#0f0f0f] flex flex-col shrink-0"
      data-testid="comments-sidebar"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-white">Comments</span>
          <span className="text-xs text-gray-500">
            ({threads.filter((t) => !t.resolved).length} open)
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Close comments"
        >
          <X size={14} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-white/[0.08]">
        {(["all", "open", "resolved"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={clsx(
              "px-2 py-1 text-xs rounded transition-colors capitalize",
              filter === f
                ? "bg-white/[0.08] text-white"
                : "text-gray-500 hover:text-gray-300",
            )}
            data-testid={`filter-${f}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-600">
            Loading comments...
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageSquare size={24} className="mx-auto mb-2 text-gray-700" />
            <p className="text-sm text-gray-500">No comments yet</p>
            <p className="text-xs text-gray-600 mt-1">
              Start a conversation about this page
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filteredThreads.map((thread) => (
              <div
                key={thread.id}
                className={clsx("px-4 py-3", thread.resolved && "opacity-60")}
                data-testid={`comment-thread-${thread.id}`}
              >
                {/* Thread header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[var(--od-accent-soft)] flex items-center justify-center text-[10px] text-[var(--od-accent-strong)] font-medium">
                      {(thread.userName ?? thread.userId)
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatCommentDate(thread.createdAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResolve(thread.id, !thread.resolved)}
                    className={clsx(
                      "p-1 rounded text-xs transition-colors",
                      thread.resolved
                        ? "text-gray-500 hover:text-white"
                        : "text-[var(--od-success)] hover:text-[var(--od-accent-strong)]",
                    )}
                    title={thread.resolved ? "Reopen" : "Resolve"}
                    data-testid={`resolve-btn-${thread.id}`}
                  >
                    {thread.resolved ? (
                      <RotateCcw size={12} />
                    ) : (
                      <Check size={12} />
                    )}
                  </button>
                </div>

                {/* Content */}
                <p className="text-sm text-gray-300 mb-2">{thread.content}</p>

                {/* Replies */}
                {thread.replies.length > 0 && (
                  <div className="ml-4 space-y-2 mb-2">
                    {thread.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-2">
                        <div className="w-4 h-4 rounded-full bg-blue-600/30 flex items-center justify-center text-[9px] text-blue-400 font-medium shrink-0 mt-0.5">
                          {(reply.userName ?? reply.userId)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">
                            {reply.content}
                          </p>
                          <span className="text-[10px] text-gray-600">
                            {formatCommentDate(reply.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply input */}
                {replyTo === thread.id ? (
                  <div className="flex gap-1 mt-1">
                    <input
                      type="text"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Reply..."
                      className="flex-1 px-2 py-1 text-xs bg-[#1a1a1a] border border-white/[0.08] rounded text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)]"
                      data-testid={`reply-input-${thread.id}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleReply(thread.id);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleReply(thread.id)}
                      disabled={submitting || !replyContent.trim()}
                      className="p-1 rounded text-[var(--od-accent-strong)] hover:text-[var(--od-accent)] disabled:opacity-50"
                    >
                      <Send size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyTo(null);
                        setReplyContent("");
                      }}
                      className="p-1 rounded text-gray-500 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setReplyTo(thread.id)}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    data-testid={`reply-btn-${thread.id}`}
                  >
                    Reply
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New comment input */}
      <div className="border-t border-white/[0.08] p-3">
        <div className="flex gap-2">
          <textarea
            ref={newCommentRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            className="flex-1 px-3 py-2 text-sm bg-[#1a1a1a] border border-white/[0.08] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)] resize-none"
            data-testid="new-comment-input"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-[10px] text-gray-600">⌘+Enter to send</span>
          <button
            type="button"
            onClick={handleSubmitComment}
            disabled={submitting || !newComment.trim()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-[var(--od-accent-strong)] rounded-md hover:bg-[var(--od-accent-deep,#3d4ea4)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="submit-comment-btn"
          >
            {submitting ? "Sending..." : "Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}
