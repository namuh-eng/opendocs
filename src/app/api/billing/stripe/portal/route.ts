import { auth } from "@/lib/auth";
import { createRequestId, logger } from "@/lib/logger";
import { getStripeAppUrl, getStripeClient } from "@/lib/stripe";
import {
  canManageBilling,
  getBillingOrgForUser,
  readBillingSettings,
} from "@/lib/stripe-billing";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const route = "/api/billing/stripe/portal";

export async function POST() {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    logger.warn("stripe_portal_unauthorized", {
      requestId,
      route,
      method: "POST",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await getBillingOrgForUser(session.user.id);
  if (!org) {
    return NextResponse.json(
      { error: "You must belong to an organization" },
      { status: 403 },
    );
  }

  if (!canManageBilling(org.role)) {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }

  const customerId = readBillingSettings(org.settings).stripeCustomerId;
  if (!customerId) {
    return NextResponse.json(
      { error: "No Stripe customer is linked to this organization" },
      { status: 409 },
    );
  }

  try {
    const stripe = getStripeClient();
    const returnUrl = new URL("/settings", getStripeAppUrl());
    returnUrl.searchParams.set("billing", "portal_return");

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl.toString(),
    });

    return NextResponse.json({
      url: portalSession.url,
      sessionId: portalSession.id,
      requestId,
    });
  } catch (error) {
    logger.error("stripe_portal_failed", {
      requestId,
      route,
      method: "POST",
      orgId: org.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Stripe customer portal is not available" },
      { status: 500 },
    );
  }
}
