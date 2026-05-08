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
- `make all` — check + test
- `npm run dev` — start dev server (if not already running)
- Do not run Playwright or `make test-e2e` for OpenDocs browser QA. Use Ever CLI/browser instead.

## How To Test

### Step 1: Browser verification (Ever CLI)
Ever CLI/browser is the only approved E2E and parity surface for OpenDocs.
- Read `/Users/ashleyha/dev/ever-skills/ever-browser/SKILL.md` before browser QA.
- When Ever behavior is unclear or broken, inspect `/Users/ashleyha/dev/forever-agent/packages/cli` and fix/recover the Ever path instead of switching tools.
- In the `shadowfax-opendocs` tmux lane, use the Shadowfax-scoped Ever profile (`ever` in-lane or `ever-shadowfax` outside it).
- Use `ever snapshot` / `ever click` / `ever input` / `ever eval` with snapshot -> act -> snapshot evidence.
- For Mintlify parity work, compare the reference page against `https://opendocs.namuh.co` through Ever browser evidence before deciding what to build.

### Step 2: Automated regression
Run `make check` and `make test` after code changes. Do not use Playwright as a fallback for browser verification.

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
- `tests/e2e/` — legacy browser tests; do not use for OpenDocs browser QA
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

## Recovery Rules (autonomous loop — DO NOT pause)

Ashley is building a closed-loop environment. You must keep working autonomously and never halt for human input unless every recovery path is exhausted. Optional human intervention is fine; mandatory waiting is not.

### Detection signals (any of these means you are blocked)

- HTTP 429 / "rate limit" / "too many requests" from Anthropic, OpenAI, GitHub, Vercel, AWS, or any external API
- Build or test hangs > 5 min with no output
- `make check` / `make test` / `make test-e2e` failing in a way you cannot diagnose in 2 attempts
- Merge conflict on rebase or PR
- Codex / agent stops to ask "approval required" / "needs review"
- Tooling auth failed (gh CLI, AWS, npm registry)

### Recovery procedure (in order — do not skip)

1. **Print a clearly-keyworded line** so clawhip catches it. Use one of: `rate limit`, `merge conflict`, `tests failed`, `error TS`, `approval required`, `blocked`, `needs review`, `auth failed` — verbatim.
2. **Log the blocker** to `private/recovery-log.jsonl` (gitignored) with timestamp, signal type, and one-line context.
3. **Backoff schedule for rate limits**: 1 min → 5 min → 15 min → 30 min → 60 min → 2 h. Never sleep longer than 2 h in one stretch.
4. **Do not pause the whole agent**. Switch to fallback work (see below) and emit a heartbeat every 4 min so clawhip stale-detection does not fire.
5. **For merge conflicts**: rebase on `staging` (never `main`), resolve in favor of the more recent semantically-correct change, run `make check && make test`, force-push the agent branch. Never abandon the PR.
6. **For test failures you cannot fix in 2 attempts**: emit `tests failed: <one-line>`, switch to fallback work, retry the failing test set later with a fresh shell.
7. **After 4 failed retry rounds** (≈3.75 h cumulative blocked on the same task): emit `blocked: <task> exceeded all retries — needs human review`, stop attempting that task for the day, continue all other work.

### Fallback work while blocked (always available, never empty)

In priority order — if the current task is stuck, pick the next available item:

1. Review other open PRs labeled `agent:shadowfax` and finish anything ready to merge into `staging`.
2. Run `make check && make test` on a clean checkout of `staging` and report any drift.
3. Pick another open issue labeled `agent:shadowfax` and start it (claim per the GitHub Claim Labels section).
4. Lint/format pass: `make check` then commit any auto-fix output.
5. Documentation polish in `docs/` or inline comments where coverage is thin.
6. Tidy `private/recovery-log.jsonl` and reconcile with closed issues.

### Hard rules

- Never wait silently. clawhip's stale-detection fires after 5 minutes of no pane output — emit at least one line per 4 minutes.
- Never weaken or delete tests to make them pass.
- Never push to `main`. Always branch -> PR into `staging` -> verify -> merge into `staging` only.
- Never use `--no-verify` / `--no-gpg-sign` / `git push --force` to main.
- If you discover a blocker that genuinely requires human judgment (security, payment, account access), emit `needs human: <one-line>` and continue with fallback work.

### Heartbeat format

Every 4 minutes minimum during long-running work, print one line:
```
[heartbeat] <iso8601> | task=<short> | status=<running|sleeping|fallback> | next=<one-line>
```

This keeps the autonomous loop alive and gives clawhip a clean trail.
