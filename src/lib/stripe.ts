import { getPublicAppUrl } from "@/lib/app-url";
import Stripe from "stripe";

let cachedStripeClient: Stripe | null = null;
let cachedStripeSecretKey: string | null = null;

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required Stripe environment variable: ${name}`);
  }
  return value;
}

export function getStripeSecretKey() {
  return getRequiredEnv("STRIPE_SECRET_KEY");
}

export function getStripeWebhookSecret() {
  return getRequiredEnv("STRIPE_WEBHOOK_SECRET");
}

export function getStripePriceId() {
  return getRequiredEnv("STRIPE_PRICE_ID");
}

export function getStripeAppUrl() {
  return getPublicAppUrl();
}

export function getStripeClient() {
  const secretKey = getStripeSecretKey();
  if (cachedStripeClient && cachedStripeSecretKey === secretKey) {
    return cachedStripeClient;
  }

  cachedStripeClient = new Stripe(secretKey);
  cachedStripeSecretKey = secretKey;
  return cachedStripeClient;
}

export function resetStripeClientForTests() {
  cachedStripeClient = null;
  cachedStripeSecretKey = null;
}
