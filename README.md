# Shipboard

Project management for fast-paced e-commerce teams — Jira's rigor, ClickUp's
flexibility, purpose-built for running sprints, campaigns, and inventory ops
out of one workspace.

**Full spec:** see `HANDOFF.md` for what to build next, and the published PRD
for product vision, feature scope, architecture rationale, and the 12-week
plan: **[Shipboard PRD & Architecture Plan](https://claude.ai/code/artifact/7d4028c0-4369-423b-ae17-428fa35484eb)**

## What's here

A monorepo skeleton — not a built product. Two npm workspaces:

- `apps/api` — NestJS + Prisma. Boots, connects to Postgres, exposes one
  `/health` endpoint. The full data model is already in
  `apps/api/prisma/schema.prisma`, transcribed directly from the PRD. No
  domain modules (workspaces, tasks, auth, etc.) exist yet — that's Week 1-4.
- `apps/web` — Next.js 14 App Router. One placeholder page. No product UI
  exists yet — that's Week 3-4 onward.

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
  api/    NestJS backend (REST, Socket.IO planned, Prisma/Postgres)
  web/    Next.js frontend
```
