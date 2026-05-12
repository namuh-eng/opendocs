/**
 * POST /api/v1/assistant/create-message
 *
 * Streams an AI-generated response based on the user's question
 * and relevant documentation pages. Uses AWS Bedrock (Claude).
 *
 * Auth: assistant API key (mint_dsc_ prefix) via Bearer token.
 *
 * Request body: { fp, messages, threadId?, retrievalPageSize?, currentPath? }
 * Response: text/event-stream (SSE) with JSON chunks
 */

import { randomUUID } from "node:crypto";
import { authenticateApiKey } from "@/lib/api-key-auth";
import {
  buildSearchQuery,
  validateCreateMessageRequest,
} from "@/lib/assistant";
import { getAssistantBedrockModelId } from "@/lib/assistant-model";
import { db } from "@/lib/db";
import { assistantConversations, pages, projects } from "@/lib/db/schema";
import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { and, eq, ilike, inArray, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

const bedrock = new BedrockRuntimeClient({ region: "us-east-1" });
const MODEL_ID = getAssistantBedrockModelId();

export async function POST(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const auth = await authenticateApiKey(request.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (auth.type !== "assistant") {
    return NextResponse.json(
      { message: "Forbidden — assistant API key required" },
      { status: 403 },
    );
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
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

  // ── Retrieve relevant pages for context ─────────────────────────────────────
  const lastUserMessage = [...validation.messages]
    .reverse()
    .find((m) => m.role === "user");

  const userQuery = lastUserMessage?.content ?? "";
  let contextPages: Array<{
    path: string;
    title: string;
    content: string | null;
  }> = [];

  if (userQuery) {
    const orgProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.orgId, auth.orgId));

    if (orgProjects.length > 0) {
      const projectIds = orgProjects.map((p) => p.id);
      const pattern = buildSearchQuery(userQuery);

      contextPages = await db
        .select({
          path: pages.path,
          title: pages.title,
          content: pages.content,
        })
        .from(pages)
        .where(
          and(
            inArray(pages.projectId, projectIds),
            eq(pages.isPublished, true),
            or(
              ilike(pages.title, pattern),
              ilike(pages.content, pattern),
              ilike(pages.path, pattern),
            ),
          ),
        )
        .limit(validation.retrievalPageSize);
    }
  }

  // ── Build system prompt with doc context ────────────────────────────────────
  let systemPrompt =
    "You are a helpful documentation assistant. Answer the user's question based on the provided documentation context. Be concise and accurate. If you reference a page, mention its path so the user can find it.";

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

  // ── Build Bedrock messages ──────────────────────────────────────────────────
  const bedrockMessages = validation.messages.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: [{ text: m.content }],
  }));

  // ── Determine thread ID ─────────────────────────────────────────────────────
  const threadId = validation.threadId ?? randomUUID();

  // ── Stream response from Bedrock ────────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = "";

      try {
        const command = new ConverseStreamCommand({
          modelId: MODEL_ID,
          system: [{ text: systemPrompt }],
          messages: bedrockMessages,
          inferenceConfig: {
            maxTokens: 2048,
            temperature: 0.3,
          },
        });

        const response = await bedrock.send(command);

        if (response.stream) {
          for await (const event of response.stream) {
            if (event.contentBlockDelta?.delta?.text) {
              const text = event.contentBlockDelta.delta.text;
              fullResponse += text;

              // Send SSE data chunk
              const chunk = JSON.stringify({
                type: "text-delta",
                textDelta: text,
              });
              controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
            }
          }
        }

        // Send sources as annotations
        if (contextPages.length > 0) {
          const sources = contextPages.map((p) => ({
            sourceType: "url" as const,
            id: p.path,
            url: `/${p.path}`,
            title: p.title,
          }));
          const sourcesChunk = JSON.stringify({
            type: "sources",
            sources,
          });
          controller.enqueue(encoder.encode(`data: ${sourcesChunk}\n\n`));
        }

        // Send finish event with threadId
        const finishChunk = JSON.stringify({
          type: "finish",
          threadId,
        });
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
          .values({
            projectId:
              (
                await db
                  .select({ id: projects.id })
                  .from(projects)
                  .where(eq(projects.orgId, auth.orgId))
                  .limit(1)
              )[0]?.id ?? "00000000-0000-0000-0000-000000000000",
            messages: allMessages,
          })
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
