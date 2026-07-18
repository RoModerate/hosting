# Lumora Portal

A Discord bot hosting and management platform. Users upload Discord bots (Node.js or Python), and Lumora keeps them online 24/7 with auto-repair, file management, and a support ticket system.

## Architecture

pnpm monorepo with three artifacts:

| Artifact | Port | Purpose |
|---|---|---|
| `artifacts/api-server` | 8080 | Express v5 REST API + Discord bot |
| `artifacts/web` | 22333 | React 19 + Vite frontend |
| `artifacts/mockup-sandbox` | — | UI component design sandbox |

Shared libraries in `lib/`:
- `lib/db` — Drizzle ORM schema + PostgreSQL client (Replit managed DB)
- `lib/api-spec` — OpenAPI spec
- `lib/api-zod` — Zod validators generated from spec
- `lib/api-client-react` — TanStack Query hooks generated from spec

## How to run

Both workflows start automatically:
- **API Server**: `pnpm --filter @workspace/api-server run dev` (builds with esbuild, then runs)
- **Web**: `pnpm --filter @workspace/web run dev` (Vite dev server)

Install dependencies: `pnpm install`  
Push DB schema: `pnpm --filter @workspace/db run push`

## Setup status (Replit)

| Step | Status |
|---|---|
| Dependencies installed (`pnpm install`) | ✅ Done |
| Database schema pushed (`pnpm --filter @workspace/db run push`) | ✅ Done |
| `PORT=8080` set in shared env | ✅ Done |
| `SESSION_SECRET` secret | ✅ Set |
| `DISCORD_BOT_TOKEN` env var | ✅ Set |
| `DISCORD_GUILD_ID` env var | ✅ Set |
| `DISCORD_STAFF_ROLE_ID` env var | ✅ Set |
| `DISCORD_CLIENT_ID` secret | ✅ Set |
| `DISCORD_CLIENT_SECRET` secret | ✅ Set |
| `OPENROUTER_API_KEY` secret | ⬜ Optional — enables AI repair/explain |
| `ADMIN_PASSWORD` secret | ⬜ Recommended — defaults to `lumora-admin` |

## Environment variables

| Key | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✓ | Replit managed — set automatically |
| `SESSION_SECRET` | ✓ | Secret — stored in Replit Secrets |
| `PORT` | ✓ | `8080` for API server (shared env) |
| `DISCORD_CLIENT_ID` | ✓ | OAuth app client ID — stored in Replit Secrets |
| `DISCORD_CLIENT_SECRET` | ✓ | Secret — stored in Replit Secrets |
| `DISCORD_BOT_TOKEN` | ✓ | Stored in shared env (move to Secrets for production) |
| `DISCORD_GUILD_ID` | ✓ | Target Discord server ID |
| `DISCORD_STAFF_ROLE_ID` | ✓ | Role that can manage tickets |
| `DISCORD_TICKET_CATEGORY_NAME` | — | Defaults to `"Tickets"` |
| `OPENROUTER_API_KEY` | — | Secret — enables AI repair/explain features |
| `OPENROUTER_MODEL` | — | Defaults to `openai/gpt-4o-mini` |
| `ADMIN_PASSWORD` | — | Defaults to `lumora-admin` — **change in production** |

## Tech stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Wouter, TanStack Query, Radix UI / shadcn, CodeMirror
- **Backend**: Express v5, Node.js ESM, Discord.js v14, Drizzle ORM, Pino logging
- **Database**: PostgreSQL (Replit managed)
- **Tooling**: TypeScript, Zod, Orval (API client codegen), esbuild

## User preferences

- Keep the existing monorepo structure intact
