/**
 * AI Deployment Assistant for Lumora.
 *
 * Provides two layers of bot repair:
 *
 *  1. Static pre-launch analysis — rule-based checks and safe auto-fixes applied
 *     before the first startup probe (no AI required, never fails).
 *
 *  2. AI-powered crash repair — after a crash, sends structured context (logs,
 *     file tree, package.json) to OpenRouter and applies the safe fixes it
 *     recommends, up to MAX_REPAIR_ATTEMPTS times.
 *
 * Security: tokens and secrets are never sent to the AI or written to logs.
 */

import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { execSync } from "node:child_process";
import { logger } from "../../lib/logger";
import type { BotLanguage } from "./runner";
import { appendLiveLog } from "./processManager";

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_REPAIR_ATTEMPTS = 3;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env["OPENROUTER_MODEL"] || "openai/gpt-4o-mini";

/**
 * Knowledge base lives at the workspace root so it is easy for operators to
 * edit. Resolved relative to the api-server cwd (artifacts/api-server/).
 */
const KNOWLEDGE_DIR = path.resolve(process.cwd(), "../../ai-knowledge");

/** Canonical token variable name Lumora expects hosted bots to use. */
export const CANONICAL_TOKEN_VAR = "DISCORD_BOT_TOKEN";

/** Alternative token variable names customers commonly use. */
export const TOKEN_VAR_ALIASES = [
  "DISCORD_TOKEN",
  "BOT_TOKEN",
  "TOKEN",
  "DISCORD_CLIENT_TOKEN",
];

/**
 * Packages Lumora is allowed to auto-install for customers.
 * Only well-known, safe packages are included.
 */
const SAFE_INSTALLABLE_NODE_PACKAGES = new Set([
  "discord.js",
  "@discordjs/rest",
  "@discordjs/core",
  "@discordjs/ws",
  "@discordjs/builders",
  "@discordjs/voice",
  "eris",
  "oceanic.js",
  "dotenv",
  "axios",
  "node-fetch",
  "undici",
  "mongoose",
  "pg",
  "mysql2",
  "sqlite3",
  "better-sqlite3",
  "ioredis",
  "redis",
  "express",
  "fastify",
  "winston",
  "pino",
  "morgan",
  "lodash",
  "ramda",
  "date-fns",
  "dayjs",
  "moment",
  "zod",
  "joi",
  "yup",
  "uuid",
  "nanoid",
]);

const SAFE_INSTALLABLE_PYTHON_PACKAGES = new Set([
  "discord.py",
  "py-cord",
  "nextcord",
  "disnake",
  "hikari",
  "python-dotenv",
  "aiohttp",
  "requests",
  "pymongo",
  "motor",
  "sqlalchemy",
  "peewee",
  "redis",
  "Pillow",
  "python-dateutil",
]);

// ─── Directory tree builder ───────────────────────────────────────────────────

const SKIP_TREE_DIRS = new Set([
  "node_modules", ".git", "__pycache__", ".venv", "venv",
  "dist", "build", ".next", "coverage", "out", ".output",
  ".turbo", ".svelte-kit",
]);

/**
 * Builds a text representation of a directory tree (for AI context).
 * Skips build artifacts and dependencies so the AI sees only source.
 */
export async function buildFileTree(
  dir: string,
  maxDepth = 4,
  _indent = "",
  _depth = 0,
): Promise<string> {
  async function walk(d: string, indent: string, depth: number): Promise<string> {
    if (depth > maxDepth) return "";
    let out = "";
    let entries: fs.Dirent[];
    try {
      entries = await fsp.readdir(d, { withFileTypes: true });
    } catch {
      return "";
    }
    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    let count = 0;
    for (const entry of entries) {
      if (count++ > 60) { out += `${indent}… (truncated)\n`; break; }
      if (SKIP_TREE_DIRS.has(entry.name)) {
        if (entry.isDirectory()) out += `${indent}${entry.name}/  [skipped]\n`;
        continue;
      }
      if (entry.isDirectory()) {
        out += `${indent}${entry.name}/\n`;
        out += await walk(path.join(d, entry.name), indent + "  ", depth + 1);
      } else {
        out += `${indent}${entry.name}\n`;
      }
    }
    return out;
  }
  return walk(dir, _indent, _depth);
}

