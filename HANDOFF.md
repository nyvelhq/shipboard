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
  PRD's schema section (`users` through `activity_log`), migrated and
  verified against a live Postgres instance.
- **Auth** — self-hosted JWT + bcrypt (`POST /auth/signup`,
  `POST /auth/login`). Deviation from the PRD's Clerk/Auth0 recommendation:
  no Clerk/Auth0 account was available to wire up, so this is the
  interim path. See the comment on `User.passwordHash` in
  `schema.prisma` — swapping to Clerk/Auth0 later means dropping that
  column, not a redesign.
- **Workspace → Space → Folder → List CRUD**, fully permission-checked —
  see `apps/api/src/common/guards/workspace-membership.guard.ts` and the
  ownership-chain checks in each service (`SpacesService.findOne`, etc).
  Verified end-to-end against a live DB: a member of Workspace B cannot
  reach a Workspace A resource by ID-guessing through their own Workspace
  B URL — it 404s, not 403, so existence is never leaked. New Lists get a
  default 4-status workflow (Open/In Progress/Review/Done) so they're
  usable immediately.
- `apps/api` boots, connects to Postgres via Prisma, and serves
  `GET /health` → `{ status: 'ok', db: 'connected' }`.
- `apps/web` boots and serves one placeholder page. **No product UI
  exists yet** — this is the actual gap, see below.
- `docker-compose.yml` for local Postgres + Redis, CI that installs,
  generates the Prisma client, and builds both workspaces on every push.

## What does NOT exist yet — deliberately

Nothing here pretends to be further along than it is. Specifically not
started:

- **Any frontend beyond a placeholder page** — no sign-in form, no
  Workspace/Space/List UI, no state management setup. This is the
  immediate next task (Week 1-2's frontend half, see below).
- Sprints, Tasks, Custom Fields, Comments, Attachments modules — Week 3-8
  work per the plan.
- Socket.IO / real-time layer.
- The Gantt component decision (Bryntum vs. DHTMLX vs. build) — the PRD
  flags this as a build-or-buy call that should be pinned *before* Week 11,
  not during it.

## Start here — finish Week 1-2, then move to Week 3-4

The backend half of Week 1-2 is done and verified (see above). What's left
to close out the milestone:

1. A minimal frontend flow: sign-in form calling `/auth/login`, a page
   listing the signed-in user's Workspaces (`GET /workspaces`), and a
   Workspace detail view showing its Spaces and Lists. A table is fine —
   this is not the Week 3-4 List view, it's just proof the permission model
   and CRUD work end-to-end from a browser, not just curl.
2. Once that's in place, Week 1-2 is genuinely done and Week 3-4 (the
   Task engine) starts clean.

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
