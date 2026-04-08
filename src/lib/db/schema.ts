import { pgEnum, pgTable } from "drizzle-orm/pg-core";
import * as t from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────────────────────────────

export const orgPlanEnum = pgEnum("org_plan", ["free", "pro", "enterprise"]);
export const orgRoleEnum = pgEnum("org_role", ["admin", "editor", "viewer"]);
export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "deploying",
  "error",
]);
export const deploymentStatusEnum = pgEnum("deployment_status", [
  "queued",
  "in_progress",
  "succeeded",
  "failed",
]);
export const apiKeyTypeEnum = pgEnum("api_key_type", ["admin", "assistant"]);
export const agentJobStatusEnum = pgEnum("agent_job_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
]);
export const analyticsEventTypeEnum = pgEnum("analytics_event_type", [
  "view",
  "search",
  "feedback",
]);

// ── Organizations ──────────────────────────────────────────────────────────────

export const organizations = pgTable(
  "organizations",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    name: t.varchar({ length: 256 }).notNull(),
    slug: t.varchar({ length: 256 }).notNull(),
    plan: orgPlanEnum().default("free").notNull(),
    settings: t.jsonb().$type<Record<string, unknown>>().default({}),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [t.uniqueIndex("org_slug_idx").on(table.slug)],
);

// ── Org Memberships ────────────────────────────────────────────────────────────

export const orgMemberships = pgTable(
  "org_memberships",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    orgId: t
      .uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: t.text("user_id").notNull(),
    role: orgRoleEnum().default("viewer").notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    t.index("membership_org_idx").on(table.orgId),
    t.index("membership_user_idx").on(table.userId),
    t.uniqueIndex("membership_org_user_idx").on(table.orgId, table.userId),
  ],
);

// ── Projects ───────────────────────────────────────────────────────────────────

export const projects = pgTable(
  "projects",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    orgId: t
      .uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: t.varchar({ length: 256 }).notNull(),
    slug: t.varchar({ length: 256 }).notNull(),
    repoUrl: t.text("repo_url"),
    repoBranch: t.varchar("repo_branch", { length: 256 }).default("main"),
    repoPath: t.varchar("repo_path", { length: 512 }).default("/"),
    customDomain: t.varchar("custom_domain", { length: 256 }),
    subdomain: t.varchar({ length: 256 }),
    settings: t.jsonb().$type<Record<string, unknown>>().default({}),
    status: projectStatusEnum().default("active").notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    t.index("project_org_idx").on(table.orgId),
    t.uniqueIndex("project_org_slug_idx").on(table.orgId, table.slug),
  ],
);

// ── Deployments ────────────────────────────────────────────────────────────────

export const deployments = pgTable(
  "deployments",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    projectId: t
      .uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    status: deploymentStatusEnum().default("queued").notNull(),
    commitSha: t.varchar("commit_sha", { length: 40 }),
    commitMessage: t.text("commit_message"),
    startedAt: t.timestamp("started_at", { withTimezone: true }),
    endedAt: t.timestamp("ended_at", { withTimezone: true }),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [t.index("deployment_project_idx").on(table.projectId)],
);

// ── Pages ──────────────────────────────────────────────────────────────────────

export const pages = pgTable(
  "pages",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    projectId: t
      .uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    path: t.varchar({ length: 512 }).notNull(),
    title: t.varchar({ length: 512 }).notNull(),
    description: t.text(),
    content: t.text().default(""),
    frontmatter: t.jsonb().$type<Record<string, unknown>>().default({}),
    isPublished: t.boolean("is_published").default(false).notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    t.index("page_project_idx").on(table.projectId),
    t.uniqueIndex("page_project_path_idx").on(table.projectId, table.path),
  ],
);

// ── API Keys ───────────────────────────────────────────────────────────────────

export const apiKeys = pgTable(
  "api_keys",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    orgId: t
      .uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: t.varchar({ length: 256 }).notNull(),
    keyPrefix: t.varchar("key_prefix", { length: 20 }).notNull(),
    keyHash: t.text("key_hash").notNull(),
    type: apiKeyTypeEnum().default("admin").notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastUsedAt: t.timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [
    t.index("api_key_org_idx").on(table.orgId),
    t.index("api_key_prefix_idx").on(table.keyPrefix),
  ],
);

// ── Agent Jobs ─────────────────────────────────────────────────────────────────

export const agentJobs = pgTable(
  "agent_jobs",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    projectId: t
      .uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    prompt: t.text().notNull(),
    status: agentJobStatusEnum().default("pending").notNull(),
    prUrl: t.text("pr_url"),
    messages: t
      .json()
      .$type<{ role: "user" | "agent"; content: string; timestamp: string }[]>()
      .default([])
      .notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [t.index("agent_job_project_idx").on(table.projectId)],
);

// ── Assistant Conversations ────────────────────────────────────────────────────

export const assistantConversations = pgTable(
  "assistant_conversations",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    projectId: t
      .uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    messages: t
      .jsonb()
      .$type<Array<{ role: string; content: string }>>()
      .default([]),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [t.index("conversation_project_idx").on(table.projectId)],
);

// ── Analytics Events ───────────────────────────────────────────────────────────

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    projectId: t
      .uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    pageId: t
      .uuid("page_id")
      .references(() => pages.id, { onDelete: "set null" }),
    type: analyticsEventTypeEnum().notNull(),
    data: t.jsonb().$type<Record<string, unknown>>().default({}),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    t.index("analytics_project_idx").on(table.projectId),
    t.index("analytics_type_idx").on(table.type),
    t.index("analytics_created_idx").on(table.createdAt),
  ],
);

// ── Agent Settings ────────────────────────────────────────────────────────────

export const agentSettings = pgTable(
  "agent_settings",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    orgId: t
      .uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    agentEnabled: t.boolean("agent_enabled").default(false).notNull(),
    slackConnected: t.boolean("slack_connected").default(false).notNull(),
    slackWorkspace: t.varchar("slack_workspace", { length: 256 }),
    githubAppInstalled: t
      .boolean("github_app_installed")
      .default(false)
      .notNull(),
    connectedRepos: t
      .jsonb("connected_repos")
      .$type<
        Array<{
          org: string;
          repo: string;
          branch: string;
          permissions: string;
        }>
      >()
      .default([]),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [t.uniqueIndex("agent_settings_org_idx").on(table.orgId)],
);

// ── Audit Logs ─────────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: t.uuid().defaultRandom().primaryKey(),
    orgId: t
      .uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: t.text("user_id"),
    action: t.varchar({ length: 256 }).notNull(),
    details: t.jsonb().$type<Record<string, unknown>>().default({}),
    createdAt: t
      .timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    t.index("audit_org_idx").on(table.orgId),
    t.index("audit_created_idx").on(table.createdAt),
  ],
);