// ─── Knowledge base loader ────────────────────────────────────────────────────

export async function loadKnowledge(): Promise<string> {
  const files = [
    "deployment-rules.md",
    "common-fixes.md",
    "discord-js-errors.md",
    "python-bot-errors.md",
    "npm-errors.md",
  ];
  const parts: string[] = [];
  for (const f of files) {
    try {
      const content = await fsp.readFile(path.join(KNOWLEDGE_DIR, f), "utf-8");
      // Trim each file so the total prompt stays manageable
      parts.push(`### ${f}\n${content.slice(0, 2500)}`);
    } catch {
      // knowledge file missing — skip gracefully
    }
  }
  return parts.length > 0
    ? `## Lumora Knowledge Base\n\n${parts.join("\n\n")}`
    : "";
}

// ─── Pre-launch static analysis ───────────────────────────────────────────────

export interface PreLaunchFix {
  description: string;
}

export interface PreLaunchResult {
  fixes: PreLaunchFix[];
  /** True when package.json was rewritten, so the caller should re-resolve the start command. */
  packageJsonModified: boolean;
}

const NODE_ENTRY_CANDIDATES = [
  "index.js", "index.mjs", "bot.js", "main.js", "app.js", "server.js",
  "src/index.js", "src/index.mjs", "src/bot.js", "src/main.js", "src/app.js",
];

