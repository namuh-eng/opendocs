# OpenDocs

[![GitHub stars](https://img.shields.io/github/stars/namuh-eng/opendocs?style=flat-square)](https://github.com/namuh-eng/opendocs)
[![License: ELv2](https://img.shields.io/badge/License-Elastic%202.0-blue.svg?style=flat-square)](LICENSE)

**Open-source Mintlify alternative — an AI-native documentation platform for developer teams.**

OpenDocs gives teams a complete documentation workspace they can run themselves: a dashboard for managing docs, a dual-mode MDX editor, published documentation sites, AI-assisted search/chat, analytics, API reference tooling, team collaboration, and production-ready deployment support.

**Live site:** https://opendocs.namuh.co

![OpenDocs landing page](public/opendocs-landing.png)

---

## What OpenDocs does

OpenDocs provides the core workflow for building and operating developer documentation:

- Create organizations, projects, members, roles, and API keys.
- Author docs in either a visual editor or Markdown/MDX mode.
- Publish branded docs sites with navigation, search, SEO, versioning, localization, and API references.
- Add AI assistant/search experiences when an AI provider is configured.
- Track page views, visitors, searches, feedback, assistant usage, and handoffs.
- Configure domains, authentication, deployments, exports, integrations, and project settings.

---

## Features

### Dashboard

- **Dual-mode editor** — Visual editing powered by Tiptap/ProseMirror plus Markdown/MDX mode.
- **Docs configuration** — Branding, typography, navigation, sections, redirects, snippets, i18n, versions, custom CSS, and custom JS.
- **Deployment management** — Deployment triggers, status records, preview records, and history.
- **GitHub integrations** — Repository/project import helpers, connection routes, and webhook handling.
- **Branch previews** — Preview deployments for non-default branches.
- **Analytics** — Views, visitors, searches, feedback, assistant conversations, and manual handoffs.
- **Team management** — Organizations, memberships, invites, role updates, and RBAC.
- **Project settings** — General, domain, authentication, navigation, appearance, deployment, exports, addons, and danger-zone settings.
- **API keys** — Admin and assistant-scoped API keys with prefixed key formats.

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

### Platform capabilities

- REST APIs for projects, pages, deployments, analytics, assistant flows, uploads, API keys, and docs rendering.
- `llms.txt` generation for machine-readable documentation.
- Project export with sensitive authentication values redacted.
- Rate-limit hardening with safer client keys.
- SSRF protections for proxied docs/API playground requests, including private-address and unsafe-redirect blocking.
- Production validation for required settings before rollout.

---

## Quick start

### Local development

```bash
git clone https://github.com/namuh-eng/opendocs.git
cd opendocs
npm install
cp .env.example .env
# Edit .env with at least DATABASE_URL, BETTER_AUTH_SECRET, and app URLs.
npm run db:push
npm run dev
```

The local dev server runs on http://localhost:3015.

### Self-hosting

OpenDocs runs anywhere that can run a Node/Next.js container and connect to PostgreSQL. For production guidance, environment variables, Docker deployment, database migrations, reverse proxy setup, health checks, and upgrades, see [`docs/self-hosting.md`](docs/self-hosting.md).

---

## Useful commands

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

## Configuration overview

Copy `.env.example` to `.env` for local development. Production should provide values through the deployment platform or a secrets manager. The complete reference lives in [`docs/self-hosting.md`](docs/self-hosting.md).

### Required core settings

```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
DB_SSL=true
NEXT_PUBLIC_APP_URL=http://localhost:3015
BETTER_AUTH_URL=http://localhost:3015
BETTER_AUTH_SECRET=your-random-secret
```

In production, `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` must be the public origin users visit, with the scheme included.

### Required production allowlist

```bash
DOCS_PROXY_ALLOWED_HOSTS=docs.example.com,api.yourservice.com
```

The docs/API-playground proxy fails closed in production unless every allowed target host is listed explicitly.

### Optional integrations

OpenDocs boots without optional integrations and shows unavailable/manual states for features that are not configured.

| Feature | Configure when needed |
| --- | --- |
| Google sign-in | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` |
| GitHub import/sync | `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_SLUG`, `GITHUB_WEBHOOK_SECRET` |
| File/image uploads | S3-compatible bucket settings |
| AI assistant/search | `OPENAI_API_KEY` or an OpenAI-compatible endpoint |
| Billing | Stripe secret, webhook secret, and price IDs |
| Observability | Sentry/PostHog server and client keys |

---

## Docker deployment overview

OpenDocs builds as a standalone Next.js container. Build-time public URL values are inlined into the client bundle, so pass them during the Docker build:

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://docs.example.com \
  --build-arg BETTER_AUTH_URL=https://docs.example.com \
  -t opendocs:local .
```

Run database migrations against the same `DATABASE_URL` before first boot:

```bash
npm run db:migrate
```

Then run the container behind your reverse proxy or load balancer:

```bash
docker run -d -p 3015:3000 \
  -e DATABASE_URL=postgresql://user:password@host:5432/opendocs \
  -e DB_SSL=true \
  -e BETTER_AUTH_SECRET=your-random-secret \
  -e BETTER_AUTH_URL=https://docs.example.com \
  -e NEXT_PUBLIC_APP_URL=https://docs.example.com \
  -e DOCS_PROXY_ALLOWED_HOSTS=docs.example.com \
  opendocs:local
```

For the full production checklist, see [`docs/self-hosting.md`](docs/self-hosting.md).

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS, Radix UI |
| Editor | Tiptap / ProseMirror, MDX |
| Database | PostgreSQL, Drizzle ORM |
| Authentication | Better Auth, Google OAuth |
| AI | OpenAI-compatible chat completions |
| Storage | S3-compatible object storage |
| API docs | OpenAPI / AsyncAPI rendering and playground support |
| Math | KaTeX |
| Diagrams | Mermaid |
| Testing | Vitest, Playwright |
| Linting | Biome |
| Deployment | Standalone Next.js server or Docker container |

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
│   │   ├── products/     # Product pages
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

- Production GitHub webhooks fail closed when the webhook secret/signature is missing or invalid.
- Docs proxy blocks private/internal/metadata targets, blocks unsafe redirects, and requires an explicit production host allowlist.
- Docs password auth stores new hashes with `scrypt:v1` and keeps legacy SHA-256/plaintext compatibility for existing settings.
- Docs access cookies are signed and require `BETTER_AUTH_SECRET` in production.
- Public docs APIs redact sensitive authentication settings.
- API playground attribute rendering is escaped.
- Security headers are covered by regression tests.

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
