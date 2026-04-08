# namuh-mintlify

[![GitHub stars](https://img.shields.io/github/stars/namuh-eng/namuh-mintlify?style=flat-square)](https://github.com/namuh-eng/namuh-mintlify)
[![License: ELv2](https://img.shields.io/badge/License-Elastic%202.0-blue.svg?style=flat-square)](LICENSE)

**Open source Mintlify alternative — AI-native documentation platform for developer teams.**

A fully functional clone of [Mintlify](https://mintlify.com) built with Next.js 16, TypeScript, and modern infrastructure. Write docs in MDX, get a beautiful docs site with AI-powered search and chat, analytics, and team collaboration — all self-hosted.

---

## About

namuh-mintlify is a production-grade documentation platform that gives you the full Mintlify experience on your own infrastructure. Create organizations, manage documentation projects, write content in a dual-mode editor (visual WYSIWYG or markdown), and deploy beautiful docs sites with AI assistant, full-text search, and OpenAPI auto-documentation.

Built by [ralph-to-ralph](https://github.com/namuh-eng/ralph-to-ralph), an autonomous product cloning system. 69 features, 54,000+ lines of TypeScript, 1,500+ tests — built and tested end-to-end with zero human intervention.

---

## Features

### Dashboard
- **Dual-Mode Editor** — Visual WYSIWYG (Tiptap/ProseMirror) and Markdown mode with syntax highlighting
- **Configurations Panel** — Visual GUI editor for docs.json (branding, typography, navigation, 10+ sections)
- **Deployment System** — Trigger deployments, real-time status tracking, deployment history
- **GitHub Auto-Deploy** — Push to repo, docs auto-deploy via GitHub App webhooks
- **Branch Previews** — Preview deployments from non-default branches
- **Analytics Dashboard** — Page views, visitors, searches, feedback, assistant conversations
- **Team Management** — Invite members, assign roles (admin/editor/viewer), RBAC
- **Agent Management** — Create AI agent jobs, view PRs, send follow-up messages
- **Assistant Settings** — Configure AI chat widget, deflection, search domains, starter questions
- **Workflows** — 9 automation templates (changelog, translations, SEO audit, etc.)
- **MCP Server** — Auto-generated Model Context Protocol server per project

### Docs Site
- **MDX Rendering** — 25+ components (Cards, Steps, Callouts, Tabs, Accordions, Code Groups, Mermaid diagrams, and more)
- **AI Assistant** — Chat widget with SSE streaming via AWS Bedrock (Claude), source citations
- **Full-Text Search** — Cmd+K search with relevance ranking, snippets, recent searches
- **OpenAPI Auto-Docs** — Auto-generated API reference pages from OpenAPI/AsyncAPI specs
- **API Playground** — Interactive endpoint testing with auth pre-fill
- **Dark Mode** — Light/dark theme toggle with localStorage persistence
- **i18n** — Multi-language support with language switcher and hreflang SEO tags
- **Versioning** — Multi-version docs with version switcher
- **LaTeX** — Inline and block math rendering with KaTeX
- **SEO** — Auto-generated sitemap.xml, robots.txt, canonical URLs, meta tags

### Developer Experience
- **REST API** — 16+ endpoints for deployments, analytics, assistant, and agent management
- **API Key Auth** — Admin (`mint_`) and assistant (`mint_dsc_`) prefixed keys
- **llms.txt** — Auto-generated machine-readable documentation for LLM consumption
- **Reusable Snippets** — Parameterized content reuse with variables
- **URL Redirects** — Path redirects for SEO preservation
- **Custom CSS/JS** — Inject custom stylesheets and scripts

---

## Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/namuh-eng/namuh-mintlify.git
cd namuh-mintlify

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database URL, AWS credentials, and auth settings

# Run database migrations
npm run db:push

# Start the dev server (runs on http://localhost:3015)
npm run dev
```

### Docker (Coming Soon)

```bash
git clone https://github.com/namuh-eng/namuh-mintlify.git
cd namuh-mintlify
docker compose up
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Tailwind CSS, Radix UI |
| **Editor** | Tiptap / ProseMirror (visual mode) |
| **Database** | PostgreSQL (AWS RDS), Drizzle ORM |
| **AI** | AWS Bedrock (Claude Sonnet 4) |
| **Authentication** | Better Auth, Google OAuth |
| **Storage** | AWS S3 (logos, media, doc assets) |
| **Math** | KaTeX (LaTeX rendering) |
| **Diagrams** | Mermaid (flowcharts, sequence diagrams) |
| **Testing** | Vitest (1,500+ unit tests), Playwright (E2E) |
| **Linting** | Biome |
| **Deployment** | Docker, AWS ECR + ECS |

---

## Development

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 3015 |
| `npm run build` | Production build |
| `make check` | TypeScript typecheck + Biome lint |
| `make test` | Run unit tests (Vitest) |
| `make test-e2e` | Run E2E tests (Playwright) |
| `make all` | check + test |
| `npm run db:push` | Push Drizzle schema to Postgres |

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# AWS (for Bedrock AI + S3 uploads)
AWS_REGION=us-east-1
AWS_BEDROCK_REGION=us-east-1

# Authentication
AUTH_GOOGLE_ID=your-google-oauth-id
AUTH_GOOGLE_SECRET=your-google-oauth-secret
BETTER_AUTH_SECRET=your-random-secret
BETTER_AUTH_URL=http://localhost:3015

# App
NEXT_PUBLIC_APP_URL=http://localhost:3015
DASHBOARD_KEY=your-dashboard-key
```

---

## Project Structure

```
namuh-mintlify/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # Login, signup pages
│   │   ├── dashboard/    # Dashboard home
│   │   ├── editor/       # Dual-mode MDX editor
│   │   ├── analytics/    # Analytics dashboard
│   │   ├── products/     # Agent, Assistant, Workflows, MCP
│   │   ├── settings/     # Settings pages (12 sub-pages)
│   │   ├── onboarding/   # Org + project setup wizard
│   │   ├── docs/         # Public docs site renderer
│   │   └── api/          # 60 API routes
│   ├── components/       # React components
│   ├── lib/              # Utilities, DB client, services
│   │   └── db/           # Drizzle ORM schema
│   └── types/            # TypeScript types
├── tests/                # Unit tests (Vitest)
├── tests/e2e/            # E2E tests (Playwright)
└── target-docs/          # Extracted Mintlify documentation
```

---

## Built by AI

namuh-mintlify was built autonomously by **[ralph-to-ralph](https://github.com/namuh-eng/ralph-to-ralph)**, a multi-agent system that clones SaaS products end-to-end.

| Metric | Result |
|--------|--------|
| Features built | **69** |
| Lines of code | **54,000+** |
| Unit tests passing | **1,521** |
| API routes | **60** |
| Dashboard pages | **12+** |
| Total time | **~6 hours** (fully autonomous) |
| Human intervention | **Zero** |

The system:
1. **Inspects** Mintlify using Claude + Ever CLI (9 iterations, 50+ screenshots)
2. **Builds** a working clone with TDD — 69 features committed individually
3. **Tests** every feature with Vitest + Playwright
4. **Deploys** to AWS with real infrastructure

---

## Contributing

We welcome contributions! Whether it's bug fixes, new features, or improvements to documentation.

1. Fork the repository
2. Create a feature branch (`git checkout -b my-feature`)
3. Make your changes
4. Run `make check && make test` to verify
5. Open a pull request

---

## License

[Elastic License 2.0](LICENSE) — Use, modify, and self-host freely. You may not offer the software as a hosted service to third parties. See [LICENSE](LICENSE) for full terms.

---

## Support

- **Issues** — Report bugs or request features on [GitHub Issues](https://github.com/namuh-eng/namuh-mintlify/issues)

---

<div align="center">

Built by [Ashley Ha](https://github.com/ashley-ha) and [Jaeyun Ha](https://github.com/jaeyunha)

If you find this project helpful, consider giving it a star

</div>
