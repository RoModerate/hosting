# Lumora — Discord Bot Hosting Portal

A hosting operation for Discord bots: staff triage customers through Discord support tickets, issue a time-limited access key with `/genkey`, and the customer redeems that key on the Lumora website to upload and manage their bot.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server + Discord bot (port from `PORT`)
- `pnpm --filter @workspace/web run dev` — run the customer-facing hosting portal website
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_STAFF_ROLE_ID`, `DISCORD_TICKET_CATEGORY_NAME`, `SESSION_SECRET` (signs the portal's session cookie), `OPENROUTER_API_KEY` (AI failure explanations)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, Discord bot: discord.js
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Web: React + Vite (`artifacts/web`)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/discord/` — Discord bot: ticket lifecycle (`tickets.ts`), slash commands (`commandDefinitions.ts`, `interactionHandler.ts`, `statusCommands.ts`, `helpCommand.ts`, `genKeyCommand.ts`), file attachment intake (`attachmentHandler.ts`), staff notifications from the website (`notify.ts`)
- `artifacts/api-server/src/discord/hosting/runner.ts` — shared hosting engine (`hostUploadedZip`, `restartHostedBot`, `getHostedBotStatus`, `resumeHostedBotsOnBoot`); called from both Discord attachments and the website upload/restart routes
- `artifacts/api-server/src/discord/hosting/aiExplain.ts` — OpenRouter call that turns a raw hosting failure/log into a plain-language explanation for the customer
- `artifacts/api-server/src/routes/hosting.ts` — website-facing hosting API (`/keys/redeem`, `/session/me`, `/bots/upload`, `/bots/restart`)
- `artifacts/api-server/src/lib/session.ts` — signed-cookie session helpers for the website
- `lib/db/src/schema/` — `tickets.ts`, `hostedBots.ts` (adds `aiExplanation`), `hostingKeys.ts` (staff-issued access keys)
- `lib/api-spec/openapi.yaml` — source of truth for the website API contract; run codegen after editing
- `artifacts/web/` — the customer-facing hosting portal (redeem screen + dashboard)

## Architecture decisions

- Website sessions use `cookie-parser` signed cookies (`SESSION_SECRET`) rather than JWT — cookie payload is just `{ keyId }`, and validity (status/expiry) is re-checked against the `hostingKeys` DB row on every request so a key can be revoked immediately instead of trusting an embedded expiry.
- Hosting keys (`hostingKeys` table) go `unused` → `active` (on first redeem, `expiresAt` computed at redemption time from `hostingDurationDays`) → `expired`/`revoked`. Re-redeeming an already-active key just re-establishes the session cookie (e.g. customer switches browsers).
- One ticket has exactly one hosted bot; the website and Discord both drive the same `runner.ts` hosting engine so there's a single source of truth for install/start/crash logic.
- On any hosting failure (`crashed`/`error`), an OpenRouter LLM call explains the failure in plain language, stored as `hostedBots.aiExplanation` and mirrored into both the website response and the Discord ticket channel. This never blocks or fails the hosting flow — if `OPENROUTER_API_KEY` is missing or the call errors, `aiExplanation` is just `null`.
- Website upload/restart actions post a status message back into the originating Discord ticket channel (`notify.ts`) so staff stay in the loop even when the customer acts entirely from the website.

## Product

- **Discord side:** `/ticket` opens a support ticket, staff run `/genkey <days>` inside it to mint a one-time access key, `/status` / `/restart` / `/help` remain available for staff/owner use directly in Discord.
- **Website side (`artifacts/web`):** customer redeems their access key, then from a dashboard uploads their bot's ZIP, sees live hosting status, restarts it, and — if hosting fails — sees a plain-language AI explanation of what went wrong alongside the raw log.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `lib/api-zod`'s `tsconfig.json` needs `"dom"` in `compilerOptions.lib` (alongside `es2022`) — Orval's `format: binary` file-upload fields generate `Blob`/`File` TS types, which don't resolve in a Node-only `lib`.
- After changing `lib/db` schema files, run `pnpm -w run typecheck:libs` before typechecking dependents — the composite build needs to regenerate declarations or new exports (tables/types) won't be visible.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
