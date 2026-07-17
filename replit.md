# Lumora — Bot Host Hub

A Discord bot hosting platform. Users upload bot code (ZIP), activate it with a hosting key, and manage it via the Lumora web portal or Discord slash commands. Features include AI-powered crash repair, live log streaming, and an admin panel.

## Stack

- **Frontend**: React 19 + Vite + Tailwind CSS v4 + Radix UI + Wouter (port 22333)
- **Backend**: Express 5 + Discord.js 14 (port 8080, mounted at `/api`)
- **Database**: PostgreSQL via Drizzle ORM (Replit managed)
- **Package manager**: pnpm workspaces (monorepo)
- **Language**: TypeScript 5.9 / Node 24

## Monorepo layout

```
artifacts/
  api-server/   — Express API + Discord bot
  web/          — React SPA (Lumora Portal)
  mockup-sandbox/ — Component preview dev server
lib/
  db/           — Drizzle schema & client
  api-spec/     — OpenAPI spec (openapi.yaml)
  api-zod/      — Generated Zod validators
  api-client-react/ — Generated React query hooks
scripts/        — Workspace utility scripts
```

## Running locally

Three workflows are configured in Replit:

| Workflow | Command | Port |
|---|---|---|
| `artifacts/web: web` | `pnpm --filter @workspace/web run dev` | 22333 |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 |
| `artifacts/mockup-sandbox: Component Preview Server` | `pnpm --filter @workspace/mockup-sandbox run dev` | 8081 |

## Required environment

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Auto-managed by Replit PostgreSQL |
| `SESSION_SECRET` | Secret — set via Replit Secrets |
| `PORT` | Set to `8080` for the API server |

Discord credentials (bot token, OAuth client ID/secret, guild ID) are stored at runtime in the `app_config` database table and can be configured through the admin panel.

## Database schema

Tables: `tickets`, `hosting_keys`, `hosted_bots`, `app_config`.
Schema lives in `lib/db/src/schema/`. Run migrations with:
```bash
cd lib/db && pnpm drizzle-kit push
```

## User preferences

- Keep the existing monorepo structure and pnpm workspace setup.
