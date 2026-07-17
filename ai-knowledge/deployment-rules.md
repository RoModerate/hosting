# Lumora Deployment Rules & Guidelines

## How Deployment Works

1. **ZIP Upload** — Customer uploads a .zip of their Discord bot
2. **Scan** — Lumora scans for language (Node.js / Python), Discord library, package manager, and entry point
3. **Isolate** — Bot is copied to a clean sandbox directory
4. **Install** — Dependencies installed (`npm install`, `pip install -r requirements.txt`)
5. **Build** — TypeScript bots: `npm run build` is run if a build script exists
6. **Probe** — Bot is started; Lumora watches for 8 seconds to confirm it stays running
7. **Auto-Repair** — If the bot crashes, Lumora attempts up to 3 automatic repairs
8. **Supervise** — Healthy bots are monitored; crashes trigger up to 5 auto-restarts

## Language Detection

**Node.js bot detected when:**
- `package.json` contains `discord.js`, `eris`, `oceanic.js`, or `@discordjs/*` in dependencies
- OR source files contain `require('discord.js')`, `from 'discord.js'`, `client.login(`, etc.

**Python bot detected when:**
- `requirements.txt` contains `discord.py`, `py-cord`, `nextcord`, `disnake`, or `hikari`
- AND one of `bot.py`, `main.py`, `app.py`, `run.py` exists

## Start Command Detection (Node.js)

Lumora tries these in order:
1. `npm run start` (if `scripts.start` exists and entry file is present)
2. `npm run dev` (if `scripts.dev` exists)
3. `node <main field in package.json>` (if file exists)
4. `node index.js`, `node bot.js`, `node main.js`, `node src/index.js`, etc.

**If no start command is found:** Add `"start": "node index.js"` to `scripts` in package.json.

## Start Command Detection (Python)

Tries in order: `python3 bot.py`, `python3 main.py`, `python3 app.py`, `python3 run.py`

## Environment Variables

Lumora **never** exposes these to hosted bots:
- `DISCORD_BOT_TOKEN` (Lumora's own)
- `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD`
- `OPENROUTER_API_KEY`

Customers add their **own** bot token and other secrets via the Secrets & Env Vars panel.

## Token Variable Name Mapping

Lumora recognizes these names as the Discord bot token (in order of preference):
```
DISCORD_BOT_TOKEN  ← canonical name Lumora expects
DISCORD_TOKEN
BOT_TOKEN
TOKEN
DISCORD_CLIENT_TOKEN
```

If a customer's bot uses `TOKEN` but they set `DISCORD_BOT_TOKEN`, Lumora automatically maps it.

## Safe Automatic Fixes Lumora Can Apply

1. **Add missing start script** — If no start script exists, scan for a runnable .js or .py file and add it
2. **Token variable aliasing** — Map alternate token names to the canonical `DISCORD_BOT_TOKEN`
3. **Install missing safe packages** — Auto-install well-known packages (discord.js, dotenv, etc.)
4. **Rewrite workspace: deps** — Convert `workspace:*` to `*` for standalone operation

## What Lumora Cannot Fix Automatically

- Wrong Discord bot token (user must update in Secrets panel)
- Missing Privileged Gateway Intents (user must enable in Discord Developer Portal)
- Bot logic errors or syntax errors in user code
- Missing required external services (database, API keys, etc.)
- TypeScript compilation errors

## Friendly Error Message Guidelines

When explaining errors to customers:
- Never mention tokens or secret values
- Never expose internal file paths
- Never show raw stack traces
- Use plain language: "Your bot needs..." not "ReferenceError at line 42..."
- Always suggest a concrete action the user can take
- Keep it to 1-3 sentences

## ZIP File Requirements

- Must be a valid .zip archive (not .tar.gz, .rar, etc.)
- Maximum size: 100MB
- Should contain the bot project directory (with package.json or requirements.txt at or near the root)
- Should NOT include `node_modules/` (Lumora installs fresh)
- Should NOT include `.env` files with real secrets
