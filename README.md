# Shipboard

Project management for fast-paced e-commerce teams — Jira's rigor, ClickUp's
flexibility, purpose-built for running sprints, campaigns, and inventory ops
out of one workspace.

**Full spec:** see `HANDOFF.md` for what to build next, and the published PRD
for product vision, feature scope, architecture rationale, and the 12-week
plan: **[Shipboard PRD & Architecture Plan](https://claude.ai/code/artifact/7d4028c0-4369-423b-ae17-428fa35484eb)**

## What's here

All 12 weeks of the PRD's plan are built. Two npm workspaces:

- `apps/api` — NestJS + Prisma. Auth (signup/login), permission-checked
  Workspace → Space → Folder → List → Task CRUD (with subtasks, status
  transitions, assignees), Custom Fields, Comments, Attachments (local
  disk storage), and Sprints (story points, velocity), plus a Socket.IO
  gateway that broadcasts changes to every client viewing the same List
  in real time. The full data model from the PRD is in
  `apps/api/prisma/schema.prisma`, migrated against Postgres.
- `apps/web` — Next.js 14 App Router, Tailwind throughout, Inter
  typeface. A persistent app shell (collapsible sidebar, breadcrumbs),
  a List view with an editable Task table, a Kanban Board with drag-
  and-drop and priority-icon/story-point cards, a Task detail view
  (title/status/description on the left, assignee/reporter/dates/labels
  on the right), Sprint planning (backlog ↔ sprint assignment, velocity
  tracking), a hand-built Timeline (Gantt) view, toast notifications,
  and skeleton loading states — List/Board/detail/Sprints/Timeline all
  update live across open tabs without a reload.

See `HANDOFF.md` for what's deliberately out of scope (not missing —
scoped) and the one interaction that still needs a human to verify in a
real browser (the Board's drag-and-drop gesture).

## Quickstart

```bash
docker compose up -d          # Postgres + Redis
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm run --workspace=apps/api prisma:migrate
npm run dev:api                # http://localhost:4000/health
npm run dev:web                # http://localhost:3000
```

## Repo layout

```
apps/
  api/    NestJS backend (REST + Socket.IO, Prisma/Postgres)
  web/    Next.js frontend
```
