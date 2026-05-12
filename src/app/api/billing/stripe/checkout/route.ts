import { auth } from "@/lib/auth";
import { createRequestId, logger } from "@/lib/logger";
import {
  getStripeAppUrl,
  getStripeClient,
  getStripePriceId,
} from "@/lib/stripe";
import {
  canManageBilling,
  getBillingOrgForUser,
  readBillingSettings,
  updateOrgBillingState,
} from "@/lib/stripe-billing";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const route = "/api/billing/stripe/checkout";

function billingUrl(appUrl: string, status: "success" | "cancelled") {
  const url = new URL("/settings", appUrl);
  url.searchParams.set("billing", status);
  if (status === "success") {
    url.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  }
  return url
    .toString()
    .replace("%7BCHECKOUT_SESSION_ID%7D", "{CHECKOUT_SESSION_ID}");
}

export async function POST() {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    logger.warn("stripe_checkout_unauthorized", {
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

  try {
    const stripe = getStripeClient();
    const priceId = getStripePriceId();
    const appUrl = getStripeAppUrl();
    const billing = readBillingSettings(org.settings);

    let customerId = billing.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        email: session.user.email ?? undefined,
        metadata: {
          orgId: org.id,
          orgSlug: org.slug,
          userId: session.user.id,
        },
      });
      customerId = customer.id;
      await updateOrgBillingState(org, { stripeCustomerId: customerId });
    }

    const metadata = {
      orgId: org.id,
      orgSlug: org.slug,
      userId: session.user.id,
      priceId,
    };

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: billingUrl(appUrl, "success"),
      cancel_url: billingUrl(appUrl, "cancelled"),
      client_reference_id: org.id,
      metadata,
      subscription_data: { metadata },
    });

    if (!checkoutSession.url) {
      logger.error("stripe_checkout_missing_url", {
        requestId,
        route,
        method: "POST",
        orgId: org.id,
      });
      return NextResponse.json(
        { error: "Stripe checkout did not return a URL" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
      requestId,
    });
  } catch (error) {
    logger.error("stripe_checkout_failed", {
      requestId,
      route,
      method: "POST",
      orgId: org.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Stripe checkout is not available" },
      { status: 500 },
    );
  }
}
