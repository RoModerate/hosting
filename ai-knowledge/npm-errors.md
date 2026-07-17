# NPM / Node.js Deployment Errors & Agent Fixes

## Cannot Find Module (runtime)
**Error:** `Error: Cannot find module 'X'`
**Agent action:**
1. Check if `X` is in package.json dependencies
2. If not: `install_dependencies("X")`
3. If yes but still failing: the install may have failed — `install_dependencies("X")` again

## No Start Script / Entry File
**Symptom:** Lumora reports no start command found.
**Agent action:**
1. `list_files` on root and `src/`
2. Find the main bot file (usually `index.js`, `bot.js`, `main.js`, or `src/index.js`)
3. Read it to confirm it contains bot startup code (`client.login(`, `bot.start(`, etc.)
4. Use `write_file` to add `"start": "node <filename>"` to `scripts` in package.json
   OR use `set_start_command("node src/index.js")`

## Invalid / Corrupt package.json
**Error:** `npm error Could not parse JSON`
**Agent action:**
1. Read package.json
2. Fix the JSON syntax error (trailing comma, missing bracket, unquoted key, etc.)
3. Write fixed package.json with `write_file`

**Common JSON mistakes:**
- Trailing comma: `"key": "value",}` → `"key": "value"}`
- Single quotes: `'key': 'value'` → `"key": "value"`
- Comments: JSON does not allow `//` comments — remove them

## TypeScript Source Uploaded Without Build
**Error:** `Cannot find module './dist/index.js'` or `SyntaxError: Unexpected token`
**Symptom:** TypeScript `.ts` files uploaded but scripts.start points to `dist/`
**Agent action:**
1. Read `tsconfig.json` to find `outDir`
2. Check if `build` script exists in package.json
3. If build script exists, Lumora already ran it — check if the dist files exist with `list_files("dist")`
4. If no build script, add one:
   ```json
   "scripts": {
     "build": "tsc",
     "start": "node dist/index.js"
   }
   ```
5. Make sure `tsconfig.json` is present. If missing, create a basic one (see deployment-rules.md)
6. Also ensure `typescript` is in devDependencies: `install_dependencies("typescript")`

## workspace:* Dependencies
**Error:** `npm error No matching version found for workspace:*`
**Agent action:**
1. Read package.json
2. Find all values starting with `workspace:` or `catalog:`
3. Replace them all with `"*"` (or look up what the package actually is and use a real version)
4. Write fixed package.json
5. Call `install_dependencies` for each replaced package if needed

## pnpm-lock.yaml / yarn.lock Conflicts
**Symptom:** pnpm/yarn refuses to install due to lockfile mismatch.
**Agent action:** The install step uses `--no-frozen-lockfile` so this should not occur. If it does, the issue is elsewhere.

## Engine Version Mismatch
**Error:** `npm warn EBADENGINE Unsupported engine`
**Agent action:** Read package.json, find `"engines"` field, change it to `">=18"` or remove it.

## EACCES Permission Errors
**Error:** `npm ERR! code EACCES`
This is a Lumora environment issue, not a code issue. `mark_done` with `requires_user_action: true` — advise re-uploading.

## Missing dotenv / Environment Variables at Runtime
**Error:** `undefined` or `Cannot read properties of undefined (reading 'login')` because token is undefined
**Cause:** Bot uses `dotenv` but `.env` file wasn't included in the ZIP (correct — secrets go in the panel)
**Agent action:**
1. Check if `require('dotenv').config()` or `import 'dotenv/config'` is at the top of the entry file
2. Ensure the bot reads from `process.env.DISCORD_BOT_TOKEN` (Lumora injects this)
3. Lumora does NOT use .env files — all secrets come from the environment. The user must add their token in the Secrets panel.
4. If dotenv.config() will fail because .env is missing, this is fine — it's a no-op when the file doesn't exist

## SyntaxError at Runtime (JavaScript)
**Error:** `SyntaxError: Unexpected token ...` in a .js file
**Agent action:** `read_file` on the file referenced in the error, find and fix the syntax error, `write_file`

## Cannot Use Import Statement in a Module (CommonJS/ESM mismatch)
**Error:** `SyntaxError: Cannot use import statement in a module` or `...outside a module`
**Agent action:**
- If file uses `import`/`export` but there's no `"type": "module"` in package.json:
  - Option A: Add `"type": "module"` to package.json (if all files use ESM)
  - Option B: Rename `.js` files to `.mjs`
  - Option C: Convert `import` to `require()` if the project is primarily CJS

## Circular Dependency Warning
These are warnings, not errors. The bot will still run.

## Out of Memory
**Error:** `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory`
Mark done with requires_user_action — the bot uses too much memory. Advise optimizing code or reducing memory usage.

## Safe Packages the Agent Can Install
Any legitimate npm package with a valid name (e.g. `@scope/package` or `package-name`).
Most commonly needed:
- `discord.js`, `@discordjs/rest`, `@discordjs/voice`, `@discordjs/builders`
- `eris`, `oceanic.js`
- `dotenv`, `axios`, `node-fetch`, `undici`
- `mongoose`, `pg`, `mysql2`, `better-sqlite3`, `ioredis`
- `express`, `fastify`
- `winston`, `pino`, `lodash`, `zod`, `joi`, `uuid`
- `typescript`, `ts-node`, `@types/node`
