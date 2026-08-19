# Shipboard

Project management for fast-paced e-commerce teams — Jira's rigor, ClickUp's
flexibility, purpose-built for running sprints, campaigns, and inventory ops
out of one workspace.

**Full spec:** see `HANDOFF.md` for what to build next, and the published PRD
for product vision, feature scope, architecture rationale, and the 12-week
plan: **[Shipboard PRD & Architecture Plan](https://claude.ai/code/artifact/7d4028c0-4369-423b-ae17-428fa35484eb)**

## What's here

Weeks 1-6 of the 12-week plan are done. Two npm workspaces:

- `apps/api` — NestJS + Prisma. Auth (signup/login), permission-checked
  Workspace → Space → Folder → List → Task CRUD (with subtasks, status
  transitions, assignees), and a Socket.IO gateway that broadcasts Task
  changes to every client viewing the same List in real time. The full
  data model from the PRD is in `apps/api/prisma/schema.prisma`, migrated
  against Postgres.
- `apps/web` — Next.js 14 App Router. Sign-in/sign-up, a Workspace list, a
  Workspace detail view (Spaces + Lists), a List view with an editable
  Task table, and a Board (Kanban) view with drag-and-drop between status
  columns — both views update live across open tabs without a reload.

No Sprints, Custom Fields, Comments/Attachments, or Timeline (Gantt) view
yet — that's Week 7-8 onward. See `HANDOFF.md` for the exact boundary.

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
