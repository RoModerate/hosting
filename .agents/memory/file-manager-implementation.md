---
name: File Manager Implementation
description: Architecture decisions for the per-bot file manager and hosting engine bot-root detection
---

# File Manager Implementation

## Backend

- New module: `artifacts/api-server/src/discord/hosting/fileManager.ts`
  - All operations scoped to `ticketBotDir(ticketId)` — the per-ticket sandbox root.
  - `resolveBotPath()` enforces path-traversal protection: path.resolve + containment check + symlink-canonicalization via fs.realpathSync on the deepest existing ancestor.
  - Rejects null bytes, absolute path overrides, symlinks escaping sandbox.
  - `readFileContent`: binary sniff via NUL-byte detection in first 8KB; truncates at 4MB.
  - `writeFileContent`: text saves; creates parent dirs with `fsp.mkdir({recursive: true})`.
  - `writeUploadedFile`: binary-safe upload, 50MB limit, also creates parents.
  - `deletePath`: uses `fsp.rm({recursive: true})` for dirs, `fsp.unlink` for files; blocks deleting root.

- New routes: `artifacts/api-server/src/routes/files.ts`
  - GET `/api/bots/files/list?path=` — lazy directory listing
  - GET `/api/bots/files/read?path=` — read file content
  - PUT `/api/bots/files/write` `{path, content}` — save text file
  - POST `/api/bots/files/mkdir` `{path}` — create folder
  - POST `/api/bots/files/upload` multipart `file + path` — binary-safe upload
  - DELETE `/api/bots/files?path=` — delete file or folder
  - All routes auth via `resolveSession(req)`.

**Why no OpenAPI spec update:** env vars routes (`/api/bots/env`) were added the same way. File manager follows the same pattern.

## Frontend

- New component: `artifacts/web/src/components/FileManager.tsx`
  - Left sidebar: lazy tree (expand-on-click, `refreshToken` number dep — avoids infinite re-renders).
  - CodeMirror 6 via `@uiw/react-codemirror`, one-dark theme, language detection by extension.
  - Binary files show a "binary" state with no editor.
  - Toolbar: NEW FILE, NEW FOLDER, UPLOAD, REFRESH, DELETE, SAVE*, RESTART BOT.
  - Ctrl+S keyboard shortcut. After save: toast with "Restart now" action.
  - Raw `fetch` with `credentials: 'include'` (not in OpenAPI spec).

- Dashboard restructured with OVERVIEW / FILES tabs using existing `@radix-ui/react-tabs`.

## Bot-Root Detection (`findProjectRoot` in runner.ts)

### Problem solved
Uploaded ZIPs can be workspace/monorepo roots (pnpm-workspace.yaml + workspaces field) or full project directories with multiple packages. The engine must find the actual Discord bot package, not the workspace root.

### Detection flow
1. Walk the extracted ZIP up to depth 6, up to 50 candidates.
2. Score each `package.json` and Python project dir.
3. Classify results into one of four outcomes:
   - `found` — one clear winner
   - `ambiguous` — 2+ candidates with scores within 4 points of each other
   - `workspace_only` — only monorepo roots found, no usable bot inside
   - `not_found` — no recognised project structure

### Scoring (Node.js)
- Base: `10 - depth * 2` (prefer shallower)
- `discord.js` in deps (or `eris`, `oceanic.js`, `@discordjs/*`): **+20**
- `"start"` script: +8
- `"workspaces"` field: **-20**
- `pnpm-workspace.yaml` present: **-15**
- Recognisable entry file (index.js, bot.js, etc.): +4

### Scoring (Python)
- Base: `10 - depth * 2`
- `requirements.txt` present: +8
- Known Discord library in requirements.txt (discord.py, nextcord, etc.): **+20**
- Recognisable entry file (bot.py, main.py, etc.): +6

### Validation after detection
After picking the winner:
- **`workspace_only`**: reject with clear message asking for individual bot folder.
- **`ambiguous`**: reject with message listing all candidate paths so user can re-upload the specific one.
- **No Discord library** (`hasDiscord: false`): reject — not a valid Discord bot.
- **Build before start**: if `scripts.build` exists, run it before resolving the start command.
- **Entry file validation**: `resolveNodeStartCommand` checks each script's referenced file exists on disk; skips candidates pointing to nonexistent dist/ outputs.

### Live log messages emitted during upload
```
[Lumora] Scanning ZIP for bot project root…
[Lumora] Bot root: <rel-path> (discord.js detected)
[Lumora] Language: Node.js
[Lumora] Package manager: npm
[Lumora] Running npm install…
[Lumora] Running npm run build…
[Lumora] Starting bot: npm run start
```

**Why:** Makes deployment failures debuggable in the dashboard log stream without needing server-side log access.
