# Self-hosting OpenDocs

OpenDocs is licensed under the [Elastic License 2.0](../LICENSE): you can use, modify, and self-host it freely, but you may not offer it as a hosted service to third parties.

This guide covers running your own OpenDocs instance — locally, with Docker, or behind a reverse proxy in production. For the reference AWS deployment used for opendocs.namuh.co, see [`deployment/opendocs-production.md`](deployment/opendocs-production.md) (internal runbook).

## Prerequisites

- **PostgreSQL 14+** — any provider (RDS, Neon, Cloud SQL, or a local container). This is the only hard infrastructure dependency.
- **Node.js 20+** (bare-metal) or **Docker** (container deployment).
- **Optional AWS credentials** — only needed for file uploads (S3) and the AI assistant/search (Bedrock). Everything else works without AWS.

Optional integrations (the app boots and degrades cleanly without each of them):

| Feature | Needs | Without it |
| --- | --- | --- |
| Google sign-in | Google OAuth client | Google login button is unavailable |
| File/image uploads | S3 bucket + AWS credentials | Uploads unavailable; `/api/health` reports storage unavailable |
| AI assistant & search | AWS Bedrock model access | AI features unavailable |
| GitHub sync | GitHub App | GitHub import/sync shows an unavailable state |
| Billing | Stripe account | App runs in free/dev billing state |
| Error/product analytics | Sentry / PostHog | No-op; the app makes zero outbound telemetry calls |

## Quick start (local)

```bash
git clone https://github.com/namuh-eng/opendocs.git
cd opendocs
npm install
cp .env.example .env
# Set at minimum: DATABASE_URL, BETTER_AUTH_SECRET
npm run db:push        # create the schema (dev) — use db:migrate for real deployments
npm run dev            # http://localhost:3015
```

## Environment variables

### Required (all environments)

```bash
DATABASE_URL=postgresql://user:password@host:5432/opendocs
DB_SSL=true                                  # set to "true" for managed Postgres (RDS, Neon, …)
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
NEXT_PUBLIC_APP_URL=https://docs.example.com # your public origin
BETTER_AUTH_URL=https://docs.example.com     # same origin as above
```

`NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` must be the public origin users reach the app on (scheme included). For local development both are `http://localhost:3015`.

### Required in production

Deployments with `NODE_ENV=production` additionally fail closed without:

```bash
DOCS_PROXY_ALLOWED_HOSTS=docs.example.com,api.yourservice.com
```

The docs/API-playground proxy refuses all requests in production unless the target host is on this comma-separated allowlist. Signed docs-access cookies also require `BETTER_AUTH_SECRET` in production — protected docs will not unlock without it.

### Google OAuth (optional)

```bash
AUTH_GOOGLE_ID=your-google-oauth-client-id
AUTH_GOOGLE_SECRET=your-google-oauth-client-secret
```

In the Google Cloud Console, the OAuth client needs the redirect URI `https://docs.example.com/api/auth/callback/google` (and the `http://localhost:3015/...` equivalent for development).

### AWS storage and AI (optional)

```bash
AWS_REGION=us-east-1
S3_BUCKET=your-doc-assets-bucket
# Override the assistant model (default: us.anthropic.claude-sonnet-4-20250514-v1:0)
ASSISTANT_BEDROCK_MODEL_ID=
```

AWS credentials are resolved through the standard SDK chain (instance role, `aws configure`, env vars). Bedrock model access must be enabled for your region in the AWS console.

### GitHub App (optional)

```bash
GITHUB_APP_ID=your-github-app-id
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_APP_SLUG=your-github-app-slug
GITHUB_APP_INSTALL_URL=          # optional override for the install URL
GITHUB_WEBHOOK_SECRET=your-github-webhook-secret
```

Set the GitHub App's **Setup URL** to `https://docs.example.com/api/github-connections/callback`. In production, incoming webhooks are rejected unless `GITHUB_WEBHOOK_SECRET` is set and the signature verifies.

### Stripe billing (optional)

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...        # recurring subscription price used by checkout
STRIPE_PRO_PRICE_ID=             # optional multi-plan mapping
STRIPE_ENTERPRISE_PRICE_ID=      # optional multi-plan mapping
```

See [`deployment/stripe-billing.md`](deployment/stripe-billing.md) for the webhook setup and local Stripe CLI testing.

### Observability (optional)

OpenDocs ships with Sentry and PostHog wiring that is a complete no-op when unconfigured — a default build makes zero outbound telemetry calls.

```bash
# Server-side
SENTRY_DSN=
SENTRY_ENVIRONMENT=
SENTRY_RELEASE=
SENTRY_TRACES_SAMPLE_RATE=
POSTHOG_API_KEY=
POSTHOG_HOST=

# Client-side — NEXT_PUBLIC_* values are inlined at BUILD time.
# For Docker they must be passed as --build-arg, not runtime env.
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

## Database migrations

The repo tracks generated Drizzle migrations in `drizzle/`. The container does **not** run migrations on boot — run them as a deploy step against the same `DATABASE_URL`:

```bash
npm run db:migrate   # apply tracked migrations (production)
npm run db:push      # push schema directly (dev/throwaway databases only)
```

## Docker

### Build

`NEXT_PUBLIC_*` values and the auth URL are baked into the client bundle at build time, so pass them as build args:

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://docs.example.com \
  --build-arg BETTER_AUTH_URL=https://docs.example.com \
  -t opendocs:latest .
```

Add `--build-arg NEXT_PUBLIC_SENTRY_DSN=... --build-arg NEXT_PUBLIC_POSTHOG_KEY=...` if you want client-side observability.

### Run

The container listens on port **3000** internally:

```bash
docker run -d --name opendocs -p 3015:3000 \
  -e DATABASE_URL=postgresql://user:password@host:5432/opendocs \
  -e DB_SSL=true \
  -e BETTER_AUTH_SECRET=your-random-secret \
  -e BETTER_AUTH_URL=https://docs.example.com \
  -e NEXT_PUBLIC_APP_URL=https://docs.example.com \
  -e DOCS_PROXY_ALLOWED_HOSTS=docs.example.com \
  -e AWS_REGION=us-east-1 \
  -e S3_BUCKET=your-doc-assets-bucket \
  opendocs:latest
```

Add the optional integration vars from the reference above as needed. Remember to run migrations before first boot.

### Bare-metal production (no Docker)

The build produces a standalone Next.js server:

```bash
npm ci
NEXT_PUBLIC_APP_URL=https://docs.example.com BETTER_AUTH_URL=https://docs.example.com npm run build
PORT=3015 HOSTNAME=0.0.0.0 node .next/standalone/server.js
```

Static assets must be served alongside the standalone output — copy `.next/static` to `.next/standalone/.next/static` and `public/` to `.next/standalone/public` (the Dockerfile shows the exact layout).

## Reverse proxy and health checks

- Terminate TLS at your proxy/load balancer and forward to the container port. `NEXT_PUBLIC_APP_URL`/`BETTER_AUTH_URL` must match the public HTTPS origin, not the internal address.
- Point health checks at `GET /api/health` — it returns `status`, the running version, and database/storage check results.

## Upgrading

```bash
git pull
npm ci
npm run db:migrate
# rebuild (docker build … or npm run build) and restart
```

Before upgrading a production instance, check the release notes/commits for new required environment variables.
