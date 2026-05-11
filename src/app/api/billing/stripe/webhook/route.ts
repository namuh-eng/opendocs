import { createRequestId, logger } from "@/lib/logger";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";
import { applyStripeWebhookEvent } from "@/lib/stripe-billing";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

const route = "/api/billing/stripe/webhook";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    logger.warn("stripe_webhook_missing_signature", {
      requestId,
      route,
      method: "POST",
    });
    return NextResponse.json(
      { error: "Stripe signature is required" },
      { status: 400 },
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (error) {
    logger.warn("stripe_webhook_invalid_signature", {
      requestId,
      route,
      method: "POST",
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Invalid Stripe webhook signature" },
      { status: 400 },
    );
  }

  try {
    const result = await applyStripeWebhookEvent(event);
    logger.info("stripe_webhook_processed", {
      requestId,
      route,
      method: "POST",
      eventId: event.id,
      eventType: event.type,
      handled: result.handled,
      mapped: result.mapped,
    });
    return NextResponse.json({ received: true, ...result, requestId });
  } catch (error) {
    logger.error("stripe_webhook_processing_failed", {
      requestId,
      route,
      method: "POST",
      eventId: event.id,
      eventType: event.type,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Stripe webhook processing failed" },
      { status: 500 },
    );
  }
}
