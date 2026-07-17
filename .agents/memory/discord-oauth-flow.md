---
name: Discord OAuth flow
description: How Discord login is wired up in Lumora — frontend callback page + backend exchange endpoint.
---

## Architecture

OAuth callback URL is registered at `https://<domain>/auth/discord/callback` (React SPA route, not API).
The SPA picks up the `?code=` param and calls `POST /api/auth/discord/exchange { code, redirectUri }`.
The API exchanges with Discord, looks up the ticket by `ticketsTable.ownerId = discordId`, finds an active key,
issues the signed session cookie (extended with discord profile), and returns session data.

**Why:** The web artifact serves `/` and the API serves `/api`. The callback URL therefore hits the React app,
not the Express server. A dedicated `DiscordCallback.tsx` page handles the code exchange client-side.

## Session cookie extension

`SessionPayload = { keyId: number; discord?: DiscordProfile }` where `DiscordProfile` has `id, username, globalName, avatar`.
`issueSessionCookieWithDiscord` stores Discord user in the cookie alongside keyId.
`resolveSession` returns `{ key, ticket, discord: DiscordProfile | null }`.

## Key lookup logic

Ticket lookup: `ticketsTable.ownerId` already stores the Discord user ID — no schema change needed.
Flow: Discord ID → find tickets by ownerId → for each ticket find active non-expired key → issue session.
Errors: `no_ticket` (no ticket for Discord account), `key_expired` (ticket exists but key expired).

## Files changed

- `artifacts/api-server/src/routes/discord-auth.ts` — two new routes: GET /auth/discord/url, POST /auth/discord/exchange
- `artifacts/api-server/src/lib/session.ts` — extended SessionPayload + issueSessionCookieWithDiscord
- `artifacts/api-server/src/routes/index.ts` — registers discord-auth router
- `artifacts/web/src/pages/Login.tsx` — Discord button (primary) + key entry fallback
- `artifacts/web/src/pages/DiscordCallback.tsx` — handles OAuth code exchange in browser
- `artifacts/web/src/App.tsx` — added /auth/discord/callback route

## Secrets

`DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` must be set as Replit Secrets.
Fallback: if `DISCORD_CLIENT_ID` is missing, `/api/auth/discord/url` returns 503 and the login page still shows the Discord button (it will fail gracefully; users can use the key fallback).
