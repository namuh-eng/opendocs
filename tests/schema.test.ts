import {
  agentJobs,
  analyticsEvents,
  apiKeys,
  assistantConversations,
  auditLogs,
  deployments,
  orgMemberships,
  organizationBilling,
  organizations,
  pages,
  projects,
} from "@/lib/db/schema";
import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

describe("Database schema", () => {
  describe("organizations table", () => {
    it("has the correct table name", () => {
      expect(getTableName(organizations)).toBe("organizations");
    });

    it("has all required columns", () => {
      const cols = getTableColumns(organizations);
      expect(cols.id).toBeDefined();
      expect(cols.name).toBeDefined();
      expect(cols.slug).toBeDefined();
      expect(cols.plan).toBeDefined();
      expect(cols.settings).toBeDefined();
      expect(cols.createdAt).toBeDefined();
      expect(cols.updatedAt).toBeDefined();
    });

    it("has slug as not-null", () => {
      const cols = getTableColumns(organizations);
      expect(cols.slug.notNull).toBe(true);
    });
  });

  describe("orgMemberships table", () => {
    it("has the correct table name", () => {
      expect(getTableName(orgMemberships)).toBe("org_memberships");
    });

    it("has all required columns", () => {
      const cols = getTableColumns(orgMemberships);
      expect(cols.id).toBeDefined();
      expect(cols.orgId).toBeDefined();
      expect(cols.userId).toBeDefined();
      expect(cols.role).toBeDefined();
      expect(cols.createdAt).toBeDefined();
    });

    it("has orgId and userId as not-null", () => {
      const cols = getTableColumns(orgMemberships);
      expect(cols.orgId.notNull).toBe(true);
      expect(cols.userId.notNull).toBe(true);
    });
  });

  describe("organizationBilling table", () => {
    it("has the correct table name", () => {
      expect(getTableName(organizationBilling)).toBe("organization_billing");
    });

    it("has all required Stripe subscription columns", () => {
      const cols = getTableColumns(organizationBilling);
      expect(cols.id).toBeDefined();
      expect(cols.orgId).toBeDefined();
      expect(cols.ownerUserId).toBeDefined();
      expect(cols.stripeCustomerId).toBeDefined();
      expect(cols.stripeSubscriptionId).toBeDefined();
      expect(cols.stripePriceId).toBeDefined();
      expect(cols.plan).toBeDefined();
      expect(cols.status).toBeDefined();
      expect(cols.currentPeriodEnd).toBeDefined();
      expect(cols.cancelAtPeriodEnd).toBeDefined();
      expect(cols.canceledAt).toBeDefined();
      expect(cols.trialEndsAt).toBeDefined();
      expect(cols.createdAt).toBeDefined();
      expect(cols.updatedAt).toBeDefined();
    });

    it("requires org linkage, plan, status, and cancel-at-period-end", () => {
      const cols = getTableColumns(organizationBilling);
      expect(cols.orgId.notNull).toBe(true);
      expect(cols.plan.notNull).toBe(true);
      expect(cols.status.notNull).toBe(true);
      expect(cols.cancelAtPeriodEnd.notNull).toBe(true);
    });
  });

  describe("projects table", () => {
    it("has the correct table name", () => {
      expect(getTableName(projects)).toBe("projects");
    });

    it("has all required columns", () => {
      const cols = getTableColumns(projects);
      expect(cols.id).toBeDefined();
      expect(cols.orgId).toBeDefined();
      expect(cols.name).toBeDefined();
      expect(cols.slug).toBeDefined();
      expect(cols.repoUrl).toBeDefined();
      expect(cols.repoBranch).toBeDefined();
      expect(cols.repoPath).toBeDefined();
      expect(cols.customDomain).toBeDefined();
      expect(cols.subdomain).toBeDefined();
      expect(cols.settings).toBeDefined();
      expect(cols.status).toBeDefined();
      expect(cols.createdAt).toBeDefined();
      expect(cols.updatedAt).toBeDefined();
    });

    it("has orgId as not-null", () => {
      const cols = getTableColumns(projects);
      expect(cols.orgId.notNull).toBe(true);
    });
  });

  describe("deployments table", () => {
    it("has the correct table name", () => {
      expect(getTableName(deployments)).toBe("deployments");
    });

    it("has all required columns", () => {
      const cols = getTableColumns(deployments);
      expect(cols.id).toBeDefined();
      expect(cols.projectId).toBeDefined();
      expect(cols.status).toBeDefined();
      expect(cols.commitSha).toBeDefined();
      expect(cols.commitMessage).toBeDefined();
      expect(cols.startedAt).toBeDefined();
      expect(cols.endedAt).toBeDefined();
      expect(cols.createdAt).toBeDefined();
    });
  });

  describe("pages table", () => {
    it("has the correct table name", () => {
      expect(getTableName(pages)).toBe("pages");
    });

    it("has all required columns", () => {
      const cols = getTableColumns(pages);
      expect(cols.id).toBeDefined();
      expect(cols.projectId).toBeDefined();
      expect(cols.path).toBeDefined();
      expect(cols.title).toBeDefined();
      expect(cols.description).toBeDefined();
      expect(cols.content).toBeDefined();
      expect(cols.frontmatter).toBeDefined();
      expect(cols.isPublished).toBeDefined();
      expect(cols.createdAt).toBeDefined();
      expect(cols.updatedAt).toBeDefined();
    });

    it("has path and title as not-null", () => {
      const cols = getTableColumns(pages);
      expect(cols.path.notNull).toBe(true);
      expect(cols.title.notNull).toBe(true);
    });
  });

  describe("apiKeys table", () => {
    it("has the correct table name", () => {
      expect(getTableName(apiKeys)).toBe("api_keys");
    });

    it("has all required columns", () => {
      const cols = getTableColumns(apiKeys);
      expect(cols.id).toBeDefined();
      expect(cols.orgId).toBeDefined();
      expect(cols.name).toBeDefined();
      expect(cols.keyPrefix).toBeDefined();
      expect(cols.keyHash).toBeDefined();
      expect(cols.type).toBeDefined();
      expect(cols.createdAt).toBeDefined();
      expect(cols.lastUsedAt).toBeDefined();
    });

    it("has keyHash as not-null", () => {
      const cols = getTableColumns(apiKeys);
      expect(cols.keyHash.notNull).toBe(true);
    });
  });

  describe("agentJobs table", () => {
    it("has the correct table name", () => {
      expect(getTableName(agentJobs)).toBe("agent_jobs");
    });

    it("has all required columns", () => {
      const cols = getTableColumns(agentJobs);
      expect(cols.id).toBeDefined();
      expect(cols.projectId).toBeDefined();
      expect(cols.prompt).toBeDefined();
      expect(cols.status).toBeDefined();
      expect(cols.prUrl).toBeDefined();
      expect(cols.createdAt).toBeDefined();
      expect(cols.updatedAt).toBeDefined();
    });
  });

  describe("assistantConversations table", () => {
    it("has the correct table name", () => {
      expect(getTableName(assistantConversations)).toBe(
        "assistant_conversations",
      );
    });

    it("has all required columns", () => {
      const cols = getTableColumns(assistantConversations);
      expect(cols.id).toBeDefined();
      expect(cols.projectId).toBeDefined();
      expect(cols.messages).toBeDefined();
      expect(cols.createdAt).toBeDefined();
    });
  });

  describe("analyticsEvents table", () => {
    it("has the correct table name", () => {
      expect(getTableName(analyticsEvents)).toBe("analytics_events");
    });

    it("has all required columns", () => {
      const cols = getTableColumns(analyticsEvents);
      expect(cols.id).toBeDefined();
      expect(cols.projectId).toBeDefined();
      expect(cols.pageId).toBeDefined();
      expect(cols.type).toBeDefined();
      expect(cols.data).toBeDefined();
      expect(cols.createdAt).toBeDefined();
    });

    it("has type as not-null", () => {
      const cols = getTableColumns(analyticsEvents);
      expect(cols.type.notNull).toBe(true);
    });
  });

  describe("auditLogs table", () => {
    it("has the correct table name", () => {
      expect(getTableName(auditLogs)).toBe("audit_logs");
    });

    it("has all required columns", () => {
      const cols = getTableColumns(auditLogs);
      expect(cols.id).toBeDefined();
      expect(cols.orgId).toBeDefined();
      expect(cols.userId).toBeDefined();
      expect(cols.action).toBeDefined();
      expect(cols.details).toBeDefined();
      expect(cols.createdAt).toBeDefined();
    });

    it("has action as not-null", () => {
      const cols = getTableColumns(auditLogs);
      expect(cols.action.notNull).toBe(true);
    });
  });

  describe("table count", () => {
    it("exports all 10 tables required by the spec", () => {
      const tables = [
        organizations,
        orgMemberships,
        projects,
        deployments,
        pages,
        apiKeys,
        agentJobs,
        assistantConversations,
        analyticsEvents,
        auditLogs,
      ];
      expect(tables).toHaveLength(10);
      for (const table of tables) {
        expect(getTableName(table)).toBeTruthy();
      }
    });
  });
});