async function patchPackageJsonStartScript(pkgDir: string, entryFile: string): Promise<boolean> {
  const pkgPath = path.join(pkgDir, "package.json");
  try {
    const raw = await fsp.readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    const scripts = ((pkg["scripts"] ?? {}) as Record<string, string>);
    scripts["start"] = `node ${entryFile}`;
    pkg["scripts"] = scripts;
    await fsp.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Rule-based pre-launch analysis. Runs BEFORE the startup probe.
 * Applies safe fixes without AI — never fails or throws.
 *
 * Currently checks:
 *  - Missing start script in package.json (auto-fixes if an entry file is found)
 *  - Token variable aliasing (detects alt names, caller maps them via resolveTokenAlias)
 */
export async function analyzeAndFixBeforeLaunch(params: {
  projectRoot: string;
  persistentDir: string;
  language: BotLanguage;
  pkg: Record<string, unknown> | null;
  userVars: Record<string, string>;
  ticketId: number;
}): Promise<PreLaunchResult> {
  const { projectRoot, persistentDir, language, pkg, userVars } = params;
  const fixes: PreLaunchFix[] = [];
  let packageJsonModified = false;

  try {
    if (language === "node" && pkg) {
      const scripts = ((pkg["scripts"] ?? {}) as Record<string, string>);
      const hasRunScript = ["start", "dev", "run", "serve", "bot", "main"].some(
        (s) => typeof scripts[s] === "string",
      );

      if (!hasRunScript) {
        const foundEntry = NODE_ENTRY_CANDIDATES.find((f) =>
          fs.existsSync(path.join(projectRoot, f)),
        );
        if (foundEntry) {
          const ok1 = await patchPackageJsonStartScript(projectRoot, foundEntry);
          const ok2 = await patchPackageJsonStartScript(persistentDir, foundEntry);
          if (ok1 || ok2) {
            fixes.push({
              description: `No start script found — added "scripts.start": "node ${foundEntry}" to package.json`,
            });
            packageJsonModified = true;
          }
        }
      }
    }

    // Detect token alias (logging only — actual aliasing done by resolveTokenAlias)
    const hasCanonical = !!userVars[CANONICAL_TOKEN_VAR]?.trim();
    if (!hasCanonical) {
      for (const alias of TOKEN_VAR_ALIASES) {
        if (userVars[alias]?.trim()) {
          fixes.push({
            description: `Discord token found in "${alias}" — mapping to "${CANONICAL_TOKEN_VAR}" automatically`,
          });
          break;
        }
      }
    }
  } catch (err) {
    logger.warn({ err }, "Pre-launch analysis failed (non-fatal)");
  }

  return { fixes, packageJsonModified };
}

/**
 * Returns a copy of userVars where ALL known token variable names are set to
 * the same value — so a bot works regardless of which env var name it reads
 * (DISCORD_BOT_TOKEN, DISCORD_TOKEN, BOT_TOKEN, TOKEN, etc.).
 * The original userVars are never mutated.
 */
export function resolveTokenAlias(userVars: Record<string, string>): Record<string, string> {
  // Find the token value from canonical name first, then any alias
  const tokenValue =
    userVars[CANONICAL_TOKEN_VAR]?.trim() ||
    TOKEN_VAR_ALIASES.reduce<string>((v, alias) => v || userVars[alias]?.trim() || "", "");

  if (!tokenValue) return userVars;

  // Inject ALL known names so the bot reads the token no matter which var it uses
  const aliasEntries = TOKEN_VAR_ALIASES.map((alias) => [alias, tokenValue] as [string, string]);
  return {
    ...userVars,
    [CANONICAL_TOKEN_VAR]: tokenValue,
    ...Object.fromEntries(aliasEntries),
  };
}

// ─── AI-powered crash repair ──────────────────────────────────────────────────

interface AIFix {
  type: "add_start_script" | "install_package" | "create_requirements" | "write_file" | "noop";
  entry_file?: string;    // for add_start_script
  package_name?: string;  // for install_package (single package name)
  file_path?: string;     // for write_file (relative path within project)
  file_content?: string;  // for write_file (complete new content, max 8 KB)
  description: string;
}

interface AIRepairPlan {
  explanation: string;
  friendly_message: string;
  fixes: AIFix[];
  requires_user_action: boolean;
  user_action_message?: string;
}

async function callRepairAI(params: {
  crashOutput: string;
  fileTree: string;
  packageJson: string | null;
  language: BotLanguage;
  fileName: string;
  attemptNumber: number;
  knowledge: string;
}): Promise<AIRepairPlan | null> {
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) {
    logger.warn("OPENROUTER_API_KEY not set — skipping AI repair");
    return null;
  }

  const { crashOutput, fileTree, packageJson, language, fileName, attemptNumber, knowledge } = params;

  const fixTypes = [
    '"add_start_script" — add/update scripts.start in package.json, set entry_file to the runnable file',
    '"install_package" — install a single missing npm/pip package, set package_name',
    '"create_requirements" — create a requirements.txt for Python bots',
    '"write_file" — create or overwrite a small source file; set file_path (relative) and file_content (complete new file, max 4 KB). Use to fix env var reading, add missing client.login(), or patch broken entry files',
    '"noop" — no automatic fix possible for this error',
  ];

  const prompt = [
    `You are an expert Discord bot deployment assistant for Lumora hosting. A customer's ${language === "node" ? "Node.js" : "Python"} Discord bot ("${fileName}") crashed during deployment (this is repair attempt ${attemptNumber} of ${MAX_REPAIR_ATTEMPTS}).`,
    "",
    knowledge,
    "",
    "## File Tree",
    "```",
    fileTree.slice(0, 1500),
    "```",
    packageJson
      ? `## package.json\n\`\`\`json\n${packageJson.slice(0, 1500)}\n\`\`\``
      : "",
    "## Crash Output (last output before crash)",
    "```",
    crashOutput.slice(-2500),
    "```",
    "",
    "Based on the crash output and file tree, diagnose the issue and suggest safe automatic fixes.",
    "",
    "Available fix types:",
    ...fixTypes.map((t) => `- ${t}`),
    "",
    'Return ONLY a raw JSON object (no markdown, no code fences) with this exact shape:',
    '{',
    '  "explanation": "Technical root cause in 1-2 sentences",',
    '  "friendly_message": "Customer-friendly explanation — what went wrong and what Lumora did/will do (1-3 sentences, no jargon, never mention tokens/secrets/file paths)",',
    '  "fixes": [ { "type": "...", "entry_file": "...", "package_name": "...", "description": "..." } ],',
    '  "requires_user_action": false,',
    '  "user_action_message": "What the user must do manually, if anything (omit if not needed)"',
    '}',
    "",
    "Rules:",
    "- Only suggest install_package for well-known, safe packages (discord.js, dotenv, axios, pg, mongoose, etc.)",
    "- Only suggest add_start_script if you can see a runnable .js or .py file in the file tree",
    "- For write_file: only write .js/.mjs/.py/.json/.txt files; max 4 KB content; use it to fix env var reading (e.g. add process.env.DISCORD_BOT_TOKEN fallback aliases), add missing client.login(), or create a minimal working entry file",
    "- Never mention tokens, secrets, or environment variable values in friendly_message",
    "- If the crash requires user action (wrong token, intents not enabled, logic errors), set requires_user_action=true",
    "- Limit fixes array to at most 2 items",
    "- If nothing can be auto-fixed, use type noop",
  ]
    .filter((l) => l !== null && l !== undefined)
    .join("\n");

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      logger.error({ status: response.status }, "OpenRouter AI repair request failed");
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // Parse JSON — strip markdown fences if model added them despite instructions
    let jsonText = content;
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonText = fenceMatch[1]!.trim();
    const objMatch = jsonText.match(/\{[\s\S]*\}/);
    if (objMatch) jsonText = objMatch[0];

    try {
      return JSON.parse(jsonText) as AIRepairPlan;
    } catch (parseErr) {
      logger.warn({ parseErr, content }, "Could not parse AI repair JSON response");
      return null;
    }
  } catch (err) {
    logger.error({ err }, "Failed to call OpenRouter for AI repair");
    return null;
  }
}

