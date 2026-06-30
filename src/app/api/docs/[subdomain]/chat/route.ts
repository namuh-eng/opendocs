/**
 * POST /api/docs/[subdomain]/chat
 *
 * Public-facing docs chat endpoint. Streams AI responses using OpenAI
 * with documentation context from the project's published pages.
 * No API key required — scoped by subdomain.
 *
 * Request body: { fp, messages, threadId?, currentPath? }
 * Response: text/event-stream (SSE)
 */

import { randomUUID } from "node:crypto";
import { and, eq, ilike, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import {
  buildSearchQuery,
  validateCreateMessageRequest,
} from "@/lib/assistant";
import { streamAssistantReply } from "@/lib/assistant-llm";
import { db } from "@/lib/db";
import { assistantConversations, pages, projects } from "@/lib/db/schema";
import {
  getDocsAccessCookieName,
  hasValidDocsAccess,
} from "@/lib/project-docs-access";
import { filterPublicDocsVisiblePages } from "@/lib/public-docs-curation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> },
) {
  const { subdomain } = await params;

  // ── Find project by subdomain ──────────────────────────────────────────────
  const projectResult = await db
    .select({
      id: projects.id,
      name: projects.name,
      settings: projects.settings,
    })
    .from(projects)
    .where(eq(projects.subdomain, subdomain))
    .limit(1);

  if (projectResult.length === 0) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  const project = projectResult[0];
  if (
    !hasValidDocsAccess(
      project.settings,
      subdomain,
      request.cookies.get(getDocsAccessCookieName(subdomain))?.value,
    )
  ) {
    return NextResponse.json(
      { message: "Docs password required" },
      { status: 401 },
    );
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateCreateMessageRequest(body);
  if (!validation.valid) {
    return NextResponse.json({ message: validation.error }, { status: 400 });
  }

  // ── Retrieve relevant pages for context ────────────────────────────────────
  const lastUserMessage = [...validation.messages]
    .reverse()
    .find((m) => m.role === "user");

  const userQuery = lastUserMessage?.content ?? "";
  let contextPages: Array<{
    path: string;
    title: string;
    content: string | null;
    frontmatter?: Record<string, unknown> | null;
  }> = [];

  if (userQuery) {
    const pattern = buildSearchQuery(userQuery);
    contextPages = await db
      .select({
        path: pages.path,
        title: pages.title,
        content: pages.content,
        frontmatter: pages.frontmatter,
      })
      .from(pages)
      .where(
        and(
          eq(pages.projectId, project.id),
          eq(pages.isPublished, true),
          or(
            ilike(pages.title, pattern),
            ilike(pages.content, pattern),
            ilike(pages.path, pattern),
          ),
        ),
      )
      .limit(Math.min(validation.retrievalPageSize * 3, 30));
    contextPages = filterPublicDocsVisiblePages(contextPages).slice(
      0,
      validation.retrievalPageSize,
    );
  }

  // ── Build system prompt ────────────────────────────────────────────────────
  let systemPrompt = `You are a helpful documentation assistant for "${project.name}". Answer the user's question based on the provided documentation context. Be concise and accurate. If you reference a page, mention its path so the user can find it.`;

  if (contextPages.length > 0) {
    const docContext = contextPages
      .map(
        (p) =>
          `--- Page: ${p.path} (${p.title}) ---\n${(p.content ?? "").slice(0, 2000)}`,
      )
      .join("\n\n");
    systemPrompt += `\n\nRelevant documentation:\n${docContext}`;
  } else {
    systemPrompt +=
      "\n\nNo relevant documentation pages were found for this query. Let the user know and suggest they refine their question.";
  }

  if (validation.currentPath) {
    systemPrompt += `\n\nThe user is currently viewing the page: ${validation.currentPath}`;
  }

  // ── Build assistant messages ───────────────────────────────────────────────
  const llmMessages = validation.messages.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  const threadId = validation.threadId ?? randomUUID();

  // ── Stream response ────────────────────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = "";

      try {
        for await (const text of streamAssistantReply({
          systemPrompt,
          messages: llmMessages,
        })) {
          fullResponse += text;
          const chunk = JSON.stringify({
            type: "text-delta",
            textDelta: text,
          });
          controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
        }

        // Send sources
        if (contextPages.length > 0) {
          const sources = contextPages.map((p) => ({
            sourceType: "url" as const,
            id: p.path,
            url: `/${p.path}`,
            title: p.title,
          }));
          const sourcesChunk = JSON.stringify({ type: "sources", sources });
          controller.enqueue(encoder.encode(`data: ${sourcesChunk}\n\n`));
        }

        // Send finish
        const finishChunk = JSON.stringify({ type: "finish", threadId });
        controller.enqueue(encoder.encode(`data: ${finishChunk}\n\n`));

        // Persist conversation (fire-and-forget)
        const allMessages = [
          ...validation.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          { role: "assistant", content: fullResponse },
        ];

        db.insert(assistantConversations)
          .values({ projectId: project.id, messages: allMessages })
          .then(() => {})
          .catch(() => {});
      } catch (err) {
        const errorChunk = JSON.stringify({
          type: "error",
          error:
            err instanceof Error ? err.message : "Failed to generate response",
        });
        controller.enqueue(encoder.encode(`data: ${errorChunk}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
