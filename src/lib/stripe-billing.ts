import { db } from "@/lib/db";
import { orgMemberships, organizations } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import type Stripe from "stripe";

type OrgPlan = "free" | "pro" | "enterprise";

export type BillingSettings = {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionStatus?: string;
  stripePriceId?: string;
  stripeCurrentPeriodEnd?: string | null;
  stripeLatestInvoiceId?: string;
  stripeLatestInvoiceStatus?: string | null;
  stripeLastPaymentStatus?: "succeeded" | "failed";
  stripeLastEventId?: string;
  stripeLastEventType?: string;
  stripeLastUpdatedAt?: string;
};

type OrgSettings = Record<string, unknown> & { billing?: BillingSettings };

export type BillingOrgContext = {
  id: string;
  name: string;
  slug: string;
  plan: OrgPlan;
  role: "admin" | "editor" | "viewer";
  settings: OrgSettings;
};

export function readBillingSettings(settings: unknown): BillingSettings {
  if (!settings || typeof settings !== "object") return {};
  const billing = (settings as { billing?: unknown }).billing;
  if (!billing || typeof billing !== "object") return {};
  return billing as BillingSettings;
}

export function mergeBillingSettings(
  settings: unknown,
  updates: BillingSettings,
): OrgSettings {
  const base =
    settings && typeof settings === "object"
      ? ({ ...(settings as Record<string, unknown>) } as OrgSettings)
      : ({} as OrgSettings);

  base.billing = {
    ...readBillingSettings(base),
    ...updates,
    stripeLastUpdatedAt:
      updates.stripeLastUpdatedAt ?? new Date().toISOString(),
  };

  return base;
}

export function canManageBilling(role: BillingOrgContext["role"]) {
  return role === "admin";
}

export async function getBillingOrgForUser(
  userId: string,
): Promise<BillingOrgContext | null> {
  const rows = await db
    .select({
      orgId: orgMemberships.orgId,
      role: orgMemberships.role,
      org: {
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        plan: organizations.plan,
        settings: organizations.settings,
      },
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(eq(orgMemberships.userId, userId))
    .limit(1);

  if (rows.length === 0) return null;
  return {
    ...rows[0].org,
    role: rows[0].role,
    settings: (rows[0].org.settings ?? {}) as OrgSettings,
  };
}

export async function updateOrgBillingState(
  org: Pick<BillingOrgContext, "id" | "settings">,
  updates: BillingSettings,
  plan?: OrgPlan,
) {
  const settings = mergeBillingSettings(org.settings, updates);
  await db
    .update(organizations)
    .set({
      settings,
      ...(plan ? { plan } : {}),
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, org.id));
  return settings.billing ?? {};
}

export async function findOrgByStripeCustomerId(customerId: string) {
  const rows = await db
    .select({
      id: organizations.id,
      plan: organizations.plan,
      settings: organizations.settings,
    })
    .from(organizations)
    .where(
      sql`${organizations.settings}->'billing'->>'stripeCustomerId' = ${customerId}`,
    )
    .limit(1);

  return rows[0] ?? null;
}

function getCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

function unixToIso(seconds: number | null | undefined) {
  return typeof seconds === "number"
    ? new Date(seconds * 1000).toISOString()
    : null;
}

function subscriptionPlan(status: string | null | undefined): OrgPlan {
  return status === "active" || status === "trialing" ? "pro" : "free";
}

function subscriptionCustomerId(subscription: Stripe.Subscription) {
  return getCustomerId(subscription.customer);
}

function subscriptionUpdates(
  subscription: Stripe.Subscription,
  event: Stripe.Event,
): BillingSettings {
  const firstItem = subscription.items.data[0];
  return {
    stripeCustomerId: subscriptionCustomerId(subscription) ?? undefined,
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionStatus: subscription.status,
    stripePriceId: firstItem?.price?.id,
    stripeCurrentPeriodEnd: unixToIso(firstItem?.current_period_end),
    stripeLastEventId: event.id,
    stripeLastEventType: event.type,
  };
}

async function updateOrgForSubscription(
  subscription: Stripe.Subscription,
  event: Stripe.Event,
) {
  const customerId = subscriptionCustomerId(subscription);
  if (!customerId) return false;

  const org = await findOrgByStripeCustomerId(customerId);
  if (!org) return false;

  await updateOrgBillingState(
    { id: org.id, settings: (org.settings ?? {}) as OrgSettings },
    subscriptionUpdates(subscription, event),
    subscriptionPlan(subscription.status),
  );
  return true;
}

async function updateOrgForInvoice(
  invoice: Stripe.Invoice,
  event: Stripe.Event,
) {
  const customerId = getCustomerId(invoice.customer);
  if (!customerId) return false;

  const org = await findOrgByStripeCustomerId(customerId);
  if (!org) return false;

  await updateOrgBillingState(
    { id: org.id, settings: (org.settings ?? {}) as OrgSettings },
    {
      stripeCustomerId: customerId,
      stripeLatestInvoiceId: invoice.id,
      stripeLatestInvoiceStatus: invoice.status,
      stripeLastPaymentStatus:
        event.type === "invoice.payment_succeeded" ? "succeeded" : "failed",
      stripeLastEventId: event.id,
      stripeLastEventType: event.type,
    },
  );
  return true;
}

async function updateOrgForCompletedCheckout(
  session: Stripe.Checkout.Session,
  event: Stripe.Event,
) {
  const orgId = session.metadata?.orgId;
  const customerId = getCustomerId(session.customer);
  if (!orgId || !customerId) return false;

  const rows = await db
    .select({
      id: organizations.id,
      settings: organizations.settings,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  const org = rows[0];
  if (!org) return false;

  await updateOrgBillingState(
    { id: org.id, settings: (org.settings ?? {}) as OrgSettings },
    {
      stripeCustomerId: customerId,
      stripeSubscriptionId:
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id,
      stripeSubscriptionStatus: "checkout_completed",
      stripePriceId: session.metadata?.priceId,
      stripeLastEventId: event.id,
      stripeLastEventType: event.type,
    },
    "pro",
  );
  return true;
}

export async function applyStripeWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      return {
        handled: true,
        mapped: await updateOrgForCompletedCheckout(
          event.data.object as Stripe.Checkout.Session,
          event,
        ),
      };
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      return {
        handled: true,
        mapped: await updateOrgForSubscription(subscription, event),
      };
    }
    case "invoice.payment_succeeded":
    case "invoice.payment_failed":
      return {
        handled: true,
        mapped: await updateOrgForInvoice(
          event.data.object as Stripe.Invoice,
          event,
        ),
      };
    default:
      return { handled: false, mapped: false };
  }
}
