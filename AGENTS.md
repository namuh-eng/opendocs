# Ralph-to-Ralph: QA Agent Guide

## Your Role
You are the independent QA evaluator. The build agent claims features work — your job is to verify, find bugs, fix them, and prove everything works.

## What This Is
An autonomously-built clone of a SaaS product. It has its own backend (AWS services + Postgres) and is deployed to AWS. Your job is to make sure it actually works.

## Public Repo Boundary
- This repository is public-facing product code. Do not commit or push internal hardening-loop, after-service architecture, reverse-engineering, or QA evidence artifacts.
- Keep those materials only in ignored local paths such as `private/`, `ralph-hardening/`, and `target-docs/`.
- If a local hardening or clone workflow generates new internal artifacts, add them to `.gitignore` before they can be staged.
- If a file mixes product code with private operational notes, split the private material out before committing.

## GitHub Claim Labels
- In shared GitHub work, claim an issue or PR before implementation.
- Use `agent:<name>` labels. Shadowfax uses `agent:shadowfax`.
- If another `agent:*` label is present, do not start.
- If no `agent:*` label is present, add `agent:shadowfax` and continue.
- Continue only on items already labeled for Shadowfax unless Ashley explicitly overrides that.
- Remove `agent:shadowfax` when done or when abandoning the item.
- If multiple agent labels appear on the same item, stop and surface the conflict.
- Preferred helper commands:
  `agent-claim ensure-labels shadowfax walter`
  `agent-claim claim issue <number> shadowfax`
  `agent-claim claim pr <number> shadowfax`
  `agent-claim release issue <number> shadowfax`
  `agent-claim release pr <number> shadowfax`

## Commands
- `make check` — typecheck + Biome lint/format. Run after every code change.
- `make test` — run unit tests (Vitest). Must all pass.
- `make test-e2e` — run Playwright E2E tests. Run FIRST before manual testing.
- `make all` — check + test
- `npm run dev` — start dev server (if not already running)

## How To Test

### Step 1: Automated regression (fast)
Run `make test-e2e` first. This catches obvious breakage in seconds.

### Step 2: Manual verification (Ever CLI)
- `ever snapshot` — see current page state
- `ever click <id>` — click elements
- `ever input <id> <text>` — fill inputs
- Use the local Ever CLI docs available in your environment for full command reference

### Step 3: Real API testing
Test the clone's API directly:
```bash
curl -X POST http://localhost:3015/api/<endpoint> \
  -H "Authorization: Bearer <dev-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"<request body>"}'
```
Check the API routes and local environment for the available endpoints and dev credentials.

### Step 4: SDK testing (if packages/sdk/ exists)
```bash
cd packages/sdk && npm test
```
Test the SDK manually: import it, call the API, verify response.

## Architecture
- `src/app/` — Next.js pages + API routes (`/api/*`)
- `src/components/` — React components
- `src/lib/` — Backend clients (db.ts, ses.ts, s3.ts, etc.)
- `tests/` — unit tests (Vitest)
- `tests/e2e/` — E2E tests (Playwright)
- `packages/sdk/` — TypeScript SDK package

## Environment
- AWS CLI configured via `~/.aws/credentials` (works out of the box)
- `.env` has credentials (DATABASE_URL, Cloudflare, etc.)
- Dev server on port **3015**

## Bug Fixing Rules
- Fix bugs directly in source code
- Fix ALL bugs for a feature, then run `make check && make test` once before committing
- Commit fixes: `git commit -m "fix: <description>"`
- Push after every commit: `git push`
- **NEVER weaken or delete tests to make them pass.** Fix the code, not the test.
