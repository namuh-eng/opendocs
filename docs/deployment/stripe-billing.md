# Stripe billing local runbook

OpenDocs billing uses Stripe Checkout, the Stripe Customer Portal, and a signed webhook endpoint. Keep all Stripe keys in local `.env` files or the deployment secrets manager; never commit or paste real secret values into logs or PRs.

## Required environment variables

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3015
```

`STRIPE_PRICE_ID` should point to the recurring subscription Price used by `/api/billing/stripe/checkout`. Production/staging must use the deployed `NEXT_PUBLIC_APP_URL` so Checkout and Portal redirects return to the correct origin.

## API routes

- `POST /api/billing/stripe/checkout` — authenticated org admin creates a Stripe Checkout Session for the configured subscription price.
- `POST /api/billing/stripe/portal` — authenticated org admin with an existing Stripe customer ID creates a Customer Portal session.
- `POST /api/billing/stripe/webhook` — Stripe forwards signed events here; the route verifies the raw request body with `STRIPE_WEBHOOK_SECRET` before updating local billing state.

Local billing state is stored under `organizations.settings.billing` and mirrors Stripe identifiers/status without storing secrets.

## Stripe CLI local testing

Install/login once per machine:

```bash
stripe login
```

Forward signed webhook events to the local Next.js dev server:

```bash
stripe listen --forward-to localhost:3015/api/billing/stripe/webhook
```

Copy the `whsec_...` value printed by `stripe listen` into `STRIPE_WEBHOOK_SECRET` for the same local shell/dev server. The CLI secret is different from a Dashboard webhook endpoint secret.

You can trigger a basic fixture event with:

```bash
stripe trigger checkout.session.completed
```

Caveat: the generated fixture will not automatically include OpenDocs metadata like `orgId`, `orgSlug`, `userId`, or the exact Checkout Session/customer created by the app. For end-to-end local mapping, create a Checkout Session through `POST /api/billing/stripe/checkout`, complete it in Stripe Checkout, and let the forwarded webhook carry the app metadata back to OpenDocs.

## Live-account validation blocker

Unit tests mock Stripe network calls and do not require a live Stripe account. A real live-mode smoke test requires a valid Stripe account login, secret key, webhook secret, and recurring price ID.
