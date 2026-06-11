import { and, eq, gte, lte, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import {
  categorizeConversation,
  extractFirstUserMessage,
} from "@/lib/analytics-assistant";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  assistantConversations,
  orgMemberships,
  projects,
} from "@/lib/db/schema";

/**
 * GET /api/analytics/assistant?projectId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns:
 * - dailyCounts: conversation counts per day
 * - categories: conversation counts grouped by auto-detected category
 * - chatHistory: recent conversations with first message preview
 * - totalConversations: total conversation count
 * - totalMessages: total message count across all conversations
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get("projectId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 },
    );
  }

  // Verify user has access to this project's org
  const [project] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const [membership] = await db
    .select({ id: orgMemberships.id })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.orgId, project.orgId),
        eq(orgMemberships.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Build date conditions
  const conditions = [eq(assistantConversations.projectId, projectId)];

  if (from) {
    conditions.push(
      gte(assistantConversations.createdAt, new Date(`${from}T00:00:00Z`)),
    );
  }
  if (to) {
    conditions.push(
      lte(assistantConversations.createdAt, new Date(`${to}T23:59:59.999Z`)),
    );
  }

  const whereClause = and(...conditions);

  // Daily counts
  const dailyCounts = await db
    .select({
      date: sql<string>`to_char(${assistantConversations.createdAt}::date, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(assistantConversations)
    .where(whereClause)
    .groupBy(sql`${assistantConversations.createdAt}::date`)
    .orderBy(sql`${assistantConversations.createdAt}::date`);

  // Fetch all conversations for category analysis and chat history
  const conversations = await db
    .select({
      id: assistantConversations.id,
      messages: assistantConversations.messages,
      createdAt: assistantConversations.createdAt,
    })
    .from(assistantConversations)
    .where(whereClause)
    .orderBy(sql`${assistantConversations.createdAt} desc`)
    .limit(200);

  // Build categories by analyzing first user message
  const categoryMap = new Map<string, number>();
  let totalMessages = 0;

  for (const conv of conversations) {
    const msgs = conv.messages ?? [];
    totalMessages += msgs.length;
    const firstMsg = extractFirstUserMessage(msgs);
    const category = categorizeConversation(firstMsg);
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + 1);
  }

  const categories = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Build chat history
  const chatHistory = conversations.slice(0, 50).map((conv) => {
    const msgs = conv.messages ?? [];
    const firstMsg = extractFirstUserMessage(msgs);
    return {
      id: conv.id,
      firstMessage: firstMsg,
      messageCount: msgs.length,
      createdAt: conv.createdAt.toISOString(),
    };
  });

  // Total count
  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(assistantConversations)
    .where(whereClause);

  return NextResponse.json({
    dailyCounts,
    categories,
    chatHistory,
    totalConversations: totalRow?.count ?? 0,
    totalMessages,
  });
}
