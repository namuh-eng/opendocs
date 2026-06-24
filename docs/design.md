---
title: Design
description: OpenDocs' product design system for calm, readable, AI-native documentation.
---

# Design

OpenDocs should feel like a quiet study with excellent tools: warm paper, precise structure, fast search, and AI that stays close to the page. This page defines the design language we use across the public docs surface, dashboard, editor, analytics, and product settings.

<Info title="Design intent">
The goal is not to clone another docs product. OpenDocs has its own voice: editorial, crafted, useful, and calm enough for long reading sessions.
</Info>

## Principles

<CardGroup cols="2">
<Card title="Readable first" icon="book">
Every surface starts with the reader. Text hierarchy, line length, contrast, and spacing should make documentation easier to scan and easier to trust.
</Card>
<Card title="Crafted, not noisy" icon="palette">
Decoration comes from typography, paper-like surfaces, soft shadows, and restrained accent color. Avoid busy gradients, excessive icons, and dashboard chrome that competes with content.
</Card>
<Card title="AI-native, source-aware" icon="search">
Search and assistant entry points should feel available without overpowering the document. AI interactions must keep citations, context, and next actions close to the current page.
</Card>
<Card title="Operationally clear" icon="settings">
Publishing, deployment, analytics, and settings states should always tell teams what happened, what is live, and what to do next.
</Card>
</CardGroup>

## Visual language

OpenDocs uses the **Warm Craft** system from `docs/design/style-guide.md`: cream backgrounds, white panels, ink text, editorial serif headlines, Inter for UI, and periwinkle as the only interactive accent.

### Core palette

| Token | Hex | Use |
| --- | --- | --- |
| `--bg` | `#f7f4ed` | Warm page background |
| `--bg-deep` | `#efe9db` | Alternate section background |
| `--panel` | `#ffffff` | Cards, windows, raised surfaces |
| `--panel-warm` | `#faf6ec` | Sidebars, quotes, soft previews |
| `--border` | `#e5dfd0` | Hairline borders |
| `--ink` | `#1f1d2c` | Primary text |
| `--muted` | `#6b6878` | Secondary text |
| `--accent` | `#6b7fd7` | Links, active states, selected nav |

### Accent rule

Periwinkle is reserved for interaction: links, focused controls, selected navigation, primary actions, and assistant affordances. Craft colors like terracotta, sage, gold, and plum are decorative only.

<Tip title="Keep the accent meaningful">
If everything is periwinkle, nothing is. Use neutral surfaces first, then let the accent identify where the user can act.
</Tip>

## Typography

Use **Instrument Serif** for display moments and **Inter** for product UI and body text.

- Page titles should be confident and short.
- Section headings should make the page easier to navigate, not just decorate it.
- Display headlines may italicize one meaningful word in periwinkle.
- Body copy should stay specific, concrete, and free of marketing filler.
- Code uses SF Mono / Fira Code / Consolas style fallbacks.

```css
.docs-heading {
  font-family: var(--font-display);
  font-weight: 400;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
```

## Layout

OpenDocs pages follow a three-zone reading model:

<Steps>
<Step title="Navigation on the left" icon="layout">
The sidebar gives readers orientation: project identity, grouped pages, API references, versions, and localization.
</Step>
<Step title="Content in the center" icon="file-text">
The article column should feel calm and spacious. Keep the reading width narrow enough for long-form docs and wide enough for examples.
</Step>
<Step title="Context on the right" icon="compass">
The table of contents, assistant, and contextual actions should reinforce the current page instead of becoming a second app.
</Step>
</Steps>

## Components

### Cards

Use cards for choices, feature groups, and next-step links. A card should contain one clear idea and one reason to click or keep reading.

<CardGroup cols="3">
<Card title="Guide" icon="book">
Use for conceptual or tutorial content.
</Card>
<Card title="Reference" icon="code">
Use for exact API, schema, CLI, or configuration details.
</Card>
<Card title="Workflow" icon="rocket">
Use for repeatable product tasks that have a beginning, middle, and done state.
</Card>
</CardGroup>

### Callouts

Callouts should carry real information. Avoid using them as decoration.

<Warning title="Do not hide core steps">
If a reader must complete an action to succeed, put it in the main flow. A callout is for emphasis, caveats, or context—not required instructions.
</Warning>

### Code blocks

Code blocks should be copyable, labeled when helpful, and surrounded by enough explanation that readers understand why they are running the command.

<CodeGroup>
```bash
npm run dev
```
```typescript
export const docsTheme = {
  accent: "#6b7fd7",
  background: "#f7f4ed",
};
```
</CodeGroup>

## Product surfaces

### Public docs

Public docs should prioritize orientation and trust. The top bar, sidebar, search, Ask AI button, table of contents, feedback widget, and footer need to feel like one system.

### Dashboard

Dashboard pages should make status obvious: live project state, last deployment, unfinished setup tasks, and the fastest path to publish.

### Editor

The editor should feel like writing, not configuring software. Keep primary writing controls close to the content and move advanced structure into panels.

### Analytics

Analytics should answer product questions in plain language: what readers viewed, what they searched for, where the assistant helped, and what needs documentation work.

## Voice

OpenDocs copy should be warm, direct, and specific.

| Use | Avoid |
| --- | --- |
| "Publish your first docs site" | "Unlock seamless documentation experiences" |
| "Ask AI about this page" | "Leverage AI-powered knowledge discovery" |
| "No deployments yet" | "Data unavailable" |
| "Connect GitHub to sync changes" | "Configure integration provider" |

## Checklist

Before a new OpenDocs page is considered finished:

- The page has one clear job.
- The title and description explain that job without filler.
- Interactive elements use periwinkle consistently.
- Cards, callouts, and code blocks support the reading flow.
- Empty, loading, error, and success states are written for humans.
- The page works in light and dark mode.
- Keyboard and screen-reader users can reach the same actions.

## Related

- `docs/design/style-guide.md` — detailed Warm Craft tokens and component rules.
- `docs/self-hosting.md` — production setup and environment guidance.
- `docs/deployment/opendocs-production.md` — deployment notes for the live OpenDocs service.
