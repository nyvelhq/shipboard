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
- `lib/api.ts` is the typed client for every endpoint through Week 7-8.
- `docker-compose.yml` for local Postgres + Redis, CI that installs,
  generates the Prisma client, and builds both workspaces on every push.

**Weeks 1-2 through 7-8 are done.** Verified live in a browser, not just
build checks. Most recently: created a dropdown custom field and set both
it and a pre-existing text field's value on a Task through the actual UI,
confirmed both persisted via a direct API read; uploaded a file and posted
a comment through the detail panel, both appeared correctly; confirmed the
ownership guard rejects a mismatched-taskId upload before any disk write.
Also re-confirmed real-time sync survived these changes — a Task created
via a disconnected curl client still appeared in an open tab with zero
manual reload.

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

Nothing here pretends to be further along than it is. Genuinely Week 9-11
territory, not started:

- **Tailwind on the Week 1-2 pages.** `/login`, `/workspaces`, and
  `/workspaces/[id]` still use their original inline styles — Tailwind (v3;
  v4 changed its PostCSS integration and broke the classic
  `tailwind.config.ts` + `@tailwind`-directive setup, so it's pinned) is
  only on the List, Board, and Task-detail surfaces so far. Migrating the
  rest is a fast-follow, not a blocker.
- **Multi-assignee UI.** The schema and API already support multiple
  assignees per Task (`assigneeIds: string[]`); the List view, Board view,
  and detail panel all treat it as single-select for now.
- **Custom fields on the Board view.** The Board's cards show priority/
  assignee/due-date but not custom field values yet — `useListTasks`
  already fetches the applicable fields, so this is a Board-card
  rendering gap, not a data gap.
- **S3 (or equivalent) for Attachments.** Currently local disk — fine for
  a single dev machine, not for a deployed multi-instance app. See the
  note above.
- Sprints, Timeline (Gantt) view.
- The Gantt component decision (Bryntum vs. DHTMLX vs. build) — the PRD
  flags this as a build-or-buy call that should be pinned *before* Week 11,
  not during it.

## Start here — Week 9-10

Per the PRD's plan, Week 9-10 is Sprints + Agile/Scrum tooling: Sprint
CRUD nested under a List (the `Sprint` model already exists — `startDate`/
`endDate`/`goal`/`status`), assigning Tasks to a Sprint (`Task.sprintId`,
already on the schema, unused so far), and velocity tracking off
`Task.storyPoints` (also already on the schema, unused). Follow the same
ownership-chain pattern as everything else: a Sprint's `listId` must
resolve back to the Space/Workspace in the URL, the same way Tasks already
do via `ListsService.findOne`.

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
