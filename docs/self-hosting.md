# Self-hosting OpenDocs

OpenDocs is licensed under the [Elastic License 2.0](../LICENSE): you can use, modify, and self-host it freely, but you may not offer it as a hosted service to third parties.

This guide covers running your own OpenDocs instance. The app is a standard Next.js service backed by PostgreSQL. Optional integrations add uploads, AI assistant/search, GitHub sync, billing, and observability.

## Deployment model

OpenDocs needs these pieces:

| Component | Required? | Notes |
| --- | --- | --- |
| Application runtime | Yes | Run the standalone Next.js server directly or as a Docker container. |
| PostgreSQL 14+ | Yes | Use any managed or self-hosted PostgreSQL database. |
| Reverse proxy / TLS | Production | Terminate HTTPS before traffic reaches the app. |
| S3-compatible object storage | Optional | Needed only for file/image uploads. |
| AI provider | Optional | Needed only for assistant/search features. |
| OAuth, GitHub, billing, observability | Optional | Enable only the integrations you need. |

Keep the app runtime and database as separate concerns. Any platform that can run the container and reach PostgreSQL can host OpenDocs.

## Quick start: local development

```bash
git clone https://github.com/namuh-eng/opendocs.git
cd opendocs
npm install
cp .env.example .env
# Set at minimum: DATABASE_URL, BETTER_AUTH_SECRET, NEXT_PUBLIC_APP_URL, BETTER_AUTH_URL
npm run db:push
npm run dev
```

The dev server runs on http://localhost:3015. Use `npm run db:push` only for local or throwaway databases; use migrations for production.

## Production checklist

Before exposing a self-hosted instance to users:

1. Create a PostgreSQL database and set `DATABASE_URL`.
2. Generate a strong `BETTER_AUTH_SECRET`.
3. Set `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` to the public HTTPS origin.
4. Set `DOCS_PROXY_ALLOWED_HOSTS` to the exact hostnames the docs/API playground may call.
5. Run `npm run db:migrate` against the production database.
6. Put the app behind HTTPS with a reverse proxy or load balancer.
7. Configure optional integrations only as needed.
8. Verify `GET /api/health` after deployment.

## Environment variables

### Required core settings

```bash
DATABASE_URL=postgresql://user:password@host:5432/opendocs
DB_SSL=true
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
NEXT_PUBLIC_APP_URL=https://docs.example.com
BETTER_AUTH_URL=https://docs.example.com
```

Notes:

- `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` must be the public origin users visit, including the scheme.
- For local development, both app URL values are usually `http://localhost:3015`.
- Set `DB_SSL=true` when your PostgreSQL provider requires TLS.
- `BETTER_AUTH_SECRET` signs auth/session data. Do not rotate it casually on a live instance.

### Required in production

```bash
DOCS_PROXY_ALLOWED_HOSTS=docs.example.com,api.yourservice.com
```

The docs/API-playground proxy refuses all production requests unless the target host is on this comma-separated allowlist. Include only public API hosts your docs should be allowed to call. Do not add internal hostnames, metadata addresses, or broad wildcards.

### Optional integrations

OpenDocs boots without these values. Features that depend on an unconfigured integration show unavailable/manual states instead of breaking the whole app.

| Feature | Variables | Behavior when unset |
| --- | --- | --- |
| Google sign-in | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google login is unavailable. |
| File/image uploads | `S3_BUCKET` plus provider credentials | Upload endpoints report storage unavailable. |
| AI assistant/search | `OPENAI_API_KEY`, optional `ASSISTANT_MODEL_ID`, optional `OPENAI_BASE_URL` | AI features are unavailable. |
| GitHub import/sync | `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_SLUG`, optional `GITHUB_APP_INSTALL_URL`, `GITHUB_WEBHOOK_SECRET` | GitHub import/sync shows an unavailable state. |
| Billing | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, optional plan price IDs | App runs in free/dev billing state. |
| Observability | Sentry/PostHog server and client keys | No-op; unconfigured builds make no telemetry calls. |

#### Google OAuth

```bash
AUTH_GOOGLE_ID=your-google-oauth-client-id
AUTH_GOOGLE_SECRET=your-google-oauth-client-secret
```

Add this redirect URI to the OAuth client:

```text
https://docs.example.com/api/auth/callback/google
```

For local development, also add:

```text
http://localhost:3015/api/auth/callback/google
```

#### Object storage

Native S3-compatible storage uses the standard SDK credential chain unless you set dedicated `S3_*` credentials.

```bash
AWS_REGION=us-east-1
S3_BUCKET=your-doc-assets-bucket
```

For S3-compatible endpoints that require explicit credentials:

```bash
S3_ENDPOINT=https://storage.example.com
S3_REGION=auto
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET=your-doc-assets-bucket
```

#### AI assistant/search

