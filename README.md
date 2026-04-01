# Ralph-to-Ralph

**Autonomous Product Cloning Loop**

Give it any URL. It inspects, builds, tests, and deploys a working clone.

![Architecture](docs/architecture-diagram.png)

## How It Works

Ralph-to-Ralph is a three-phase autonomous pipeline:

1. **Inspect** (Claude Opus + Ever CLI) — Browses the target product, extracts docs, captures screenshots, generates a detailed PRD with 50+ features
2. **Build** (Claude Opus) — Implements each feature one by one with TDD, real cloud infrastructure (AWS SES, RDS Postgres, S3), and commits after every feature
3. **QA** (Codex + Ever CLI) — Independent evaluator that tests every feature, finds bugs, fixes them, and verifies against the original product

A **watchdog orchestrator** manages the pipeline with auto-restart on failure, git commit+push after every iteration, and a build-QA-fix loop (up to 5 cycles).

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (`claude`)
- [Codex CLI](https://github.com/openai/codex) (`codex`)
- [Ever CLI](https://foreverbrowsing.com) (`ever`)
- [AWS CLI](https://aws.amazon.com/cli/) configured (`aws configure`)
- Docker (for deployment)

### Setup

```bash
# 1. Clone this repo
git clone https://github.com/jaeyunha/ralph-to-ralph-origin.git
cd ralph-to-ralph-origin

# 2. Install dependencies
npm install
npx playwright install chromium

# 3. Configure environment
cp .env.example .env
# Edit .env with your AWS, Cloudflare, and other credentials

# 4. Provision AWS infrastructure (RDS, SES, S3, ECR)
bash scripts/preflight.sh

# 5. Run the loop!
./scripts/start.sh https://your-target-product.com
```

That's it. The system will:
- Inspect the target URL and generate a PRD
- Build every feature with tests
- QA test everything independently
- Deploy to AWS App Runner

## What Gets Built

The loop produces a **fully functional, deployed product** — not a mockup:

- Full-stack Next.js 16 app with TypeScript
- REST API with Bearer token auth
- Real database (RDS Postgres via Drizzle ORM)
- Real email delivery (AWS SES) — if the target sends emails
- Real DNS management (Cloudflare API) — if the target manages domains
- Real file storage (AWS S3) — if the target handles uploads
- TypeScript SDK with React email support — if the target has an SDK
- Unit tests (Vitest) + E2E tests (Playwright)
- Deployed to AWS App Runner with Docker

## Architecture

```
./scripts/start.sh https://target-product.com
         |
    Watchdog Orchestrator (auto-restart, git push, cron backup)
         |
    Phase 1: INSPECT
    |  Claude Opus + Ever CLI
    |  → prd.json (50+ features)
    |  → build-spec.md
    |  → screenshots + docs
         |
    Phase 2: BUILD
    |  Claude Opus (1 feature per iteration)
    |  → TDD: write tests first
    |  → make check && make test
    |  → git commit + push each feature
         |
    Phase 3: QA
    |  Codex + Ever CLI
    |  → Playwright regression first
    |  → Manual Ever CLI verification
    |  → Fix bugs, re-test
    |  → Compare against original
         |
    Phase 4: DEPLOY
         → Docker → ECR → App Runner
         → Live URL
```

### Build → QA Fix Loop

If QA finds bugs, the watchdog loops back:

```
BUILD → QA → [all pass?] → Deploy
              ↓ no
         FIX → BUILD → QA  (up to 5 cycles)
```

## Customization

### Changing the target
Just pass a different URL:
```bash
./scripts/start.sh https://any-saas-product.com
```

### Adding cloud credentials
Edit `.env` to add:
- **AWS** — for SES, RDS, S3, App Runner (required)
- **Cloudflare** — for auto-configuring DNS records (optional)

### Modifying the prompts
The system behavior is controlled by prompt files:
- `inspect-prompt.md` — how the inspect agent analyzes the target
- `build-prompt.md` — how the build agent implements features
- `qa-prompt.md` — how the QA agent tests features
- `pre-setup.md` — what's already configured (read by all agents)

## Project Structure

```
ralph-to-ralph-origin/
├── scripts/
│   ├── start.sh              # Entry point — starts the loop
│   ├── preflight.sh           # Provisions AWS infrastructure
│   └── generate-demo-keys.sh  # Generate API keys for demos
├── inspect-prompt.md           # Inspect agent instructions
├── inspect-spec.md             # Inspection strategy
├── build-prompt.md             # Build agent instructions
├── qa-prompt.md                # QA agent instructions
├── pre-setup.md                # Pre-configured setup (read by agents)
├── ever-cli-reference.md       # Ever CLI command reference
├── ralph-watchdog.sh           # Orchestrator (inspect → build → QA loop)
├── inspect-ralph.sh            # Phase 1 runner
├── build-ralph.sh              # Phase 2 runner
├── qa-ralph.sh                 # Phase 3 runner
├── CLAUDE.md                   # Instructions for Claude agents
├── AGENTS.md                   # Instructions for Codex QA agent
├── prd.json                    # Product requirements (generated by inspect)
├── src/                        # Next.js app (built by build agent)
├── tests/                      # Unit tests (Vitest)
├── tests/e2e/                  # E2E tests (Playwright)
├── packages/sdk/               # TypeScript SDK (if applicable)
└── Dockerfile                  # For deployment
```

## Demo Results (Resend.com)

We ran Ralph-to-Ralph against [resend.com](https://resend.com) at Ralphthon Seoul 2026:

| Metric | Value |
|--------|-------|
| Features built | 52 |
| Lines of code | 24,000+ |
| Unit tests | 388 passing |
| Dashboard pages | 10 |
| API endpoints | 16+ |
| Build time | ~4 hours (fully autonomous) |
| Result | 2nd place |

The clone sends real emails, verifies real domains, auto-configures DNS via Cloudflare, and is deployed to AWS App Runner.

## AI Agents & Tools

| Agent | Role |
|-------|------|
| [Ever CLI](https://foreverbrowsing.com) | Browser automation for inspection & E2E testing |
| Claude Opus | Powers Inspect + Build loops |
| Codex | Runs QA evaluation |

## Team

- **Jaeyun Ha** — [github.com/jaeyunha](https://github.com/jaeyunha)
- **Ashley Ha** — [github.com/ashley-ha](https://github.com/ashley-ha)

Built at [Ralphthon Seoul 2026](https://ralphthon.com)

## License

MIT
