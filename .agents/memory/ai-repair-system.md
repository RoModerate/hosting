---
name: AI Deployment Assistant
description: Architecture decisions for the AI-powered bot repair system added to Lumora.
---

## Overview
The AI repair system lives in `artifacts/api-server/src/discord/hosting/aiRepair.ts` and integrates with `runner.ts`.

## Two-Layer Architecture

**Layer 1 — Static pre-launch (no AI, never fails):**
- Runs before the startup probe in `hostUploadedZip`
- Checks for missing start scripts → scans for entry files and patches package.json
- Detects token variable aliases (TOKEN, BOT_TOKEN → DISCORD_BOT_TOKEN)
- Applied via `analyzeAndFixBeforeLaunch()` + `resolveTokenAlias()`

**Layer 2 — AI-powered crash repair (OpenRouter, up to 3 attempts):**
- Triggered in `runRepairLoop()` inside `runner.ts` after a startup probe crash
- Each attempt: calls `repairCrashedBot()` from aiRepair.ts → AI returns structured JSON plan → applies safe fixes
- Safe fixes: add_start_script, install_package (allowlist only), create_requirements
- After each fix: re-reads package.json (it may have changed), re-probes the bot
- If fixed: attaches supervision, sets status=running, returns friendly message
- If all attempts exhausted: falls back to `diagnoseBotCrash()` pattern matching

## Key Design Decisions

**Why `runRepairLoop` lives in runner.ts (not aiRepair.ts):**
- Avoids circular imports: loop needs `runStartupProbe`, `attachSupervision`, `resolveNodeStartCommand`, `tail`, etc. from runner.ts
- aiRepair.ts only exports pure analysis/fix functions

**Why fixes apply to BOTH isolated tmp dir and persistent storage dir:**
- Isolated dir (/tmp/lumora-bots/[id]) is rebuilt from persistent storage/ on restart
- Fixes in tmp-only would be lost on server restart → must also patch persistent dir

**Token aliasing approach:**
- `resolveTokenAlias()` returns a new merged env var map (doesn't touch DB)
- Applied at startup-probe time — the aliased token is only in memory for the bot process
- The customer's original DB env vars are not modified

**Package install allowlist:**
- Only pre-approved npm/pip packages can be auto-installed
- See `SAFE_INSTALLABLE_NODE_PACKAGES` and `SAFE_INSTALLABLE_PYTHON_PACKAGES` sets in aiRepair.ts

**Why:** prevents the AI from being tricked into installing malicious packages

## DB Change
- Added `repair_attempts` integer column to `hosted_bots` table (default 0)
- Tracks how many AI repairs were attempted during the last deployment cycle

## Knowledge Base
- Location: `/ai-knowledge/` at workspace root (readable by operators)
- 4 files: discord-js-errors.md, python-bot-errors.md, npm-errors.md, deployment-rules.md
- Loaded at repair time (not bundled) so operators can update without redeploying
- Server resolves path as `path.resolve(process.cwd(), '../../ai-knowledge')` from api-server cwd