// ─── Applying safe fixes ──────────────────────────────────────────────────────

async function applyAIFix(
  fix: AIFix,
  projectRoot: string,
  persistentDir: string,
  language: BotLanguage,
  ticketId: number,
): Promise<string | null> {
  try {
    if (fix.type === "noop") return null;

    if (fix.type === "add_start_script" && fix.entry_file) {
      const entry = fix.entry_file.replace(/^\/+/, "");
      if (!fs.existsSync(path.join(projectRoot, entry))) return null;
      const ok1 = await patchPackageJsonStartScript(projectRoot, entry);
      const ok2 = await patchPackageJsonStartScript(persistentDir, entry);
      if (ok1 || ok2) {
        return fix.description || `Added start script pointing to ${entry}`;
      }
    }

    if (fix.type === "install_package" && fix.package_name) {
      // Strip any version specifier or flags — take just the bare package name
      const pkg = fix.package_name.trim().split(/[\s@>=<!\^~]/)[0]!;
      if (!pkg) return null;

      if (language === "node") {
        if (!SAFE_INSTALLABLE_NODE_PACKAGES.has(pkg) && !pkg.startsWith("@discordjs/")) {
          logger.info({ pkg }, "Skipping unsafe/unknown npm package in AI repair fix");
          return null;
        }
        appendLiveLog(ticketId, `[Lumora] Installing missing package: ${pkg}…\n`);
        try {
          execSync(`npm install --no-audit --no-fund ${pkg}`, {
            cwd: projectRoot,
            timeout: 90_000,
            stdio: "pipe",
          });
          return fix.description || `Installed missing package: ${pkg}`;
        } catch (err) {
          logger.warn({ err, pkg }, "npm install fix failed");
          return null;
        }
      }

      if (language === "python") {
        if (!SAFE_INSTALLABLE_PYTHON_PACKAGES.has(pkg)) {
          logger.info({ pkg }, "Skipping unsafe/unknown pip package in AI repair fix");
          return null;
        }
        appendLiveLog(ticketId, `[Lumora] Installing missing package: ${pkg}…\n`);
        try {
          execSync(`python3 -m pip install --no-input --disable-pip-version-check ${pkg}`, {
            cwd: projectRoot,
            timeout: 90_000,
            stdio: "pipe",
          });
          return fix.description || `Installed missing package: ${pkg}`;
        } catch (err) {
          logger.warn({ err, pkg }, "pip install fix failed");
          return null;
        }
      }
    }

    if (fix.type === "write_file" && fix.file_path && typeof fix.file_content === "string") {
      // Validate: relative path only, safe extension, max 8 KB
      const relPath = fix.file_path.replace(/^\/+/, "").replace(/\.\./g, "");
      const ALLOWED_WRITE_EXTS = new Set([".js", ".mjs", ".cjs", ".py", ".json", ".txt", ".env"]);
      const ext = path.extname(relPath).toLowerCase();
      if (!relPath || !ALLOWED_WRITE_EXTS.has(ext)) {
        logger.info({ relPath, ext }, "Skipping write_file: disallowed path or extension");
        return null;
      }
      if (fix.file_content.length > 8192) {
        logger.info({ relPath }, "Skipping write_file: content exceeds 8 KB limit");
        return null;
      }
      try {
        const destPath = path.join(projectRoot, relPath);
        const destPersist = path.join(persistentDir, relPath);
        // Create parent dirs if needed
        await fsp.mkdir(path.dirname(destPath), { recursive: true });
        await fsp.writeFile(destPath, fix.file_content, "utf-8");
        await fsp.mkdir(path.dirname(destPersist), { recursive: true }).catch(() => {});
        await fsp.writeFile(destPersist, fix.file_content, "utf-8").catch(() => {});
        appendLiveLog(ticketId, `[Lumora] Patched file: ${relPath}\n`);
        return fix.description || `Patched ${relPath}`;
      } catch (err) {
        logger.warn({ err, relPath }, "write_file fix failed");
        return null;
      }
    }

    if (fix.type === "create_requirements" && language === "python") {
      const reqPath = path.join(projectRoot, "requirements.txt");
      const reqPersist = path.join(persistentDir, "requirements.txt");
      if (!fs.existsSync(reqPath)) {
        await fsp.writeFile(reqPath, "discord.py\n", "utf-8");
        await fsp.writeFile(reqPersist, "discord.py\n", "utf-8").catch(() => {});
        return "Created requirements.txt with discord.py";
      }
    }
  } catch (err) {
    logger.warn({ err, fix }, "AI repair fix application failed (non-fatal)");
  }
  return null;
}

