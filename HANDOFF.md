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
- **Frontend auth + hierarchy flow** — `apps/web`: `/login`
  (combined sign-in/sign-up), `/workspaces` (list + create), and
  `/workspaces/[id]` (Spaces and their Lists, create both inline). Session
  lives in `localStorage` via `lib/auth-context.tsx` and survives reload.
  These three pages still use plain inline styles (see the Tailwind note
  below).
- **Task engine** — full CRUD nested under
  `/workspaces/:id/spaces/:id/lists/:id/tasks`, same permission pattern as
  everything else: `WorkspaceMembershipGuard` at the door, plus
  `ListsService.findOne` reused to verify the Task's List actually belongs
  to the Space/Workspace in the URL. Subtasks (1 level, enforced
  server-side), status transitions (validated against the Task's own
  List's workflow — can't set a status from a different List), assignees
  (validated against workspace membership), priority, due dates.
  `GET /workspaces/:id/members` backs the assignee picker.
- **List view** — `/workspaces/[id]/spaces/[id]/lists/[id]`: a real Task
  table, Tailwind-styled. Inline-editable name, status/priority/assignee
  dropdowns (each change PATCHes immediately, no save button), due date,
  delete, expandable subtasks with their own add-subtask form. This is the
  only page using Tailwind so far — see below.
- `lib/api.ts` is the typed client for every endpoint through Week 3-4.
- `docker-compose.yml` for local Postgres + Redis, CI that installs,
  generates the Prisma client, and builds both workspaces on every push.

**Week 1-2 and Week 3-4 are both done.** Verified live in a browser against
the real API and Postgres, not just build checks — most recently: create
Task (default status auto-picked) → expand an existing subtask (inherited
parent's status) → change its status via dropdown → confirmed via network
tab (`PATCH .../tasks/:id → 200`) and a reload showing it persisted.

## What does NOT exist yet — deliberately

Nothing here pretends to be further along than it is. Genuinely Week 5-11
territory, not started:

- **Tailwind on the Week 1-2 pages.** Tailwind is wired up (v3 — v4 changed
  its PostCSS integration and broke the classic `tailwind.config.ts` +
  `@tailwind` directive setup, so it's pinned) and used on the new List
  view, but `/login`, `/workspaces`, and `/workspaces/[id]` were left on
  their original inline styles rather than doing an unrelated rewrite of
  already-shipped, already-tested pages. Migrating them is a fast-follow,
  not a blocker.
- **Multi-assignee UI.** The schema and API already support multiple
  assignees per Task (`assigneeIds: string[]`); the List view's assignee
  dropdown is single-select for now. Backend change not required to fix
  this — just the picker component.
- Sprints, Custom Fields, Comments, Attachments modules.
- Socket.IO / real-time layer — every Task edit right now requires a
  manual reload to see other users' changes.
- Board (Kanban) and Timeline (Gantt) views — List view only so far.
- The Gantt component decision (Bryntum vs. DHTMLX vs. build) — the PRD
  flags this as a build-or-buy call that should be pinned *before* Week 11,
  not during it.

## Start here — Week 5-6

Per the PRD's plan, Week 5-6 is Board view + real-time sync. The
field-level-PATCH convention (see below) is already the pattern every Task
edit uses — Socket.IO just needs to broadcast those same PATCHes to other
clients in the same List instead of requiring a reload. The Board view
groups the same Task data by `status.category` instead of rendering a flat
table — no new backend endpoints should be needed, `GET .../tasks` already
returns everything required.

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
