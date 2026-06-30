# Self-hosting OpenDocs

OpenDocs is licensed under the [Elastic License 2.0](../LICENSE): you can use, modify, and self-host it freely, but you may not offer it as a hosted service to third parties.

This guide covers running your own OpenDocs instance. OpenDocs is a standard Next.js app: it needs somewhere to run a container, a PostgreSQL database, and (optionally) S3-compatible object storage and an OpenAI key. Pick a stack below, then follow the matching deploy steps.

## Prerequisites

- **PostgreSQL 14+** — any provider (RDS, Neon, Cloud SQL, or a local container). This is the only hard infrastructure dependency.
- **Node.js 20+** (bare-metal) or **Docker** (container deployment).
- **Object storage (optional)** — S3-compatible (Cloudflare R2, AWS S3, MinIO); only needed for file/image uploads. The AI assistant/search needs an OpenAI API key. Everything else works without either.

Optional integrations (the app boots and degrades cleanly without each of them):

| Feature | Needs | Without it |
| --- | --- | --- |
| Google sign-in | Google OAuth client | Google login button is unavailable |
| File/image uploads | S3-compatible bucket (R2/S3) + credentials | Uploads unavailable; `/api/health` reports storage unavailable |
| AI assistant & search | OpenAI API key | AI features unavailable |
| GitHub sync | GitHub App | GitHub import/sync shows an unavailable state |
| Billing | Stripe account | App runs in free/dev billing state |
| Error/product analytics | Sentry / PostHog | No-op; the app makes zero outbound telemetry calls |

## Recommended stacks

OpenDocs has four parts — mix and match providers:

| Component | Required? | Options |
| --- | --- | --- |
| **Compute** (runs the container/server) | yes | Cloudflare Workers Containers · Fly.io · Railway · Render · a VPS with Docker · AWS/GCP |
| **PostgreSQL 14+** | yes | Supabase · Neon · RDS · Cloud SQL · self-run Postgres |
| **Object storage** (uploads, S3-compatible) | optional | Cloudflare R2 · AWS S3 · MinIO |
| **AI assistant** | optional | OpenAI (or any OpenAI-compatible endpoint) |

Compute and database are always separate services — e.g. Cloudflare Containers run the app but **not** the database, so pair them with a managed Postgres.

Suggested end-to-end combos:

- **Managed & serverless (recommended):** Cloudflare Workers Containers + **Supabase** or **Neon** (Postgres) + **Cloudflare R2** + OpenAI. Low ops, scales down, and it's what the hosted `opendocs.namuh.co` runs.
- **Single box (simplest):** one VPS running Docker Compose (app + Postgres) + R2/S3 + OpenAI, with Caddy or nginx terminating TLS. One bill, full control.
- **Bring-your-own-cloud:** any container platform (Fly.io, Railway, Render, AWS, GCP) + a managed Postgres + S3-compatible storage.

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

### Storage and AI (optional)

```bash
# Storage — native AWS S3 (credentials via the standard SDK chain)
AWS_REGION=us-east-1
S3_BUCKET=your-doc-assets-bucket
# Or an S3-compatible endpoint such as Cloudflare R2:
# S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
# S3_REGION=auto
# S3_ACCESS_KEY_ID=your-r2-access-key-id
# S3_SECRET_ACCESS_KEY=your-r2-secret-access-key

# AI assistant — OpenAI Chat Completions
OPENAI_API_KEY=your-openai-api-key
# Override the assistant model (default: gpt-4o-mini)
ASSISTANT_MODEL_ID=
# Optional OpenAI-compatible endpoint (Azure OpenAI, gateway, proxy)
# OPENAI_BASE_URL=https://api.openai.com/v1
```

S3 credentials resolve through the standard SDK chain (instance role, `aws configure`, env vars), or set dedicated `S3_*` keys to use an S3-compatible endpoint. The docs assistant requires `OPENAI_API_KEY`.

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

## Deploy: Cloudflare Workers Containers (recommended managed combo)

Your Next.js server runs as a Cloudflare Container behind a Worker. Cloudflare here provides **compute and storage (R2) only** — pair it with a managed Postgres (Supabase, Neon, RDS, …), set `DATABASE_URL` to it, and you're done. **Requires the Workers Paid plan** (Containers are not on the free tier).

1. Copy the config and fill in your values:
   ```bash
   cp wrangler.example.jsonc wrangler.jsonc
   # set account_id, your custom-domain route, and image_vars (your public app URL)
   ```
2. Authenticate wrangler: `export CLOUDFLARE_API_TOKEN=...` (Workers + Containers + R2 + DNS) or `wrangler login`.
3. Set runtime secrets (encrypted; not in the committed config):
   ```bash
   for k in DATABASE_URL BETTER_AUTH_SECRET AUTH_GOOGLE_ID AUTH_GOOGLE_SECRET \
            OPENAI_API_KEY S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY \
            STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_PRICE_ID; do
     wrangler secret put "$k"
   done
   ```
4. Deploy: `npx wrangler deploy`
5. Run migrations against your `DATABASE_URL` (see Database migrations above).

Storage uses **Cloudflare R2** via the S3 API — create a bucket + an R2 *Object Read &
Write* token, set `S3_ENDPOINT`/`S3_BUCKET`/`S3_REGION=auto` (vars) and
`S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` (secrets). The database can be any publicly
reachable Postgres (Neon, Supabase, RDS, …) with SSL — set `DB_SSL=true`.

The Docker and bare-metal options below also work if you prefer to host elsewhere.

## Self-host with Docker (alternative)

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
