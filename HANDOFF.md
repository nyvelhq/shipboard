# Handoff brief — Shipboard

You're picking up a project management app for e-commerce startups — think
"Jira's structured workflow engine crossed with ClickUp's flexible,
multi-view UI, with commerce-native custom fields (SKU, vendor, unit cost)
built in instead of bolted on." The full product reasoning, feature scope,
tech stack decisions, database schema, and a week-by-week 12-week MVP plan
already exist:

**Read this first, in full, before writing any code:**
[Shipboard PRD & Architecture Plan](https://claude.ai/code/artifact/7d4028c0-4369-423b-ae17-428fa35484eb)

This file only covers what the PRD doesn't: the current repo state, and
exactly where to start.

## What already exists (and is real, not a stub)

- A working npm-workspaces monorepo: `apps/api` (NestJS) + `apps/web`
  (Next.js 14).
- `apps/api/prisma/schema.prisma` — the **complete** data model from the
  PRD's schema section, already transcribed into valid Prisma syntax
  (`users` through `activity_log`, all relations wired). This has not been
  migrated against a real database yet — that's your first command.
- `apps/api` boots, connects to Postgres via Prisma, and serves
  `GET /health` → `{ status: 'ok', db: 'connected' }`. This is a real
  smoke test, not a placeholder — if it doesn't return that, something in
  your environment setup is wrong before you write a single feature.
- `apps/web` boots and serves one placeholder page. No product UI exists.
- `docker-compose.yml` for local Postgres + Redis, CI that installs,
  generates the Prisma client, and builds both workspaces on every push.

## What does NOT exist yet — deliberately

No domain modules, no auth, no frontend beyond a placeholder page. Nothing
here pretends to be further along than it is. Specifically not started:

- Auth (the PRD recommends Clerk or Auth0 — pick one and justify it if you
  deviate)
- Every domain module: Workspaces, Spaces, Folders, Lists, Tasks, Sprints,
  Custom Fields, Comments, Attachments — all Week 1-8 work per the plan
- Any frontend view (List, Board, Timeline) or state management setup
- Socket.IO / real-time layer
- The Gantt component decision (Bryntum vs. DHTMLX vs. build) — the PRD
  flags this as a build-or-buy call that should be pinned *before* Week 11,
  not during it

## Start here — Week 1-2 acceptance criteria

Per the PRD's phased plan, Week 1-2 is "Foundations." Treat these as the
literal acceptance bar for your first milestone:

1. `npm run --workspace=apps/api prisma:migrate` runs clean against the
   `docker-compose` Postgres and creates every table in the schema.
2. Auth is wired (signup/login, session/JWT issuance) using whichever
   provider you picked.
3. Workspace → Space → Folder → List CRUD exists as real NestJS endpoints,
   permission-checked so a request from outside a Workspace's membership is
   rejected — the PRD calls this out explicitly as the foundation everything
   else depends on. Don't under-build the permission model to hit the date;
   that's the one risk this milestone exists to retire.
4. A minimal frontend flow exists to exercise it: sign in, see your
   Workspace's Spaces and Lists (a table is fine — this is not the Week 3-4
   List view).

## Conventions to keep

- REST, OpenAPI-documented, not GraphQL — see the PRD's architecture
  section for why (revisit only if you hit a concrete wall the PRD didn't
  anticipate, and say so in a commit message or PR description when you do).
- Field-level PATCHes, not whole-resource overwrites, once you reach
  real-time sync in Week 5-6 — this is what makes the conflict-handling
  approach in the PRD work.
- The custom-field engine stores values as generic `jsonb` in
  `custom_field_values` — don't add dedicated columns per e-commerce metric
  (SKU, vendor, etc.); that defeats the point of the design.
- Every non-goal listed in the PRD's implementation-plan section
  (Calendar view, GraphQL, full-text search, auto-scheduling, mobile apps,
  public API, SOC 2) is out of scope for the 12-week window. If you find
  yourself building toward one, stop and flag it instead.

## When you're blocked

If a PRD decision turns out to be wrong once you're in the code (the
recommended Gantt library doesn't fit, the permission model needs a shape
the schema doesn't support), don't silently diverge — the PRD is the shared
reference point for whoever picks this up after you too. Note the deviation
and the reason, in a commit message at minimum.
