# Discord.js Common Errors & Agent Fixes

## TOKEN_INVALID / Invalid Token
**Error:** `Error [TOKEN_INVALID]: An invalid token was provided.`
**Cause:** Wrong token, using Client ID or Client Secret, token with extra whitespace, or expired token.
**Agent action:** `mark_done` with `requires_user_action: true`.
Message: "Your Discord bot token is invalid or expired. Go to the Discord Developer Portal → Your Application → Bot → Reset Token, copy the new token, and update it in the Secrets panel."

## TOKEN_MISSING / No Token
**Error:** `Error [TOKEN_MISSING]: A token must be provided.`
**Cause:** `client.login()` called with `undefined` — env var not set or read incorrectly.
**Agent action:** Use `search_files("login(")` to find the login call. Check how the token is read.
If the code uses a non-standard var name, fix the code with `write_file` to use `process.env.DISCORD_BOT_TOKEN`.
If no token is configured at all, `mark_done` with `requires_user_action: true`.

**Correct token usage pattern:**
```js
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) { console.error("DISCORD_BOT_TOKEN not set"); process.exit(1); }
client.login(token);
```

## DISALLOWED_INTENTS / Privileged Gateway Intents
**Error:** `Error [DISALLOWED_INTENTS]: Privileged intent provided is not enabled or whitelisted.`
**Cause:** Bot requests GuildMembers, MessageContent, or Presence intents not enabled in Dev Portal.
**Agent action:** `mark_done` with `requires_user_action: true`.
Message: "Your bot is requesting Discord gateway intents that aren't enabled yet. Go to Discord Developer Portal → Your Application → Bot → Privileged Gateway Intents and enable the ones your bot uses (Server Members, Message Content, and/or Presence)."

**Optional code fix (remove privileged intents if not needed):**
```js
// BEFORE (may cause error):
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent] });

// AFTER (if those intents aren't actually used):
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
```

## Cannot Find Module 'discord.js'
**Error:** `Error: Cannot find module 'discord.js'`
**Agent action:** `install_dependencies("discord.js")`, then `mark_done`.

## Cannot Find Module (any package)
**Error:** `Error: Cannot find module 'X'`
**Agent action:**
1. Read package.json to confirm if `X` is listed in dependencies
2. If missing from package.json: use `write_file` to add it, then `install_dependencies("X")`
3. If listed but not installed: `install_dependencies("X")`

## Discord.js v14 Intent Setup (most common correct pattern)
```js
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    // Add GatewayIntentBits.MessageContent only if needed (and enabled in Dev Portal)
  ]
});
```

## client.on('ready') vs client.once('ready')
Using `client.on('ready')` will fire every time the bot reconnects. Use `client.once('ready', ...)` for initialization code.

## SlashCommandBuilder / Interaction not registered
These bots often fail silently if commands aren't deployed. This is a user issue, not a deployment issue.

## SyntaxError in .js file
**Agent action:** Read the file, find the syntax error, fix it with `write_file`.
Common causes: missing closing bracket, extra comma, `await` outside async function.

## ReferenceError: require is not defined
**Cause:** File uses `require()` but package.json has `"type": "module"` (ESM mode).
**Agent action:**
Option A: Remove `"type": "module"` from package.json (makes all .js files CommonJS)
Option B: Convert the file to use ES module `import` syntax

## __dirname is not defined (ESM)
**Cause:** `__dirname` is a CommonJS global, not available in ES modules.
**Fix:**
```js
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

## Rate Limits
**Error:** `DiscordAPIError[429]: You are being rate limited.`
This is a bot logic issue — requires user action to reduce API call frequency.

## Cannot read properties of undefined (reading 'send' / 'cache' / etc.)
**Cause:** Usually accessing guild/channel cache before bot is ready, or missing intents.
**Fix:** Wrap initialization in `client.once('ready', () => { ... })`.

## DiscordAPIError[50035]: Invalid Form Body (slash commands)
The bot's slash command definitions have invalid data. This is a code logic issue requiring user review.