// ─── Public repair API ────────────────────────────────────────────────────────

export interface RepairResult {
  appliedFixes: string[];
  friendlyMessage: string;
  requiresUserAction: boolean;
  userActionMessage?: string;
}

/**
 * Given the context of a crashed bot, asks the AI to diagnose the issue and
 * applies safe automated fixes to both the isolated run directory and the
 * persistent storage directory.
 *
 * Never throws — always returns a RepairResult. Returns empty appliedFixes when
 * no safe fix is available (e.g. wrong token, intent issues).
 */
export async function repairCrashedBot(params: {
  projectRoot: string;
  persistentDir: string;
  language: BotLanguage;
  pkg: Record<string, unknown> | null;
  crashOutput: string;
  userVars: Record<string, string>;
  attemptNumber: number;
  fileName: string;
  ticketId: number;
}): Promise<RepairResult> {
  const {
    projectRoot, persistentDir, language, pkg, crashOutput,
    userVars: _userVars, attemptNumber, fileName, ticketId,
  } = params;

  try {
    const [knowledge, fileTree] = await Promise.all([
      loadKnowledge(),
      buildFileTree(projectRoot, 4),
    ]);

    const packageJson = pkg ? JSON.stringify(pkg, null, 2) : null;

    appendLiveLog(ticketId, "[Lumora] Analysing crash with AI…\n");

    const plan = await callRepairAI({
      crashOutput,
      fileTree,
      packageJson,
      language,
      fileName,
      attemptNumber,
      knowledge,
    });

    if (!plan) {
      return {
        appliedFixes: [],
        friendlyMessage:
          "Lumora was unable to automatically diagnose this crash. " +
          "Please review the log output and check your bot's configuration.",
        requiresUserAction: true,
      };
    }

    logger.info({ ticketId, plan: { explanation: plan.explanation, fixCount: plan.fixes?.length } }, "AI repair plan received");

    const appliedFixes: string[] = [];
    for (const fix of plan.fixes ?? []) {
      const result = await applyAIFix(fix, projectRoot, persistentDir, language, ticketId);
      if (result) appliedFixes.push(result);
    }

    return {
      appliedFixes,
      friendlyMessage:
        plan.friendly_message ||
        "Lumora detected an issue and attempted an automatic fix.",
      requiresUserAction: plan.requires_user_action ?? false,
      userActionMessage: plan.user_action_message,
    };
  } catch (err) {
    logger.error({ err, ticketId }, "repairCrashedBot encountered an unexpected error");
    return {
      appliedFixes: [],
      friendlyMessage:
        "An error occurred during the automatic repair process. Please review the logs.",
      requiresUserAction: true,
    };
  }
}
