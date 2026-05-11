# OpenDocs

[![GitHub stars](https://img.shields.io/github/stars/namuh-eng/opendocs?style=flat-square)](https://github.com/namuh-eng/opendocs)
[![License: ELv2](https://img.shields.io/badge/License-Elastic%202.0-blue.svg?style=flat-square)](LICENSE)

**Open source Mintlify alternative — AI-native documentation platform for developer teams.**

OpenDocs is a production-grade documentation platform built with Next.js 16, TypeScript, PostgreSQL, AWS, and Better Auth. It includes a docs dashboard, MDX authoring, published docs sites, AI-powered search/chat, analytics, OpenAPI tooling, team collaboration, and a hardened production deployment path.

**Live site:** https://opendocs.namuh.co

---

## What OpenDocs does

OpenDocs gives teams the core Mintlify-style documentation workflow on infrastructure they control:

- Create organizations and documentation projects.
- Author docs in a dual-mode editor: visual WYSIWYG or Markdown/MDX.
- Publish branded docs sites with navigation, search, SEO, versioning, i18n, and API references.
- Configure AI assistant/search experiences powered by AWS Bedrock.
- Track analytics for page views, visitors, searches, feedback, and assistant usage.
- Manage project settings, authentication, domains, deployments, members, API keys, and exports.

---

## Current production status

OpenDocs is deployed at **https://opendocs.namuh.co** on AWS ECS Fargate behind an ALB with HTTPS.

Production is currently configured with:

- ECS Fargate + ECR container deployment
- PostgreSQL on AWS RDS via Drizzle ORM
- S3-backed uploaded assets
- Google OAuth through Better Auth
- AWS Bedrock for AI features
- `/api/health` production health checks
- Strict production environment validation for public app/auth URLs
- Docs proxy SSRF protections and an explicit `DOCS_PROXY_ALLOWED_HOSTS` allowlist
- Scrypt-based docs password hashes with legacy compatibility
- Signed docs access cookies that fail closed without production secrets
- Public API redaction for sensitive docs auth settings
- Security headers regression coverage

Latest verified production deploy used staging commit `e01e6c2` and passed:

- `npm run lint`
- `npm run typecheck`
- `npm test -- --run`
- `npm run build`
- `npm audit --omit=dev --json` with **0 critical / 0 high** vulnerabilities
- `/api/health`
- `/api/docs/proxy` deny/allow checks
- Google OAuth smoke test redirecting through the `namuh-clones` client

---

## Features

### Dashboard

- **Dual-mode editor** — Visual WYSIWYG powered by Tiptap/ProseMirror plus Markdown/MDX mode.
- **Configuration UI** — Visual docs configuration for branding, typography, navigation, sections, redirects, snippets, i18n, versions, and custom CSS/JS.
- **Deployment management** — Deployment triggers, status tracking, preview records, and deployment history.
- **GitHub integrations** — GitHub connection routes, repository/project import helpers, and webhook handling that fails closed in production without a verified secret/signature.
- **Branch previews** — Preview deployments for non-default branches.
- **Analytics** — Views, visitors, searches, feedback, assistant conversations, and manual handoffs.
- **Team management** — Organizations, memberships, invite flows, role updates, and RBAC.
- **Project settings** — General, domain, authentication, navigation, appearance, deployment, exports, addons, and danger-zone settings.
- **API keys** — Admin and assistant-scoped API keys with prefixed key formats.
- **Agent/workflow surfaces** — Agent jobs, assistant messaging, workflow templates, and MCP-oriented product pages.

### Published docs sites

- **MDX rendering** — Cards, Steps, Callouts, Tabs, Accordions, Code Groups, Mermaid diagrams, math, and more.
- **Protected docs** — Optional password protection using scrypt hashes and signed access cookies.
- **AI assistant** — Chat widget with streaming responses and source-aware retrieval.
- **Full-text search** — Cmd+K search with snippets, ranking, and recent-search support.
- **OpenAPI / AsyncAPI support** — Store specs, generate API docs, and render interactive playgrounds.
- **API playground** — Interactive endpoint testing with safer attribute escaping and proxy protections.
- **SEO** — Sitemap, robots.txt, canonical URLs, metadata, protected-docs noindex behavior, and hreflang support.
- **i18n and versioning** — Language switcher, localized paths, version switcher, and version-aware page resolution.
- **Theming** — Light/dark mode, custom branding, typography, CSS, and JS hooks.

### Developer and platform capabilities

- **REST APIs** for projects, pages, deployments, analytics, assistant flows, GitHub connections, uploads, API keys, and docs rendering.
- **llms.txt** generation for machine-readable documentation.
- **Project export** with sensitive authentication values redacted.
- **Rate-limit hardening** with safer client keys.
- **SSRF protection** for proxied docs/API playground requests, including internal/private address blocking and unsafe redirect blocking.
- **Production deployment validation** for required env vars before rollout.

---

## Quick start

### Local development

```bash
git clone https://github.com/namuh-eng/opendocs.git
cd opendocs
npm install
cp .env.example .env
# Edit .env with database, AWS, auth, and app URL settings.
npm run db:push
npm run dev
```

The local dev server runs on http://localhost:3015.

### Useful commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server on port 3015 |
| `npm run build` | Build the production Next.js app |
| `npm run typecheck` | Run TypeScript checks |
| `npm run lint` | Run Biome checks |
| `npm run lint:fix` | Run Biome and apply safe fixes |
| `npm test -- --run` | Run the full Vitest suite once |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Run Drizzle migrations |
| `npm run db:push` | Push the Drizzle schema to the configured database |

---

## Environment variables

Copy `.env.example` to `.env` for local development. Production should provide these through the deployment environment or secrets manager.

### Required core settings

```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
NEXT_PUBLIC_APP_URL=http://localhost:3015
BETTER_AUTH_URL=http://localhost:3015
BETTER_AUTH_SECRET=your-random-secret
```

In production, `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` must use the live origin, for example:

```bash
NEXT_PUBLIC_APP_URL=https://opendocs.namuh.co
BETTER_AUTH_URL=https://opendocs.namuh.co
```

### Auth and integrations

```bash
AUTH_GOOGLE_ID=your-google-oauth-client-id
AUTH_GOOGLE_SECRET=your-google-oauth-client-secret
GITHUB_WEBHOOK_SECRET=your-github-webhook-secret
GITHUB_APP_ID=your-github-app-id
GITHUB_APP_PRIVATE_KEY=your-github-app-private-key
GITHUB_APP_SLUG=your-github-app-slug
# Optional override if the default slug URL is not correct:
GITHUB_APP_INSTALL_URL=https://github.com/apps/your-github-app-slug/installations/new
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret
STRIPE_PRICE_ID=price_your-recurring-price-id
```

Stripe billing API routes are documented in `docs/deployment/stripe-billing.md`, including local Stripe CLI webhook forwarding with:

```bash
stripe login
stripe listen --forward-to localhost:3015/api/billing/stripe/webhook
```

Google OAuth must include this production redirect URI:

```text
https://opendocs.namuh.co/api/auth/callback/google
```

The GitHub App must set its **Setup URL** to the deployed callback route so GitHub returns `installation_id` and `setup_action` after install/update:

```text
https://opendocs.namuh.co/api/github-connections/callback
```

For staging, use the staging origin with the same path.

### AWS and storage

```bash
AWS_REGION=us-east-1
AWS_BEDROCK_REGION=us-east-1
S3_BUCKET=your-doc-assets-bucket
```

### Docs proxy allowlist

Production docs/API playground proxying fails closed unless `DOCS_PROXY_ALLOWED_HOSTS` is configured.

```bash
DOCS_PROXY_ALLOWED_HOSTS=opendocs.namuh.co
```

Add only the public API hosts the docs playground should call, comma-separated:

```bash
DOCS_PROXY_ALLOWED_HOSTS=opendocs.namuh.co,api.yourservice.com
```

---

## Docker and production deployment

OpenDocs builds as a standalone Next.js container. The current production path is AWS ECR + ECS Fargate + ALB.

The Docker build accepts production URL build args:

```bash
docker build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_APP_URL=https://opendocs.namuh.co \
  --build-arg BETTER_AUTH_URL=https://opendocs.namuh.co \
  -t opendocs:local .
```

For the current AWS production runbook, see:

- [`docs/deployment/opendocs-production.md`](docs/deployment/opendocs-production.md)

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS, Radix UI |
| Editor | Tiptap / ProseMirror, MDX |
| Database | PostgreSQL, Drizzle ORM |
| Authentication | Better Auth, Google OAuth |
| AI | AWS Bedrock |
| Storage | AWS S3 |
| API docs | OpenAPI / AsyncAPI rendering and playground support |
| Math | KaTeX |
| Diagrams | Mermaid |
| Testing | Vitest, Playwright |
| Linting | Biome |
| Deployment | Docker, AWS ECR, ECS Fargate, ALB, ACM |

---

## Project structure

```text
opendocs/
├── src/
│   ├── app/              # Next.js App Router pages and API routes
│   │   ├── (auth)/       # Login and signup pages
│   │   ├── analytics/    # Analytics dashboards
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # Dashboard home
│   │   ├── docs/         # Published docs renderer
│   │   ├── editor/       # Docs editor
│   │   ├── onboarding/   # Organization/project onboarding
│   │   ├── products/     # Agent, Assistant, Workflows, MCP pages
│   │   └── settings/     # Workspace, org, project, deployment, and security settings
│   ├── components/       # React components
│   ├── lib/              # Utilities, services, auth, DB, deployment, security helpers
│   │   └── db/           # Drizzle schema and DB client
│   └── types/            # Shared TypeScript types
├── tests/                # Vitest tests
├── tests/e2e/            # Playwright tests
├── docs/                 # Deployment and project documentation
└── public/               # Static assets
```

---

## Security notes

Recent hardening added or verified:

- Production GitHub webhooks fail closed when the webhook secret/signature is missing or invalid.
- Docs proxy blocks private/internal/metadata targets, blocks unsafe redirects, and requires an explicit production host allowlist.
- Docs password auth stores new hashes with `scrypt:v1` and keeps legacy SHA-256/plaintext compatibility for existing settings.
- Docs access cookies are signed and require `BETTER_AUTH_SECRET` in production.
- Public docs APIs redact sensitive authentication settings.
- API playground attribute rendering is escaped.
- Security headers are covered by regression tests.
- Tracked sensitive-path scans currently hit only `.env.example`, tests, or example placeholders, not real secrets.

---

## Contributing

We welcome contributions, including bug fixes, feature work, tests, and docs improvements.

1. Fork the repository.
2. Create a feature branch: `git checkout -b my-feature`.
3. Make your changes.
4. Run `npm run lint`, `npm run typecheck`, and `npm test -- --run`.
5. Open a pull request.

---

## License

[Elastic License 2.0](LICENSE) — Use, modify, and self-host freely. You may not offer the software as a hosted service to third parties. See [LICENSE](LICENSE) for full terms.

---

## Support

- **Live site:** https://opendocs.namuh.co
- **Issues:** https://github.com/namuh-eng/opendocs/issues

---

<div align="center">

Built by [Ashley Ha](https://github.com/ashley-ha) and [Jaeyun Ha](https://github.com/jaeyunha)

If you find this project helpful, consider giving it a star.

</div>
