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
  delete, expandable subtasks with their own add-subtask form.
- **Real-time sync** — `RealtimeGateway` (Socket.IO): one room per List
  (`list:<id>`), JWT verified on handshake, membership re-checked before a
  client can join a room. Every Task mutation broadcasts `list:changed` to
  that room; `lib/use-list-tasks.ts` (shared by List and Board views)
  reloads over REST when it receives one. This is an invalidate-and-refetch
  signal, not a diff/patch payload — every subscriber always re-fetches
  the List's true current state rather than merging a partial payload
  client-side, which is simpler to reason about and correct by
  construction. A deliberate scope choice, not a shortcut hiding a gap.
- **Board (Kanban) view** — `/workspaces/[id]/spaces/[id]/lists/[id]/board`:
  columns grouped by the List's own status workflow, cards show priority +
  assignee initial + due date, drag-and-drop between columns PATCHes the
  Task's `statusId`. A List/Board toggle sits in both views' headers.
- **Custom Fields** — workspace-scoped field definitions (text, number,
  currency, dropdown, multiselect, date, checkbox, person), optionally
  narrowed to one Space or one List. `GET .../lists/:id/custom-fields`
  resolves which definitions actually apply to a given List. Values live
  on `UpdateTaskDto.customFieldValues` (a `fieldId -> value` map) rather
  than their own endpoints — every Task field, custom or not, goes through
  the same PATCH. A "Manage custom fields" panel on the List view creates/
  deletes List-scoped fields inline.
- **Comments and Attachments** — both nested under a Task, both
  author-only delete, both broadcasting through `RealtimeGateway` so they
  update live the same way Task edits do. Attachments use **local disk
  storage** (`apps/api/uploads/`, served via `useStaticAssets`) — a
  deliberate MVP simplification against the PRD's implied S3-class
  production path, not a redesign; swapping the storage backend later
  only touches `AttachmentsService`/`AttachmentsController`, not the
  schema or the rest of the app. A `TaskOwnershipGuard`
  (`common/guards/task-ownership.guard.ts`) runs before the upload
  interceptor specifically because multer writes to disk *before* a
  handler's own checks would catch a bad `taskId` — verified: a
  mismatched ID 404s and leaves zero files on disk.
- **Task detail panel** — a slide-over (opened via a small button on each
  List-view row) showing description, custom fields, attachments, and
  comments for one Task. This is the surface Week 7-8's collaboration
  features actually needed; nothing like it existed before.
- **Sprints** — `/workspaces/[id]/spaces/[id]/lists/[id]/sprints`: create
  a Sprint (name, goal, date range), a two-column detail page (Backlog /
  In this Sprint) to move Tasks in and out via plain buttons — no
  drag-and-drop here, deliberately, given the Week 5-6 note below about
  verifying native HTML5 DnD through this session's tooling. Story points
  editable inline; Start/Close buttons drive the Sprint's
  `planned -> active -> closed` state machine. Velocity (`done points /
  total points`) is computed client-side from `GET .../sprints/:id`'s own
  task list, no separate aggregation endpoint. `Task.sprintId` and
  `Task.storyPoints` — present in the schema since Week 1-2, unused until
  now — flow through the same `UpdateTaskDto` every other Task field uses;
  `sprintId: null` explicitly clears a Task's Sprint (back to backlog).
- **Timeline (Gantt) view** — `/workspaces/[id]/spaces/[id]/lists/[id]/timeline`:
  hand-built, not Bryntum or DHTMLX — see the build-vs-buy note below.
  Day-scale horizontal grid (plain `Date` arithmetic, no date-library
  dependency), one row per top-level Task, bars positioned/sized from
  `startDate`/`dueDate` and colored by the Task's current status. Today's
  column and weekends are shaded. Tasks with no dates list separately
  below the grid rather than rendering a fake zero-width bar. Clicking a
  bar or an undated Task opens the same Task detail panel every other
  view uses. Needed zero backend changes — reads the same
  `GET .../tasks` response every other view already does. Closed a real
  gap in passing: there was no UI anywhere to set a Task's *start* date
  before this (only `dueDate`, on the List row) — added both to the
  detail panel, since the Gantt would have had nothing to render
  otherwise.
- `lib/api.ts` is the typed client for every endpoint through Week 11.
- `docker-compose.yml` for local Postgres + Redis, CI that installs,
  generates the Prisma client, and builds both workspaces on every push.