```bash
OPENAI_API_KEY=your-openai-api-key
ASSISTANT_MODEL_ID=gpt-4o-mini
# Optional OpenAI-compatible endpoint:
# OPENAI_BASE_URL=https://api.openai.com/v1
```

`ASSISTANT_MODEL_ID` is optional; the app has a default model when it is unset.

#### GitHub App

```bash
GITHUB_APP_ID=your-github-app-id
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_APP_SLUG=your-github-app-slug
GITHUB_APP_INSTALL_URL=
GITHUB_WEBHOOK_SECRET=your-github-webhook-secret
```

Set the GitHub App **Setup URL** to:

```text
https://docs.example.com/api/github-connections/callback
```

In production, incoming webhooks are rejected unless `GITHUB_WEBHOOK_SECRET` is set and the signature verifies.

#### Billing

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=
STRIPE_ENTERPRISE_PRICE_ID=
```

See [`deployment/stripe-billing.md`](deployment/stripe-billing.md) for webhook setup and local Stripe CLI testing.

#### Observability

Server-side values are read at runtime. Client-side `NEXT_PUBLIC_*` values are inlined at build time.

```bash
SENTRY_DSN=
SENTRY_ENVIRONMENT=
SENTRY_RELEASE=
SENTRY_TRACES_SAMPLE_RATE=
POSTHOG_API_KEY=
POSTHOG_HOST=
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

For Docker builds, pass client-side observability values as build args, not just runtime env vars.

## Database migrations

The repo tracks generated Drizzle migrations in `drizzle/`. The container does not run migrations automatically on boot, so run migrations as a deploy step against the same `DATABASE_URL` used by the app.

```bash
npm run db:migrate
```

For local or disposable databases only:

```bash
npm run db:push
```

## Deploy with Docker

### Build

`NEXT_PUBLIC_*` values and `BETTER_AUTH_URL` affect the built client/server output, so pass the public origin at build time:

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://docs.example.com \
  --build-arg BETTER_AUTH_URL=https://docs.example.com \
  -t opendocs:latest .
```

Optional client-side observability values can also be passed as build args:

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://docs.example.com \
  --build-arg BETTER_AUTH_URL=https://docs.example.com \
  --build-arg NEXT_PUBLIC_SENTRY_DSN=... \
  --build-arg NEXT_PUBLIC_POSTHOG_KEY=... \
  -t opendocs:latest .
```

### Run

The container listens on port **3000** internally. Run it behind your reverse proxy or load balancer:

```bash
docker run -d --name opendocs -p 3015:3000 \
  -e DATABASE_URL=postgresql://user:password@host:5432/opendocs \
  -e DB_SSL=true \
  -e BETTER_AUTH_SECRET=your-random-secret \
  -e BETTER_AUTH_URL=https://docs.example.com \
  -e NEXT_PUBLIC_APP_URL=https://docs.example.com \
  -e DOCS_PROXY_ALLOWED_HOSTS=docs.example.com \
  opendocs:latest
```

Add optional integration variables from the reference above as needed. Run `npm run db:migrate` before first production boot and on each upgrade that includes new migrations.

## Deploy without Docker

The build produces a standalone Next.js server.

```bash
npm ci
NEXT_PUBLIC_APP_URL=https://docs.example.com BETTER_AUTH_URL=https://docs.example.com npm run build
PORT=3015 HOSTNAME=0.0.0.0 node .next/standalone/server.js
```

Static assets must be served alongside the standalone output:

```bash
mkdir -p .next/standalone/.next
cp -R .next/static .next/standalone/.next/static
cp -R public .next/standalone/public
```

Use a process manager and a reverse proxy for production. The Dockerfile is the canonical reference for the expected standalone layout.

## Reverse proxy and health checks

- Terminate TLS at your proxy/load balancer and forward traffic to the app port.
- `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` must match the external HTTPS origin, not an internal container address.
- Preserve `Host`, `X-Forwarded-Proto`, and `X-Forwarded-For` headers.
- Point health checks at `GET /api/health`. The response includes app status, version, and database/storage check results.

## Upgrading

```bash
git pull
npm ci
npm run db:migrate
# rebuild the app/container and restart the service
```

Before upgrading a production instance, review the release notes or commits for new required environment variables or migrations.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Login redirects to the wrong host | `NEXT_PUBLIC_APP_URL`, `BETTER_AUTH_URL`, proxy headers, and OAuth redirect URIs. |
| API playground requests fail in production | `DOCS_PROXY_ALLOWED_HOSTS` includes the target API hostname exactly. |
| Uploads fail | Storage bucket name, endpoint, region, credentials, and bucket permissions. |
| AI assistant is unavailable | `OPENAI_API_KEY`, optional base URL, and model setting. |
| App starts but database features fail | `DATABASE_URL`, `DB_SSL`, network access, and whether migrations were run. |
| Health check reports storage unavailable | Storage is optional; configure object storage only if uploads are needed. |
