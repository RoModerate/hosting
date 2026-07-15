# Lumora / Bot Host Hub

A Discord bot hosting platform: users upload bot code, activate it with a key, and Lumora runs/monitors it. Includes a client web portal, an admin panel, an API server with a Discord bot for tickets/notifications, and a component-preview canvas.

## Run & Operate

The app runs as three Replit artifact workflows (already configured and running):

- `artifacts/api-server: API Server` — Express API + Discord bot, port 8080, mounted at `/api`
- `artifacts/web: web` — Lumora Portal (client + admin UI), port 22333, mounted at `/`
- `artifacts/mockup-sandbox: Component Preview Server` — design/component canvas, port 8081, mounted at `/__mockup`

Other useful commands:

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

Required env/secrets (already configured in this environment):

- `DATABASE_URL` — Postgres connection string (Replit-managed, auto-provisioned)
- `SESSION_SECRET` — cookie-signing secret
- `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_STAFF_ROLE_ID` — required for the Discord bot/ticket features; app runs without them but Discord features stay disabled
- `ADMIN_PASSWORD` — admin panel password (defaults to `lumora-admin` if unset)
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` — optional, powers AI failure-explanation for bot crashes

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, discord.js
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite + Tailwind, `@workspace/api-client-react` generated hooks
- Build: esbuild (CJS bundle) for the API server

## Where things live

- `artifacts/api-server` — Express API (`src/routes`), Discord bot (`src/discord`), bot process hosting/runner logic (`src/discord/hosting`)
- `artifacts/web` — client portal + admin UI
- `artifacts/mockup-sandbox` — component preview canvas
- `lib/db` — Drizzle schema (`src/schema`) and DB client — source of truth for the data model
- `lib/api-spec` — OpenAPI spec (`openapi.yaml`) — source of truth for the API contract
- `lib/api-zod`, `lib/api-client-react` — generated from the OpenAPI spec via Orval

## Architecture decisions

- Each artifact (`api-server`, `web`, `mockup-sandbox`) is a separate service defined by an `artifact.toml`; the platform generates and manages the workflow + port/env wiring from that file. Don't hand-edit `artifact.toml` directly — use the artifact TOML replace flow instead.
- API server dev/prod ports and `BASE_PATH`/`PORT` env vars for the web artifact are injected by the artifact runtime per `[services.env]` in its `artifact.toml`.

## Product

- Client portal: users enter an activation key to access their hosted bot's dashboard/status.
- Admin panel: manage hosting keys, tickets, and app config (OpenRouter key/model, etc.).
- Discord bot: slash commands for generating keys, checking bot status, and a ticket system backed by Discord channels.
- Bot hosting: upload a zipped bot, Lumora extracts and runs it as a managed process with status/log capture and optional AI-assisted failure explanations.

## User preferences

_None recorded yet._

## Gotchas

- If a web/mockup-sandbox artifact workflow fails with `BASE_PATH environment variable is required`, its `artifact.toml` is missing the `[services.env]` block (PORT/BASE_PATH) — fix via the artifact TOML replace flow, not a direct file edit.
- The web artifact serves on port 22333 (external port 3000), not 5000 — pass `port: 22333` when screenshotting it.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