**Weeks 1-2 through 11 are done — 11 of the PRD's 12 weeks.** Verified
live in a browser, not just build checks. Most recently: set a Task's
start/due dates through the new detail-panel fields (confirmed via two
`PATCH .../tasks/:id → 200` calls), watched it move from the "no dates
set" list into the dated grid with a correctly positioned/sized bar in
its current status's color, and confirmed clicking the bar reopens the
same detail panel pre-populated with the dates just set.

**Build-vs-buy call made for the Timeline view (Week 11):** the PRD
flagged Bryntum vs. DHTMLX vs. hand-built as a decision to make
deliberately, not default into. Bryntum needs a paid commercial license —
unusable here without credentials (same situation as the Clerk/Auth0
deviation in Week 1-2). DHTMLX's free tier installs fine, but it's a large
third-party library with its own theming system, cutting against how
every other view in this app is built (plain React + Tailwind, fully
owned, no license questions for whoever inherits this repo). Went
hand-built. `TaskDependency` (schema-ready — `blockingTaskId`/
`blockedTaskId` — unused) is NOT wired up: dependency arrows are a real
feature, not a quick add, and are honestly still missing from the
Timeline view. See below.

**One unverified piece from Week 5-6, still open:** the literal HTML5 drag
*gesture* on the Board couldn't be confirmed through this session's
browser-automation tooling — a raw `addEventListener` check proved a
dispatched `DragEvent` reaches the DOM, but it doesn't trigger React's
synthetic `onDrop`. Documented limitation of simulating native HTML5 DnD
programmatically (Playwright/Selenium/CDP-based tools generally), not
evidence of an app bug — the handler calls the exact `updateTask` path
already proven correct two other ways. Worth a human actually dragging a
card once.

## What does NOT exist yet — deliberately

Nothing here pretends to be further along than it is. Genuinely Week 12
territory, not started:

- **Tailwind on the Week 1-2 pages.** `/login`, `/workspaces`, and
  `/workspaces/[id]` still use their original inline styles — Tailwind (v3;
  v4 changed its PostCSS integration and broke the classic
  `tailwind.config.ts` + `@tailwind`-directive setup, so it's pinned) is
  only on the List, Board, Sprints, and Timeline surfaces so far.
  Migrating the rest is a fast-follow, not a blocker.
- **Multi-assignee UI.** The schema and API already support multiple
  assignees per Task (`assigneeIds: string[]`); every view treats it as
  single-select for now.
- **Custom fields and Sprint context on the Board view.** The Board's
  cards show priority/assignee/due-date but not custom field values, and
  the Board isn't Sprint-aware (no filter/grouping by Sprint) — both are
  rendering gaps, not data gaps; the underlying data is already fetched.
- **S3 (or equivalent) for Attachments.** Currently local disk — fine for
  a single dev machine, not for a deployed multi-instance app.
- **Task dependencies.** `TaskDependency` is schema-ready
  (`blockingTaskId`/`blockedTaskId`) but has no endpoints and no UI — the
  Timeline view doesn't draw dependency arrows. A real feature, not a
  quick add; genuinely out of scope for what got built here.

## Start here — Week 12

Per the PRD's plan, Week 12 is hardening: this is the last week before
"MVP done," and the PRD's own framing is that it's about closing gaps
above, not adding new features. In priority order, given what's actually
missing right now: (1) the two verification gaps noted above — a human
confirming the Board's drag-and-drop gesture in a real browser, since it
was never fully verified through automation, and (2) the Tailwind
migration on the four remaining pages, since visual inconsistency is the
most user-visible unfinished edge in the app right now. Everything else
in "what does NOT exist yet" is a legitimate scope decision, not a defect
— triage against real user feedback before building further, rather than
treating this list as a backlog to clear mechanically.

## Conventions to keep

- REST, OpenAPI-documented, not GraphQL — see the PRD's architecture
  section for why (revisit only if you hit a concrete wall the PRD didn't
  anticipate, and say so in a commit message or PR description when you do).
- Field-level PATCHes, not whole-resource overwrites — every Task update
  already follows this (see `UpdateTaskDto` — every field optional). Keep
  it that way as Custom Fields, Comments, and Attachments land; it's what
  makes the conflict-handling approach in the PRD work.
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
