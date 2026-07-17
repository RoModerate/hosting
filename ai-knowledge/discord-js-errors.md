# Discord.js Common Errors & Fixes

## TOKEN_INVALID / Invalid Token
**Error:** `Error [TOKEN_INVALID]: An invalid token was provided.`
**Causes:**
- The token value is wrong or expired
- Using the Client ID or Client Secret instead of the Bot Token
- Token was copied with extra whitespace
**Fix:**
1. Go to Discord Developer Portal → Your Application → Bot → Reset Token
2. Copy the new token (it shows only once)
3. Add it as `DISCORD_BOT_TOKEN` in the Secrets panel
4. Ensure your code uses `client.login(process.env.DISCORD_BOT_TOKEN)`

## TOKEN_MISSING / No Token
**Error:** `Error [TOKEN_MISSING]: A token must be provided.`
**Causes:**
- `client.login()` called without a token argument
- Token env var not set or undefined
**Fix:**
```js
// Correct pattern:
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) throw new Error("DISCORD_BOT_TOKEN is not set");
client.login(token);
```

## DISALLOWED_INTENTS / Privileged Gateway Intents
**Error:** `Error [DISALLOWED_INTENTS]: Privileged intent provided is not enabled or whitelisted.`
**Causes:**
- Bot requests `GuildMembers`, `MessageContent`, or `Presence` intents not enabled in Dev Portal
**Fix:**
1. Discord Developer Portal → Your Application → Bot → Privileged Gateway Intents
2. Enable: Server Members Intent, Message Content Intent, Presence Intent (as needed)
3. Save and restart the bot

## Cannot Read Properties of Undefined (common Discord.js v14 pitfall)
**Error:** `TypeError: Cannot read properties of undefined (reading 'cache')`
**Cause:** Accessing guild or channel cache before the bot is ready, or missing intents
**Fix:** Move code into `client.once('ready', ...)` handler, ensure correct intents are declared

## Missing Permissions / Missing Access
**Error:** `DiscordAPIError[50013]: Missing Permissions` or `DiscordAPIError[50001]: Missing Access`
**Fix:** Reinvite the bot with correct OAuth2 scopes and permissions. Use https://discordapi.com/permissions.html

## Sharding Required (large bots)
**Error:** `Error: Sharding is required for bots in 2500 or more guilds.`
**Fix:** Implement Discord.js `ShardingManager` or use a sharding library.

## Rate Limits
**Error:** `DiscordAPIError[429]: You are being rate limited.`
**Fix:** Add rate-limit handling or use Discord.js built-in rate limit management (already built in by default).

## Common Token Variable Names
Lumora checks these variable names for your Discord bot token:
- `DISCORD_BOT_TOKEN` (canonical)
- `DISCORD_TOKEN`
- `BOT_TOKEN`
- `TOKEN`
- `DISCORD_CLIENT_TOKEN`

If your code uses one of the aliases, Lumora maps it automatically.
