# NPM / Node.js Dependency Errors & Fixes

## Cannot Find Module
**Error:** `Error: Cannot find module 'discord.js'`
**Cause:** Package not installed, missing from package.json dependencies, or install failed
**Fix:** Add to `dependencies` in package.json:
```json
"dependencies": {
  "discord.js": "^14.0.0"
}
```

## Missing node_modules
**Symptom:** Many "Cannot find module" errors for standard packages
**Fix:** Lumora auto-runs `npm install` during deployment. If install failed, check package.json is valid.

## Invalid package.json
**Error:** `npm error Could not parse JSON` or `npm error Invalid JSON`
**Fix:** Validate your package.json at https://jsonlint.com/ — common issues:
- Trailing commas
- Missing quotes around keys
- Missing closing braces

## No Start Script Found
**Error:** Bot won't start because no entry point found
**Fix:** Add a `start` script to package.json:
```json
"scripts": {
  "start": "node index.js"
}
```
Or ensure one of these files exists: `index.js`, `bot.js`, `main.js`, `src/index.js`

## TypeScript Bots — dist/ Not Found
**Error:** `Cannot find module './dist/index.js'`
**Cause:** TypeScript source uploaded without building first, or no `build` script
**Fix:** Add a build script:
```json
"scripts": {
  "build": "tsc",
  "start": "node dist/index.js"
}
```
Include `tsconfig.json` in your ZIP. Lumora runs `npm run build` automatically if a `build` script exists.

## Peer Dependency Warnings
These are warnings, not errors — they don't prevent the bot from running.

## workspace: / catalog: Protocol Errors
**Error:** `npm error No matching version found for workspace:*`
**Cause:** Bot was zipped from a pnpm monorepo — workspace: protocol only works inside the monorepo
**Fix:** Lumora auto-rewrites these to `*`. If install still fails, replace workspace: deps with real version numbers.

## EACCES / Permission Errors
**Error:** `npm ERR! code EACCES`
**Cause:** File permission issues in the uploaded ZIP
**Fix:** Re-zip the bot without setting unusual file permissions.

## Engine Version Mismatch
**Error:** `npm warn EBADENGINE Unsupported engine`
**Cause:** package.json specifies a Node.js version Lumora doesn't have
**Fix:** Remove or update the `engines` field in package.json to be less restrictive:
```json
"engines": {
  "node": ">=18"
}
```

## Safe Packages Lumora Can Auto-Install
When the AI detects a missing package, it can safely auto-install:
- discord.js, @discordjs/rest, @discordjs/core, @discordjs/ws
- dotenv, axios, node-fetch, undici
- mongoose, pg, mysql2, ioredis
- express, fastify
- winston, pino, lodash, zod, joi
