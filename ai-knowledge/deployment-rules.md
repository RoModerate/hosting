# Lumora Deployment Rules & Agent Guide

## How Deployment Works

1. **ZIP Upload** — Customer uploads a .zip of their Discord bot
2. **Scan** — Lumora scans for language (Node.js / Python), Discord library, package manager, and entry point
3. **Isolate** — Bot is copied to a clean sandbox directory
4. **Install** — Dependencies installed (`npm install`, `pip install -r requirements.txt`)
5. **Build** — TypeScript bots: `npm run build` runs automatically if a `build` script exists
6. **Pre-launch AI analysis** — Agent inspects all files and applies fixes before the first probe
7. **Probe** — Bot is started; Lumora watches for 8 seconds to confirm it stays running
8. **Crash Repair** — If the bot crashes, AI agent diagnoses and fixes (up to 3 attempts)
9. **Supervise** — Healthy bots are monitored; crashes trigger up to 5 auto-restarts

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

**If no start command is found:** Use set_start_command or write_file to add `"start": "node <entryfile>"` to scripts.

## Start Command Detection (Python)

Tries in order: `python3 bot.py`, `python3 main.py`, `python3 app.py`, `python3 run.py`

## Agent: How to Find the Right Entry File

1. Call `list_files` on root and `src/` directory
2. Look for files named: `index.js`, `index.mjs`, `bot.js`, `main.js`, `app.js`, `index.ts`, `bot.ts`
3. Read the file — it should contain `client.login(` or `bot.run(` or equivalent
4. If the entry is a TypeScript file with a build script, the real entry is `dist/index.js`

## TypeScript Bots — Full Workflow

1. Check if `tsconfig.json` exists: `list_files`
2. Read `tsconfig.json` — find `outDir` (usually `dist/`)
3. If there's a `build` script in package.json, Lumora already ran it → entry is `dist/<outDir>/index.js`
4. If no `build` script: add `"build": "tsc"` to scripts AND `"start": "node dist/index.js"`
5. If `tsconfig.json` is missing: create a basic one

**Minimal tsconfig.json for Discord bots:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## ESM vs CommonJS

**Signs of ESM:** `"type": "module"` in package.json, or `.mjs` files, or `import`/`export` syntax
**Signs of CJS:** `require()`, `module.exports`, no `"type": "module"`

**ESM pitfalls:**
- `require` is not defined → must use `import`
- `__dirname` is not defined → use `import.meta.url` + `fileURLToPath`
- Dynamic require → use `createRequire(import.meta.url)`
- If bot uses CJS but package.json has `"type": "module"`, remove `"type": "module"` or rename files to `.cjs`

## workspace:* and catalog: Dependencies (monorepo artifacts)

These only work inside a pnpm/yarn workspace. Fix:
1. Read `package.json`
2. Replace any `"workspace:*"` values with `"*"` (or a real semver like `"^latest"`)
3. Replace any `"catalog:*"` values with `"*"`
4. Write the fixed package.json with `write_file`
5. Run `install_dependencies` for any packages that may not have been installed

## Environment Variables

Lumora **never** exposes these to hosted bots:
- `DISCORD_BOT_TOKEN` (Lumora's own)
- `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD`
- `OPENROUTER_API_KEY`

Customers add their **own** bot token and other secrets via the Secrets panel.

## Token Variable Name Mapping

Lumora recognizes these names as the Discord bot token (in order of preference):
```
DISCORD_BOT_TOKEN  ← canonical name Lumora expects
DISCORD_TOKEN
BOT_TOKEN
TOKEN
DISCORD_CLIENT_TOKEN
```

If configured env vars include `DISCORD_BOT_TOKEN`, the token is set. If the bot reads it under
a different name, Lumora maps it automatically. If NO token variable is configured at all, the user
must add it in the Secrets panel — that requires user action.

## Agent: Detecting Missing Token Configuration

Use `search_files` to find where the token is read:
```
search_files("login(")      # finds client.login() or bot.run()
search_files("DISCORD")     # finds env var references
search_files("TOKEN")
search_files("process.env") # Node.js
search_files("os.environ")  # Python
```

If the bot reads `process.env.TOKEN` and user has `DISCORD_BOT_TOKEN` set → auto-mapped. ✓
If the bot reads `process.env.MY_CUSTOM_TOKEN` → the user must rename their secret or the code must be fixed.

## Friendly Error Message Guidelines

When writing mark_done messages to customers:
- Never mention tokens or secret values
- Never expose internal file paths (no `/tmp/`, no storage paths)
- Never show raw stack traces
- Use plain language: "Your bot needs..." not "ReferenceError at line 42..."
- Always suggest a concrete action the user can take
- Keep it to 2-4 sentences
