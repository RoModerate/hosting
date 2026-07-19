# Lumora Portal

A Discord bot hosting platform. Users upload bot source code via a web dashboard, monitor execution, and benefit from automated process management and AI-powered crash repair.

## Architecture

pnpm monorepo with three artifacts:

| Artifact | Port | Path |
|---|---|---|
| `artifacts/web` | 22333 | `/` — React + Vite frontend |
| `artifacts/api-server` | 8080 | `/api` — Express.js API + Discord bot |
| `artifacts/mockup-sandbox` | 8081 | `/__mockup` — Vite design sandbox |

Shared libraries in `lib/`:
- `lib/db` — PostgreSQL schema (Drizzle ORM)
- `lib/api-client-react` — Generated React Query hooks (orval)
- `lib/api-spec` — OpenAPI spec
- `lib/api-zod` — Zod validators

## How to run

Both workflows start automatically:
- **Lumora Portal** (`artifacts/web: web`) — Vite dev server on port 22333
- **API Server** (`artifacts/api-server: API Server`) — Express + Discord bot on port 8080

Replit's proxy routes `/api/*` to the API server and everything else to the web app.

## Environment setup

All required secrets are configured as Replit Secrets:
- `SESSION_SECRET` — signs session cookies
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` — Discord OAuth
- `DISCORD_GUILD_ID` / `DISCORD_STAFF_ROLE_ID` — bot guild config
- `OPENROUTER_API_KEY` — AI auto-repair feature
- `DISCORD_BOT_TOKEN` — set in shared env vars (non-secret)

`DATABASE_URL` is runtime-managed by Replit (PostgreSQL already provisioned).

## Database migrations

```bash
pnpm --filter @workspace/db run push
```

## Key features

- Discord OAuth login + access key authentication
- Admin panel (`/admin`) — password protected (env: `ADMIN_PASSWORD`, default: `lumora-admin`)
- Per-user bot file manager with CodeMirror editor
- AI crash repair via OpenRouter (automatic on crash, up to 3 attempts)
- Bot process sandboxing in `artifacts/api-server/storage/bots/`

## User preferences

<!-- User preferences go here -->
