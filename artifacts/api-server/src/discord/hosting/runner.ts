import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import extract from "extract-zip";
import { eq, inArray } from "drizzle-orm";
import { db, hostedBotsTable, ticketsTable } from "@workspace/db";
import { logger } from "../../lib/logger";
import { ticketBotDir, ticketUploadDir } from "./paths";
import {
  appendLiveLog,
  armStabilityReset,
  cancelPendingRestart,
  schedulePendingRestart,
  clearRunningProcess,
  clearLiveLog,
  consumeIntentionalStop,
  getAutoRestartAttempts,
  getLiveLog,
  isRunning,
  resetAutoRestartAttempts,
  setRunningProcess,
  stopProcess,
  tryConsumeAutoRestartAttempt,
} from "./processManager";
import { explainHostingFailure } from "./aiExplain";
import {
  analyzeAndFixBeforeLaunch,
  repairCrashedBot,
  resolveTokenAlias,
  MAX_REPAIR_ATTEMPTS,
} from "./aiRepair";
import { runAutonomousAgent } from "./aiAgent";

export const MAX_ZIP_BYTES = 100 * 1024 * 1024; // 100MB
const INSTALL_TIMEOUT_MS = 10 * 60 * 1000; // 10 min — large monorepos can be slow
const STARTUP_PROBE_MS = 8 * 1000;
const OUTPUT_TAIL_CHARS = 3500;
const AUTO_RESTART_BASE_DELAY_MS = 3000;

/**
 * Isolated run directory for each hosted bot.
 * Lives in /tmp (outside the Lumora pnpm workspace tree) so package managers
 * can never walk up and find pnpm-workspace.yaml or catalog definitions
 * belonging to the host platform.
 */
const ISOLATED_BOTS_DIR = "/tmp/lumora-bots";

function isolatedBotDir(ticketId: number): string {
  return path.join(ISOLATED_BOTS_DIR, String(ticketId));
}

export type HostStatus =
  | "running"      // legacy — displayed as ONLINE
  | "online"       // discord client.ready confirmed
  | "connecting"   // process alive, awaiting Discord gateway
  | "login_failed" // process alive but Discord login failed
  | "crashed"
  | "error"
  | "stopped";
export type BotLanguage = "node" | "python";

export interface HostResult {
  status: HostStatus;
  message: string;
  detail?: string;
  startCommand?: string;
  aiExplanation?: string;
}

function tail(text: string, max: number): string {
  return text.length > max ? text.slice(text.length - max) : text;
}

/** Host-only secrets that a hosted bot must never see, even by accident. */
const HOST_SECRET_KEYS = [
  "DISCORD_BOT_TOKEN",
  "DISCORD_GUILD_ID",
  "DISCORD_STAFF_ROLE_ID",
  "SESSION_SECRET",
  "ADMIN_PASSWORD",
  "OPENROUTER_API_KEY",
  "DATABASE_URL",
  "PGHOST",
  "PGPORT",
  "PGUSER",
  "PGPASSWORD",
  "PGDATABASE",
];

function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<{ exitedCleanly: boolean; exitCode: number | null; output: string }> {
  return new Promise((resolve) => {
    let output = "";
    let settled = false;
    const child = spawn(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      output = tail(output + "\n[Timed out]", OUTPUT_TAIL_CHARS);
      resolve({ exitedCleanly: false, exitCode: null, output });
    }, timeoutMs);

    child.stdout?.on("data", (d: Buffer) => {
      output = tail(output + d.toString(), OUTPUT_TAIL_CHARS);
    });
    child.stderr?.on("data", (d: Buffer) => {
      output = tail(output + d.toString(), OUTPUT_TAIL_CHARS);
    });

    child.once("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ exitedCleanly: code === 0, exitCode: code, output });
    });

    child.once("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      output = tail(output + `\n${err.message}`, OUTPUT_TAIL_CHARS);
      resolve({ exitedCleanly: false, exitCode: null, output });
    });
  });
}

// ─── Discord gateway signal detection ────────────────────────────────────────
// Scanned line-by-line in runStartupProbe output to determine whether
// client.ready fired, login failed, or we're still waiting.

/** Patterns that indicate the Discord client.ready event fired successfully. */
const DISCORD_ONLINE_PATTERNS: RegExp[] = [
  /logged in as .+/i,           // discord.js default: "Logged in as Bot#1234"
  /ready\s*[!.]?\s*$/im,        // "Ready!", "Ready." at end of line
  /bot (is )?online/i,          // common user code: "Bot is online"
  /(client|bot) (is )?ready/i,  // "Client ready", "Bot ready"
  /successfully logged in/i,
  /connected to discord/i,
  /discord.*client.*ready/i,
  /gateway.*\bconnected\b/i,   // "gateway connected" — avoid matching "connection failed"
];

/** Patterns that indicate Discord login failed (process may still be running). */
const DISCORD_FAIL_PATTERNS: RegExp[] = [
  /an invalid token was provided/i,
  /token[\s_-]*invalid/i,
  /invalid[\s_-]*token/i,
  /disallowed[\s_-]*intents/i,
  /used disallowed intents/i,
  /privileged intent/i,
  /TokenInvalid/,
  /ENOTFOUND discord\.com/i,
];

// ─────────────────────────────────────────────────────────────────────────────

interface StartupProbeResult {
  child: ChildProcess;
  crashed: boolean;
  exitCode: number | null;
  output: string;
  /** Discord gateway signal detected during the probe window, or null if none yet. */
  discordSignal: "online" | "login_failed" | null;
}

/** Unique port for each hosted bot so none of them fight over 8080. */
function botPort(ticketId: number): number {
  return 10000 + (ticketId % 10000);
}

/**
 * Parse the user-supplied env vars JSON stored on the hosted_bots row.
 * Never throws — malformed JSON just means "no custom vars".
 */
function parseEnvVars(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof k === "string" && k.trim()) out[k.trim()] = String(v);
      }
      return out;
    }
  } catch {
    // fall through
  }
  return {};
}

export async function getHostedBotEnvVars(ticketId: number): Promise<Record<string, string>> {
  const [row] = await db
    .select()
    .from(hostedBotsTable)
    .where(eq(hostedBotsTable.ticketId, ticketId));
  return parseEnvVars(row?.envVars);
}

export async function setHostedBotEnvVars(
  ticketId: number,
  vars: Record<string, string>,
): Promise<void> {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    const key = k.trim();
    if (!key) continue;
    clean[key] = String(v);
  }
  await updateHostedBot(ticketId, { envVars: JSON.stringify(clean) });
}

/**
 * Bot-specific env: strips our own server secrets so a hosted bot can never
 * read the host's Discord token / DB creds / admin password, assigns the
 * bot an isolated port, then layers the customer's own env vars on top so
 * their bot's own DISCORD_BOT_TOKEN (or any other var) wins.
 */
function botEnv(ticketId: number, userVars: Record<string, string>): NodeJS.ProcessEnv {
  const base: NodeJS.ProcessEnv = { ...process.env };
  for (const key of HOST_SECRET_KEYS) delete base[key];

  return {
    ...base,
    PORT: String(botPort(ticketId)),
    ...userVars,
  };
}

/**
 * Walk a directory shallowly (skipping .git and node_modules) and delete
 * Replit-platform files that would otherwise cause the platform to register
 * spurious workflows from the extracted bot ZIP.
 */
async function stripPlatformFiles(rootDir: string, depth = 0): Promise<void> {
  if (depth > 4) return;
  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(rootDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      if (entry.name === ".replit-artifact") {
        // This whole dir contains the artifact.toml – nuke it.
        await fsp.rm(full, { recursive: true, force: true }).catch(() => {});
        continue;
      }
      await stripPlatformFiles(full, depth + 1);
    } else if (
      entry.name === ".replit" ||
      entry.name === "replit.nix" ||
      entry.name === ".replit.nix" ||
      entry.name === "artifact.toml"
    ) {
      await fsp.rm(full, { force: true }).catch(() => {});
    }
  }
}

/**
 * Copies `sourceBotDir` to an isolated /tmp location so that package managers
 * (npm, pnpm, yarn) cannot walk up the directory tree and discover the Lumora
 * host workspace files (pnpm-workspace.yaml, catalog definitions, etc.).
 *
 * Additionally rewrites any `catalog:` or `workspace:` dependency versions in
 * the bot's package.json to `*`, since those version protocols only resolve
 * inside a parent workspace — a standalone bot cannot use them.
 *
 * Returns the path to the isolated copy ready for install/build/start.
 */
async function isolateBot(sourceBotDir: string, ticketId: number): Promise<string> {
  const dest = isolatedBotDir(ticketId);
  await fsp.rm(dest, { recursive: true, force: true });
  await fsp.mkdir(dest, { recursive: true });
  await fsp.cp(sourceBotDir, dest, { recursive: true });

  // Remove workspace-root marker files that confuse package managers.
  for (const f of ["pnpm-workspace.yaml", ".pnpmfile.cjs", "nx.json"]) {
    await fsp.rm(path.join(dest, f), { force: true }).catch(() => {});
  }

  // Rewrite catalog:/workspace: dependency versions to "*" so the bot can be
  // installed as a standalone project without the parent workspace catalog.
  const pkgPath = path.join(dest, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const raw = await fsp.readFile(pkgPath, "utf-8");
      const pkg = JSON.parse(raw) as Record<string, unknown>;
      let dirty = false;

      for (const section of [
        "dependencies", "devDependencies", "peerDependencies", "optionalDependencies",
      ]) {
        const deps = pkg[section] as Record<string, string> | undefined;
        if (!deps) continue;
        for (const [name, ver] of Object.entries(deps)) {
          if (
            typeof ver === "string" &&
            (ver.startsWith("catalog:") || ver.startsWith("workspace:"))
          ) {
            deps[name] = "*";
            dirty = true;
          }
        }
      }

      if (dirty) {
        await fsp.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
      }
    } catch { /* leave as-is if package.json is malformed */ }
  }

  return dest;
}

/**
 * Common environment variable names customers use to store their Discord bot
 * token.  We check all of them so the diagnostic banner is useful even when
 * the customer doesn't use the canonical name.
 */
const DISCORD_TOKEN_VAR_NAMES = [
  "DISCORD_BOT_TOKEN",
  "DISCORD_TOKEN",
  "BOT_TOKEN",
  "TOKEN",
  "DISCORD_CLIENT_TOKEN",
];

/**
 * Writes a pre-launch diagnostic block to the live log.
 *
 * Checks for the presence of Discord token secrets and logs their length (never
 * the value), then logs "Attempting Discord login..." so the customer can see
 * exactly where startup is in progress.  This is written to the live log before
 * the bot process is spawned so it always appears at the top of the log output.
 *
 * SECURITY: the actual token value is never written anywhere.
 */
function appendStartupDiagnosticBanner(
  ticketId: number,
  userVars: Record<string, string>,
): void {
  const lines: string[] = ["\n[Lumora] ─── Startup diagnostics ───────────────────────\n"];

  // Token presence check
  const foundTokenVars: string[] = [];
  for (const name of DISCORD_TOKEN_VAR_NAMES) {
    const val = userVars[name];
    if (val && val.trim()) {
      foundTokenVars.push(name);
      lines.push(`[Lumora] Token check : ${name} ✓  (length: ${val.trim().length})\n`);
    }
  }

  if (foundTokenVars.length === 0) {
    lines.push(
      "[Lumora] Token check : ⚠  No Discord token found in your secrets.\n" +
      "[Lumora]               Add DISCORD_BOT_TOKEN in the Secrets & Env Vars panel,\n" +
      "[Lumora]               save, then restart the bot.\n",
    );
  }

  lines.push("[Lumora] Attempting Discord login…\n");
  lines.push("[Lumora] ────────────────────────────────────────────────\n\n");
  appendLiveLog(ticketId, lines.join(""));
}

/**
 * Scans a crashed bot's stdout/stderr output for known Discord error signatures
 * and returns a pinpoint, actionable error message.
 *
 * Returns null when the output doesn't match any known pattern, letting the
 * caller fall back to its generic crash message.
 *
 * SECURITY: output is scanned as-is but the returned message never echoes back
 * any secret values — the patterns only match non-secret error strings.
 */
function diagnoseBotCrash(
  output: string,
  userVars: Record<string, string>,
): string | null {
  const text = output.toLowerCase();

  // ── Invalid / wrong token ──────────────────────────────────────────────
  if (
    text.includes("tokeninvalid") ||
    text.includes("token_invalid") ||
    text.includes("an invalid token was provided") ||
    text.includes("invalid token") ||
    (text.includes("401") && text.includes("unauthorized"))
  ) {
    const hasToken = DISCORD_TOKEN_VAR_NAMES.some((n) => userVars[n]?.trim());
    return hasToken
      ? "Discord rejected the bot token as invalid.\n\n" +
        "The token exists in your secrets but Discord says it is wrong. " +
        "Double-check the value in the Secrets panel — it must be the Bot Token " +
        "(not the Client ID or Client Secret). Regenerate it in the Discord " +
        "Developer Portal if needed, then save and restart."
      : "Discord rejected the bot token as invalid, and no Discord token was " +
        "found in your secrets.\n\n" +
        "Add your bot token as DISCORD_BOT_TOKEN in the Secrets & Env Vars panel, " +
        "save, then restart. Never put the token directly in your source code.";
  }

  // ── Missing token — bot code called login() with nothing ──────────────
  if (
    text.includes("token_missing") ||
    text.includes("error [token_missing]") ||
    text.includes("token is required") ||
    text.includes("no token provided") ||
    (text.includes("login") && text.includes("token") && text.includes("undefined"))
  ) {
    return "Your bot called client.login() without a token.\n\n" +
      "Make sure your code reads the token from the environment:\n" +
      "  client.login(process.env.DISCORD_BOT_TOKEN)\n\n" +
      "Then add DISCORD_BOT_TOKEN in the Secrets & Env Vars panel, save, and restart.\n" +
      "Tip: add  console.log('Token exists:', !!process.env.DISCORD_BOT_TOKEN)  " +
      "before login() to confirm the secret is being injected.";
  }

  // ── Privileged gateway intents not enabled ─────────────────────────────
  if (
    text.includes("disallowed intents") ||
    text.includes("disallowedintents") ||
    text.includes("privileged intent") ||
    text.includes("used disallowed intent")
  ) {
    return "Your bot requires Privileged Gateway Intents that are not yet enabled.\n\n" +
      "Go to: Discord Developer Portal → Your Application → Bot → " +
      "Privileged Gateway Intents\n" +
      "Enable whichever of these your bot needs:\n" +
      "  • Server Members Intent (for guild member events)\n" +
      "  • Message Content Intent (for reading message content)\n" +
      "  • Presence Intent (for presence updates)\n\n" +
      "Save in the portal, then restart the bot here.";
  }

  // ── Network / DNS — cannot reach Discord's API ────────────────────────
  if (
    text.includes("getaddrinfo enotfound discord.com") ||
    text.includes("getaddrinfo enotfound") ||
    text.includes("econnrefused") ||
    (text.includes("etimedout") && text.includes("discord"))
  ) {
    return "The bot could not reach Discord's API.\n\n" +
      "This is usually a temporary network issue. Wait a moment and restart the bot. " +
      "If it keeps failing, check https://discordstatus.com for any ongoing outages.";
  }

  // ── Missing permissions / Missing Access ──────────────────────────────
  if (text.includes("missing access") || text.includes("missing permissions")) {
    return "The bot is missing Discord permissions.\n\n" +
      "Make sure the bot has been invited to your server with the correct permission " +
      "scopes, and that it has the required channel/guild permissions for the " +
      "actions it tries to perform on startup.";
  }

  // ── Discord gateway HTTP 500 — temporary Discord-side server error ────────
  // discord.js throws DiscordAPIError and logs the status + url fields.
  if (
    (text.includes("status: 500") || text.includes("status 500") || text.includes("httperror")) &&
    (text.includes("discord.com") || text.includes("gateway/bot"))
  ) {
    return "Discord's gateway API returned a temporary server error (HTTP 500).\n\n" +
      "This is Discord's fault, not your bot. The Lumora auto-restart system will " +
      "retry the connection automatically.\n\n" +
      "If retries keep failing, check https://discordstatus.com for any ongoing " +
      "Discord outages. Once Discord recovers, restart your bot from this panel.";
  }

  // ── Discord rate-limited (HTTP 429) ───────────────────────────────────────
  if (
    (text.includes("status: 429") || text.includes("status 429") || text.includes("rate limit")) &&
    (text.includes("discord") || text.includes("gateway"))
  ) {
    return "Discord rate-limited the connection attempt (HTTP 429).\n\n" +
      "This usually happens when the bot is restarted too quickly in succession. " +
      "Lumora will automatically retry with increasing delays. " +
      "If you are restarting manually, wait a few minutes before trying again.";
  }

  // ── No token in secrets (no output match, but we can still diagnose) ──
  const hasAnyToken = DISCORD_TOKEN_VAR_NAMES.some((n) => userVars[n]?.trim());
  if (!hasAnyToken) {
    return "The bot crashed on startup and no Discord token was found in your secrets.\n\n" +
      "Add your bot token as DISCORD_BOT_TOKEN in the Secrets & Env Vars panel, " +
      "save, and restart. Your bot code should read it with:\n" +
      "  client.login(process.env.DISCORD_BOT_TOKEN)";
  }

  return null; // no known pattern matched — let caller use generic message
}

function runStartupProbe(
  cmd: string,
  args: string[],
  cwd: string,
  ticketId: number,
  userVars: Record<string, string>,
): Promise<StartupProbeResult> {
  // Write the diagnostic banner to the live log BEFORE spawning so customers
  // can see it at the very top of the startup output.
  appendStartupDiagnosticBanner(ticketId, userVars);
  appendLiveLog(ticketId, "[Discord] Connecting...\n");

  return new Promise((resolve) => {
    let output = "";
    let settled = false;
    let discordSignal: StartupProbeResult["discordSignal"] = null;

    const child = spawn(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: botEnv(ticketId, userVars),
    });

    /** Scan each output chunk for Discord gateway signals. */
    const checkSignal = (text: string) => {
      if (discordSignal) return; // already found one — don't overwrite
      if (DISCORD_ONLINE_PATTERNS.some((p) => p.test(text))) {
        discordSignal = "online";
        // Try to extract the username discord.js logs ("Logged in as Bot#1234").
        const match = text.match(/logged in as (.+?)(?:\s*[\n\r]|$)/i);
        const who = match?.[1]?.trim();
        appendLiveLog(
          ticketId,
          `[Discord] ✓ Login successful${who ? ` — bot online as ${who}` : ""}.\n`,
        );
        // Persist bot name so the dashboard can display "Online as BotName#0000".
        if (who) {
          db.update(hostedBotsTable)
            .set({ botName: who })
            .where(eq(hostedBotsTable.ticketId, ticketId))
            .catch(() => undefined);
        }
      } else if (DISCORD_FAIL_PATTERNS.some((p) => p.test(text))) {
        discordSignal = "login_failed";
        appendLiveLog(
          ticketId,
          "[Discord] Login failed — check your bot token and gateway intents.\n",
        );
      }
    };

    child.stdout?.on("data", (d: Buffer) => {
      const text = d.toString();
      output = tail(output + text, OUTPUT_TAIL_CHARS);
      appendLiveLog(ticketId, text);
      checkSignal(text);
    });
    child.stderr?.on("data", (d: Buffer) => {
      const text = d.toString();
      output = tail(output + text, OUTPUT_TAIL_CHARS);
      appendLiveLog(ticketId, text);
      checkSignal(text);
    });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ child, crashed: false, exitCode: null, output, discordSignal });
    }, STARTUP_PROBE_MS);

    child.once("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ child, crashed: true, exitCode: code, output, discordSignal });
    });

    child.once("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      output = tail(output + `\n${err.message}`, OUTPUT_TAIL_CHARS);
      resolve({ child, crashed: true, exitCode: null, output, discordSignal });
    });
  });
}

// Directories that are never a bot project root — skip them when searching.
const SKIP_DIRS = new Set([
  ".git", "node_modules", ".agents", ".local", ".cache", ".replit",
  "dist", "build", "__pycache__", ".venv", "venv", ".next", ".nuxt",
  "coverage", ".turbo", ".svelte-kit", "out", ".output",
  // Platform-internal directories: previous bot uploads and raw file assets
  // must never be scanned for project roots.
  "storage", "attached_assets",
]);

// Known Discord bot library names for Node.js.
const DISCORD_NODE_LIBS = new Set([
  "discord.js", "discordjs", "eris", "oceanic.js", "discord-api-types",
  "@discordjs/rest", "@discordjs/core", "@discordjs/ws",
  "discord.js-commando", "discord-akairo",
]);

// Known Discord bot library names for Python.
const DISCORD_PYTHON_LIBS = new Set([
  "discord.py", "discord", "nextcord", "disnake", "py-cord",
  "hikari", "tanjun", "lightbulb",
]);

/** Returns true when any dependency key is a known Discord library. */
function hasBotDependency(
  pkg: Record<string, unknown>,
  libs: Set<string>,
): boolean {
  const deps = {
    ...(pkg["dependencies"] as Record<string, string> | undefined ?? {}),
    ...(pkg["devDependencies"] as Record<string, string> | undefined ?? {}),
    ...(pkg["peerDependencies"] as Record<string, string> | undefined ?? {}),
  };
  // libs covers explicit names; also match any @discordjs/* scoped package.
  return Object.keys(deps).some((k) => libs.has(k) || k.startsWith("@discordjs/"));
}

// Regex patterns that strongly indicate Discord bot source code.
const DISCORD_SOURCE_PATTERNS = [
  /require\s*\(\s*['"]discord\.js['"]\s*\)/,
  /from\s+['"]discord\.js['"]/,
  /from\s+['"]eris['"]/,
  /from\s+['"]oceanic\.js['"]/,
  /from\s+['"]@discordjs\//,
  /client\.login\s*\(/,
  /new\s+Client\s*\(\s*[\{'"]/,   // new Client({ ... }) or new Client("token")
  /import\s+discord\b/,           // Python: import discord
  /from\s+discord(?:\.ext)?\s+import/,  // Python: from discord import ...
];

const SOURCE_SCAN_EXTS = new Set([".js", ".mjs", ".cjs", ".ts", ".mts", ".py"]);
const SOURCE_SCAN_MAX_FILES = 40;
const SOURCE_SCAN_MAX_BYTES = 64 * 1024; // 64 KB per file — enough for any realistic bot file

/**
 * Scans source files under `dir` (skipping node_modules, dist, etc.) for
 * Discord-bot code patterns. Returns true as soon as a match is found.
 * Used as a fallback when no Discord library is found in package.json deps.
 */
async function scanSourceFilesForDiscord(dir: string): Promise<boolean> {
  let fileCount = 0;

  async function scan(d: string, depth: number): Promise<boolean> {
    if (depth > 5 || fileCount >= SOURCE_SCAN_MAX_FILES) return false;
    let entries: fs.Dirent[];
    try { entries = await fsp.readdir(d, { withFileTypes: true }); }
    catch { return false; }

    for (const entry of entries) {
      if (fileCount >= SOURCE_SCAN_MAX_FILES) return false;
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        if (await scan(path.join(d, entry.name), depth + 1)) return true;
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!SOURCE_SCAN_EXTS.has(ext)) continue;
        fileCount++;
        try {
          const fd = await fsp.open(path.join(d, entry.name), "r");
          const buf = Buffer.alloc(SOURCE_SCAN_MAX_BYTES);
          const { bytesRead } = await fd.read(buf, 0, SOURCE_SCAN_MAX_BYTES, 0);
          await fd.close();
          const content = buf.subarray(0, bytesRead).toString("utf-8");
          if (DISCORD_SOURCE_PATTERNS.some((p) => p.test(content))) return true;
        } catch { /* unreadable — skip */ }
      }
    }
    return false;
  }

  return scan(dir, 0);
}

/**
 * Parse workspace package glob patterns from a pnpm-workspace.yaml or from
 * the "workspaces" field of a root package.json.
 *
 * Returns an array like ["artifacts/*", "lib/*"].
 * Returns [] when nothing recognisable is found.
 */
function parseWorkspaceGlobs(rootDir: string): string[] {
  const globs: string[] = [];

  // 1. pnpm-workspace.yaml (pnpm format)
  const yamlPath = path.join(rootDir, "pnpm-workspace.yaml");
  if (fs.existsSync(yamlPath)) {
    try {
      const lines = fs.readFileSync(yamlPath, "utf-8").split("\n");
      let inPackages = false;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === "packages:") { inPackages = true; continue; }
        if (inPackages && trimmed.startsWith("-")) {
          const g = trimmed.replace(/^-\s*/, "").replace(/['"]/g, "").trim();
          if (g) globs.push(g);
        } else if (inPackages && trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("-")) {
          break; // end of packages block
        }
      }
    } catch { /* ignore */ }
  }

  // 2. package.json "workspaces" field (npm / yarn format)
  const pkgPath = path.join(rootDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as Record<string, unknown>;
      const ws = pkg["workspaces"];
      if (Array.isArray(ws)) {
        for (const g of ws) {
          if (typeof g === "string") globs.push(g);
        }
      } else if (ws && typeof ws === "object") {
        const pkgs = (ws as Record<string, unknown>)["packages"];
        if (Array.isArray(pkgs)) {
          for (const g of pkgs) {
            if (typeof g === "string") globs.push(g);
          }
        }
      }
    } catch { /* ignore */ }
  }

  return globs;
}

/**
 * Returns true when `candidateDir` is a workspace member of the workspace
 * rooted at `workspaceRoot` according to the given glob patterns.
 *
 * Handles:
 *   "packages/*"   — immediate children of packages/
 *   "packages/**"  — any descendant of packages/
 *   "apps/my-app"  — exact path match
 *
 * When `globs` is empty, falls back to a conservative "anything that is a
 * descendant of the workspace root is a member" rule.
 */
function isWorkspaceMember(
  candidateDir: string,
  workspaceRoot: string,
  globs: string[],
): boolean {
  const rel = path.relative(workspaceRoot, candidateDir).replace(/\\/g, "/");
  if (!rel || rel.startsWith("..")) return false; // outside the workspace tree

  if (globs.length === 0) {
    // No glob info — conservatively treat all descendants as members.
    return true;
  }

  for (const raw of globs) {
    const pattern = raw.replace(/['"]/g, "").trim();
    const parts = pattern.split("/");

    if (parts.length === 2 && parts[1] === "*") {
      // "dir/*" → matches any immediate child of dir/
      const prefix = parts[0] + "/";
      if (rel.startsWith(prefix) && !rel.slice(prefix.length).includes("/")) {
        return true;
      }
    } else if (parts[parts.length - 1] === "**") {
      // "dir/**" → matches any descendant of dir/
      const prefix = parts.slice(0, -1).join("/");
      if (!prefix || rel === prefix || rel.startsWith(prefix + "/")) return true;
    } else if (parts[parts.length - 1] === "*") {
      // Treat trailing "*" the same as "/*"
      const prefix = parts.slice(0, -1).join("/");
      const afterPrefix = prefix ? rel.slice(prefix.length + 1) : rel;
      if (rel.startsWith(prefix) && afterPrefix && !afterPrefix.includes("/")) {
        return true;
      }
    } else {
      // Exact path match or prefix match (e.g., "apps/my-app")
      if (rel === pattern || rel.startsWith(pattern + "/")) return true;
    }
  }

  return false;
}

/** Parse requirements.txt lines to extract package names. */
function parsePythonRequirements(requirementsPath: string): Set<string> {
  try {
    const lines = fs.readFileSync(requirementsPath, "utf-8").split("\n");
    const names = new Set<string>();
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      // Strip version specifiers: discord.py>=2.0 → discord.py
      const name = line.split(/[>=<!@;\s]/)[0]!.toLowerCase();
      if (name) names.add(name);
    }
    return names;
  } catch {
    return new Set();
  }
}

/** Returns true when requirements.txt mentions a known Discord library. */
function pyRequirementsHasDiscord(requirementsPath: string): boolean {
  const pkgs = parsePythonRequirements(requirementsPath);
  return [...pkgs].some((p) => DISCORD_PYTHON_LIBS.has(p));
}

// Score a directory that contains package.json.
// Higher score = more likely to be the actual bot root.
function scorePackageDir(dir: string, pkg: Record<string, unknown>, depth: number): number {
  let score = 10 - depth * 2; // prefer shallower; depth penalty doubled

  const scripts = (pkg["scripts"] ?? {}) as Record<string, string>;
  if (typeof scripts["start"] === "string") score += 8;
  if (typeof scripts["dev"] === "string") score += 4;

  // Strongly reward Discord bot packages
  if (hasBotDependency(pkg, DISCORD_NODE_LIBS)) score += 20;

  // Heavily penalise workspace / monorepo roots
  if (pkg["workspaces"]) score -= 20;
  if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) score -= 15;
  if (typeof scripts["preinstall"] === "string" && scripts["preinstall"].includes("pnpm")) score -= 8;

  // Reward having recognisable entry files
  for (const f of ["index.js", "index.mjs", "bot.js", "main.js", "index.ts", "bot.ts"]) {
    if (fs.existsSync(path.join(dir, f))) { score += 4; break; }
  }

  return score;
}

// Score a directory as a candidate Python project root.
function scorePythonDir(dir: string, depth: number): number {
  let score = 10 - depth * 2;
  const reqPath = path.join(dir, "requirements.txt");
  if (fs.existsSync(reqPath)) {
    score += 8;
    if (pyRequirementsHasDiscord(reqPath)) score += 20;
  }
  for (const f of ["bot.py", "main.py", "app.py", "run.py"]) {
    if (fs.existsSync(path.join(dir, f))) { score += 6; break; }
  }
  return score;
}

interface NodeCandidate {
  kind: "node";
  dir: string;
  pkg: Record<string, unknown>;
  score: number;
  hasDiscord: boolean;
}
interface PythonCandidate {
  kind: "python";
  dir: string;
  score: number;
  hasDiscord: boolean;
}
type ProjectCandidate = NodeCandidate | PythonCandidate;

export interface ProjectRoot {
  dir: string;
  language: BotLanguage;
  pkg: Record<string, unknown> | null;
  hasDiscord: boolean;
}

/** Result of the root-detection pass. */
export type FindRootResult =
  | { kind: "found"; root: ProjectRoot }
  | { kind: "not_found" }
  | { kind: "ambiguous"; candidates: { label: string; dir: string; pkgJsonPath: string | null }[] };

/**
 * Walks the extracted ZIP looking for the most likely Discord bot project root.
 *
 * Key behaviour:
 *  - workspace/monorepo roots (pnpm-workspace.yaml or package.json "workspaces")
 *    are tracked but never added as bot candidates.
 *  - After the walk, workspace glob patterns are parsed and each candidate is
 *    classified as a "workspace member" or "standalone". Only standalone
 *    candidates are considered for selection.
 *  - Among standalone candidates, discord-library packages are strongly
 *    preferred. Non-discord packages are only picked if nothing else is found.
 *
 * Returns:
 *  - found        — one clear winner identified
 *  - ambiguous    — 2+ equally-plausible candidates; user must re-upload
 *  - workspace_only — only workspace/monorepo structure found, no usable bot
 *  - not_found    — no recognised project structure at all
 */
async function findProjectRoot(rootDir: string): Promise<FindRootResult> {
  const candidates: ProjectCandidate[] = [];
  // Dirs confirmed to be workspace roots during the walk.
  const workspaceRootDirs: string[] = [];

  async function search(dir: string, depth: number): Promise<void> {
    if (depth > 6 || candidates.length > 50) return;

    const hasWorkspaceYaml = fs.existsSync(path.join(dir, "pnpm-workspace.yaml"));
    const pkgPath = path.join(dir, "package.json");
    let stoppedBranch = false;

    if (fs.existsSync(pkgPath)) {
      try {
        const raw = await fsp.readFile(pkgPath, "utf-8");
        const pkg = JSON.parse(raw) as Record<string, unknown>;
        const isWorkspaceRoot = !!pkg["workspaces"] || hasWorkspaceYaml;

        if (isWorkspaceRoot) {
          // Track the workspace root but DO NOT add it as a candidate.
          // Keep searching inside it for member packages.
          workspaceRootDirs.push(dir);
        } else {
          const score = scorePackageDir(dir, pkg, depth);
          const hasDiscord = hasBotDependency(pkg, DISCORD_NODE_LIBS);
          candidates.push({ kind: "node", dir, pkg, score, hasDiscord });
          // Strong non-workspace candidate: stop descending this branch.
          if (score >= 8) stoppedBranch = true;
        }
      } catch {
        // malformed package.json — ignore
      }
    } else if (hasWorkspaceYaml) {
      // pnpm-workspace.yaml without a package.json (rare but valid)
      workspaceRootDirs.push(dir);
    }

    if (!stoppedBranch) {
      const hasRequirements = fs.existsSync(path.join(dir, "requirements.txt"));
      const hasPyEntry = ["bot.py", "main.py", "app.py", "run.py"].some((f) =>
        fs.existsSync(path.join(dir, f)),
      );
      if (hasRequirements || hasPyEntry) {
        const score = scorePythonDir(dir, depth);
        const reqPath = path.join(dir, "requirements.txt");
        const hasDiscord = hasRequirements && pyRequirementsHasDiscord(reqPath);
        candidates.push({ kind: "python", dir, score, hasDiscord });
        stoppedBranch = true;
      }
    }

    if (stoppedBranch) return;

    let entries: fs.Dirent[];
    try { entries = await fsp.readdir(dir, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
      await search(path.join(dir, entry.name), depth + 1);
    }
  }

  await search(rootDir, 0);

  if (candidates.length === 0 && workspaceRootDirs.length === 0) {
    return { kind: "not_found" };
  }

  // ── Workspace-member classification ──────────────────────────────────────
  // Parse workspace globs from every discovered workspace root so we can
  // tell which candidates are declared members of a monorepo.
  const workspaceDefs = workspaceRootDirs.map((root) => ({
    root,
    globs: parseWorkspaceGlobs(root),
  }));

  const standalone: ProjectCandidate[] = [];
  const workspaceMembers: ProjectCandidate[] = [];

  for (const c of candidates) {
    const isMember = workspaceDefs.some(({ root, globs }) =>
      isWorkspaceMember(c.dir, root, globs),
    );
    (isMember ? workspaceMembers : standalone).push(c);
  }

  // When every candidate lives inside a workspace (the common case for a
  // workspace ZIP upload), treat the workspace members as valid candidates
  // rather than rejecting the upload. The bot is almost certainly one of
  // those member packages — we just need to pick the right one.
  const selectionPool: ProjectCandidate[] =
    standalone.length > 0 ? standalone : workspaceMembers;

  if (selectionPool.length === 0) {
    // ZIP had only workspace-root markers (pnpm-workspace.yaml / workspaces
    // field) but no actual packages inside — nothing to run.
    return { kind: "not_found" };
  }

  // ── Winner selection ──────────────────────────────────────────────────────
  selectionPool.sort((a, b) => b.score - a.score);

  // Strongly prefer packages that declare a Discord library.
  const discordPool = selectionPool.filter((c) => c.hasDiscord);
  const pool = discordPool.length > 0 ? discordPool : selectionPool;

  // Build the candidate descriptor used by the ambiguous path.
  function candidateDesc(c: ProjectCandidate): { label: string; dir: string; pkgJsonPath: string | null } {
    const rel = path.relative(rootDir, c.dir) || ".";
    const pkgJsonPath = c.kind === "node" ? path.join(c.dir, "package.json") : null;
    const pkgName = c.kind === "node"
      ? (typeof (c.pkg["name"]) === "string" ? c.pkg["name"] as string : null)
      : null;
    const displayName = pkgName ?? path.basename(c.dir);
    const langTag = c.kind === "node"
      ? `Node.js${c.hasDiscord ? ", discord.js" : ""}`
      : `Python${c.hasDiscord ? ", discord.py" : ""}`;
    const label = `${displayName} — ${rel} (${langTag})`;
    return { label, dir: c.dir, pkgJsonPath };
  }

  // Ambiguity: top two candidates within 4 score points → can't auto-pick.
  if (pool.length >= 2) {
    const [first, second] = pool as [ProjectCandidate, ProjectCandidate];
    if (Math.abs(first.score - second.score) <= 4) {
      return { kind: "ambiguous", candidates: pool.slice(0, 5).map(candidateDesc) };
    }
  }

  const winner = pool[0]!;
  if (winner.kind === "node") {
    return {
      kind: "found",
      root: { dir: winner.dir, language: "node", pkg: winner.pkg, hasDiscord: winner.hasDiscord },
    };
  }
  return {
    kind: "found",
    root: { dir: winner.dir, language: "python", pkg: null, hasDiscord: winner.hasDiscord },
  };
}

type PackageManager = "npm" | "pnpm" | "yarn";

/** Detect the package manager the project expects, checking multiple signals. */
function detectPackageManager(projectRoot: string, pkg: Record<string, unknown>): PackageManager {
  // 1. Explicit packageManager field  e.g. "pnpm@8.15.0"
  const pm = typeof pkg["packageManager"] === "string" ? pkg["packageManager"] : "";
  if (pm.startsWith("pnpm")) return "pnpm";
  if (pm.startsWith("yarn")) return "yarn";

  // 2. Lock-file presence
  if (fs.existsSync(path.join(projectRoot, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(projectRoot, "yarn.lock"))) return "yarn";

  // 3. workspace: protocol in any dependency — that's pnpm/yarn, not npm
  const deps = {
    ...(pkg["dependencies"] as Record<string, string> | undefined ?? {}),
    ...(pkg["devDependencies"] as Record<string, string> | undefined ?? {}),
  };
  if (Object.values(deps).some((v) => typeof v === "string" && v.startsWith("workspace:"))) {
    return "pnpm";
  }

  // 4. pnpm workspace file
  if (fs.existsSync(path.join(projectRoot, "pnpm-workspace.yaml"))) return "pnpm";

  return "npm";
}

interface StartCommand {
  cmd: string;
  args: string[];
  label: string;
}

// Script names tried in order of preference.
const RUNNABLE_SCRIPTS = ["start", "dev", "run", "serve", "bot", "main"];

// Common standalone entry-file names tried if no runnable script is found.
const ENTRY_FILES = [
  "index.js", "index.mjs", "index.cjs",
  "bot.js", "bot.mjs",
  "main.js", "main.mjs",
  "app.js", "server.js",
  "src/index.js", "src/index.mjs",
  "src/main.js", "src/main.mjs",
  "src/bot.js",
  "dist/index.js", "dist/index.mjs",
  "dist/main.js",
];

// Python entry files, tried in order of preference.
const PYTHON_ENTRY_FILES = ["bot.py", "main.py", "app.py", "run.py"];

// File extensions that plausibly denote a script's entry point when scanning
// its command line (e.g. "node dist/index.mjs" -> "dist/index.mjs").
const SCRIPT_ENTRY_EXTENSIONS = [".mjs", ".cjs", ".js", ".ts"];

/**
 * Best-effort extraction of the file a run script actually launches, e.g.
 * "node dist/index.mjs" -> "dist/index.mjs", "tsx watch src/index.ts" ->
 * "src/index.ts". Returns null when no file-like token is found (e.g.
 * "next start"), in which case the script is trusted as-is.
 */
function extractScriptEntryFile(script: string): string | null {
  const tokens = script.split(/\s+/).filter(Boolean);
  for (const tok of tokens) {
    if (tok.startsWith("-")) continue;
    if (SCRIPT_ENTRY_EXTENSIONS.some((ext) => tok.endsWith(ext))) {
      return tok;
    }
  }
  return null;
}

/**
 * Resolves the command used to start a Node.js bot.
 *
 * Crucially, this does NOT blindly trust whatever `package.json` claims —
 * a common failure mode is a "start" script like "node dist/index.mjs"
 * left over from a TypeScript template where `dist/` was never built (or
 * never got shipped in the ZIP). Each candidate script's referenced entry
 * file is checked for existence on disk before it's trusted; if it's
 * missing, we keep searching rather than handing back a command that is
 * guaranteed to crash immediately.
 */
function resolveNodeStartCommand(
  projectRoot: string,
  pkg: Record<string, unknown>,
  pm: PackageManager,
): StartCommand | { error: string } {
  const scripts = (pkg["scripts"] ?? {}) as Record<string, string>;

  for (const name of RUNNABLE_SCRIPTS) {
    const script = scripts[name];
    if (typeof script !== "string") continue;
    const referenced = extractScriptEntryFile(script);
    if (referenced && !fs.existsSync(path.join(projectRoot, referenced))) {
      // Points at a file that doesn't exist (e.g. an unbuilt dist/ output) —
      // don't trust it yet, keep looking for something that will actually run.
      continue;
    }
    return { cmd: pm, args: ["run", name], label: `${pm} run ${name}` };
  }

  // Honour package.json "main" field if the file exists
  const main = typeof pkg["main"] === "string" ? pkg["main"] : null;
  if (main && fs.existsSync(path.join(projectRoot, main))) {
    return { cmd: "node", args: [main], label: `node ${main}` };
  }

  // Fall back to well-known entry file names
  for (const candidate of ENTRY_FILES) {
    if (fs.existsSync(path.join(projectRoot, candidate))) {
      return { cmd: "node", args: [candidate], label: `node ${candidate}` };
    }
  }

  // Nothing verifiably runnable was found. As a last resort, surface the
  // first runnable script anyway (even though its target is missing) so the
  // resulting crash/error message is at least informative instead of a
  // generic "no way to start" — this only triggers when every earlier check,
  // including a build step, has already failed to produce anything usable.
  for (const name of RUNNABLE_SCRIPTS) {
    if (typeof scripts[name] === "string") {
      return { cmd: pm, args: ["run", name], label: `${pm} run ${name}` };
    }
  }

  const availableScripts = Object.keys(scripts);
  const hint = availableScripts.length > 0
    ? `Your package.json has these scripts: ${availableScripts.join(", ")}. Rename one to "start", or add "start": "node index.js".`
    : 'Your package.json has no scripts at all. Add "start": "node index.js" (or whichever file starts your bot).';

  return { error: `No way to start the bot was found. ${hint}` };
}

function resolvePythonStartCommand(projectRoot: string): StartCommand | { error: string } {
  for (const candidate of PYTHON_ENTRY_FILES) {
    if (fs.existsSync(path.join(projectRoot, candidate))) {
      return { cmd: PYTHON_BIN, args: [candidate], label: `${PYTHON_BIN} ${candidate}` };
    }
  }
  return {
    error: `No way to start the Python bot was found. Add one of: ${PYTHON_ENTRY_FILES.join(", ")}.`,
  };
}

const PYTHON_BIN = "python3";
const PIP_INSTALL_ARGS = ["-m", "pip", "install", "--no-input", "--disable-pip-version-check", "-r", "requirements.txt"];

export async function updateHostedBot(
  ticketId: number,
  values: Partial<{
    fileName: string;
    extractPath: string;
    startCommand: string;
    status: string;
    errorMessage: string | null;
    aiExplanation: string | null;
    lastStartedAt: Date;
    restartCount: number;
    envVars: string;
    language: string;
    recentLog: string;
    repairAttempts: number;
  }>,
): Promise<number> {
  const existing = await db
    .select()
    .from(hostedBotsTable)
    .where(eq(hostedBotsTable.ticketId, ticketId));

  if (existing.length === 0) {
    const [row] = await db
      .insert(hostedBotsTable)
      .values({
        ticketId,
        fileName: values.fileName ?? "unknown.zip",
        extractPath: values.extractPath ?? "",
        startCommand: values.startCommand ?? "",
        status: values.status ?? "pending",
        errorMessage: values.errorMessage ?? null,
        aiExplanation: values.aiExplanation ?? null,
        lastStartedAt: values.lastStartedAt,
        restartCount: values.restartCount ?? 0,
        envVars: values.envVars ?? "{}",
        language: values.language ?? "node",
        recentLog: values.recentLog ?? "",
      })
      .returning();
    return row!.id;
  }

  const [row] = await db
    .update(hostedBotsTable)
    .set(values)
    .where(eq(hostedBotsTable.ticketId, ticketId))
    .returning();
  return row!.id;
}

async function reportFailure(
  ticketId: number,
  fileName: string,
  status: "crashed" | "error",
  result: { message: string; detail?: string; startCommand?: string },
): Promise<HostResult> {
  const aiExplanation = await explainHostingFailure({
    message: result.message,
    detail: result.detail,
    fileName,
  });

  await updateHostedBot(ticketId, {
    status,
    errorMessage: result.detail
      ? `${result.message}\n${result.detail}`.slice(0, 3800)
      : result.message,
    aiExplanation,
    ...(result.startCommand ? { startCommand: result.startCommand } : {}),
  });

  return { status, ...result, aiExplanation: aiExplanation ?? undefined };
}

function scheduleAutoRestart(
  ticketId: number,
  onCrash?: (info: { exitCode: number | null }) => void,
): void {
  const attemptAllowed = tryConsumeAutoRestartAttempt(ticketId);
  if (!attemptAllowed) {
    logger.warn({ ticketId }, "Hosted bot exceeded auto-restart budget; giving up");
    // Make the final "crashed" status visible — no more retries.
    db.update(hostedBotsTable)
      .set({ errorMessage: "Auto-restart budget exhausted. Please restart the bot manually." })
      .where(eq(hostedBotsTable.ticketId, ticketId))
      .catch(() => undefined);
    return;
  }
  const attemptNumber = getAutoRestartAttempts(ticketId);
  const delay = AUTO_RESTART_BASE_DELAY_MS * attemptNumber;
  logger.info({ ticketId, delay, attemptNumber }, "Scheduling auto-restart for crashed hosted bot");

  // Show "starting" immediately so the user can see the restart is in progress.
  db.update(hostedBotsTable)
    .set({ status: "starting", errorMessage: null, aiExplanation: null })
    .where(eq(hostedBotsTable.ticketId, ticketId))
    .catch(() => undefined);

  schedulePendingRestart(ticketId, () => {
    restartHostedBot(ticketId, onCrash, { isAutoRestart: true }).catch((err) => {
      logger.error({ err, ticketId }, "Auto-restart attempt failed");
    });
  }, delay);
}

// ─── AI-powered repair loop ───────────────────────────────────────────────────

interface RepairLoopParams {
  ticketId: number;
  projectRoot: string;
  persistentBotDir: string;
  language: BotLanguage;
  pkg: Record<string, unknown> | null;
  pm: PackageManager | null;
  fileName: string;
  startCmd: StartCommand;
  crashOutput: string;
  userVars: Record<string, string>;
  onCrash?: (info: { exitCode: number | null }) => void;
}

/**
 * Attempts up to MAX_REPAIR_ATTEMPTS AI-powered repairs on a crashed bot.
 *
 * Each iteration:
 *  1. Asks the AI to analyse the crash and apply safe fixes (package installs,
 *     start-script patches, etc.)
 *  2. Re-probes the bot with the patched code.
 *  3. If the bot is now running, attaches supervision and returns fixed=true.
 *  4. If the bot still crashes, loops with updated crash output.
 *
 * Returns fixed=false when all attempts are exhausted or no fix is available.
 */
async function runRepairLoop(params: RepairLoopParams): Promise<{
  fixed: boolean;
  friendlyMessage: string;
  lastOutput: string;
}> {
  const { ticketId, projectRoot, persistentBotDir, language, pkg, pm, fileName, onCrash } =
    params;
  let { crashOutput, userVars, startCmd } = params;

  for (let attempt = 1; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
    appendLiveLog(
      ticketId,
      `\n[Lumora] ─── Auto-repair attempt ${attempt}/${MAX_REPAIR_ATTEMPTS} ─────────────────────\n`,
    );
    await updateHostedBot(ticketId, { repairAttempts: attempt });

    const repair = await runAutonomousAgent({
      context: {
        ticketId,
        projectRoot,
        persistentDir: persistentBotDir,
        language,
        fileName,
        userVarNames: Object.keys(userVars),
      },
      mode: "post_crash",
      crashLogs: crashOutput,
      pkg,
      attemptNumber: attempt,
    });

    for (const fix of repair.appliedFixes) {
      appendLiveLog(ticketId, `[Lumora] Fixed: ${fix}\n`);
    }

    if (repair.requiresUserAction) {
      // Human must act — no point retrying automatically.
      if (repair.userActionMessage) {
        appendLiveLog(ticketId, `[Lumora] Action needed: ${repair.userActionMessage}\n`);
      }
      return { fixed: false, friendlyMessage: repair.friendlyMessage, lastOutput: crashOutput };
    }

    if (repair.appliedFixes.length === 0) {
      // No automated fix is possible — further retries won't help.
      appendLiveLog(ticketId, "[Lumora] No automatic fix is available for this error.\n");
      return { fixed: false, friendlyMessage: repair.friendlyMessage, lastOutput: crashOutput };
    }

    // Re-read package.json in case a fix modified it (e.g. added a start script).
    let resolvedStart = startCmd;
    if (language === "node" && pm) {
      try {
        const updatedPkg = JSON.parse(
          await fsp.readFile(path.join(projectRoot, "package.json"), "utf-8"),
        ) as Record<string, unknown>;
        const resolved = resolveNodeStartCommand(projectRoot, updatedPkg, pm);
        if (!("error" in resolved)) resolvedStart = resolved;
      } catch {
        /* leave unchanged */
      }
    }

    appendLiveLog(ticketId, `[Lumora] Restarting bot after repairs…\n`);
    const probe = await runStartupProbe(
      resolvedStart.cmd,
      resolvedStart.args,
      projectRoot,
      ticketId,
      userVars,
    );

    if (!probe.crashed) {
      const repairStatus: HostStatus =
        probe.discordSignal === "online" ? "online" :
        probe.discordSignal === "login_failed" ? "login_failed" :
        "connecting";

      appendLiveLog(
        ticketId,
        repairStatus === "online"
          ? "[Lumora] ✓ Bot is online and connected to Discord after auto-repair.\n"
          : "[Lumora] ✓ Bot process is running after auto-repair — waiting for Discord connection.\n",
      );
      attachSupervision(ticketId, probe.child, onCrash);
      await updateHostedBot(ticketId, {
        status: repairStatus,
        errorMessage: repairStatus === "login_failed"
          ? "Process running but Discord connection failed. Check your bot token and gateway intents."
          : null,
        aiExplanation: null,
        lastStartedAt: new Date(),
        startCommand: resolvedStart.label,
        recentLog: tail(getLiveLog(ticketId), OUTPUT_TAIL_CHARS),
      });
      if (repairStatus === "connecting") {
        watchForDiscordReady(ticketId);
      }
      return { fixed: true, friendlyMessage: repair.friendlyMessage, lastOutput: probe.output };
    }

    crashOutput = probe.output;
    appendLiveLog(
      ticketId,
      `[Lumora] Bot still crashing after repair attempt ${attempt}.\n`,
    );
    startCmd = resolvedStart;
  }

  return {
    fixed: false,
    friendlyMessage: `Lumora tried ${MAX_REPAIR_ATTEMPTS} automatic repair${MAX_REPAIR_ATTEMPTS !== 1 ? "s" : ""} but the bot is still crashing. Please review the log output and check your configuration.`,
    lastOutput: crashOutput,
  };
}

/**
 * After attaching supervision, poll the live log for Discord gateway signals
 * for up to `timeoutMs` ms. Upgrades the DB status from "connecting" to
 * "online" or "login_failed" as signals are detected.
 *
 * Fire-and-forget — never throws.
 */
function watchForDiscordReady(ticketId: number, timeoutMs = 20_000): void {
  const startedAt = Date.now();
  // Scan the full live log from the start on every poll, not just new chunks.
  // This catches failure patterns that were logged before the watcher started
  // (e.g. during the 8s startup probe) as well as patterns that span poll boundaries.

  function poll(): void {
    try {
      const fullLog = getLiveLog(ticketId);

      // ── Check for Discord online signal anywhere in the log ───────────────
      if (DISCORD_ONLINE_PATTERNS.some((p) => p.test(fullLog))) {
        const match = fullLog.match(/logged in as (.+?)(?:\s*[\n\r]|$)/i);
        const who = match?.[1]?.trim();
        if (who) {
          appendLiveLog(ticketId, `[Discord] ✓ Bot online as ${who}\n`);
        }
        logger.info({ ticketId, who }, "Discord client.ready detected via live log watcher");
        db.update(hostedBotsTable)
          .set({ status: "online", ...(who ? { botName: who } : {}) })
          .where(eq(hostedBotsTable.ticketId, ticketId))
          .catch((err: unknown) => logger.error({ err }, "Failed to set discord online status"));
        return; // done
      }

      // ── Check for known Discord failure patterns ───────────────────────────
      if (DISCORD_FAIL_PATTERNS.some((p) => p.test(fullLog))) {
        logger.warn({ ticketId }, "Discord login failure detected via live log watcher");
        db.update(hostedBotsTable)
          .set({
            status: "login_failed",
            errorMessage:
              "Discord connection failed. Check your bot token (DISCORD_TOKEN or DISCORD_BOT_TOKEN) " +
              "and that Gateway Intents are enabled in the Discord Developer Portal.",
          })
          .where(eq(hostedBotsTable.ticketId, ticketId))
          .catch((err: unknown) => logger.error({ err }, "Failed to set login_failed status"));
        return; // done
      }

      // ── Process died — crash handler takes over ────────────────────────────
      if (!isRunning(ticketId)) return;

      // ── Watchdog timeout ───────────────────────────────────────────────────
      if (Date.now() - startedAt >= timeoutMs) {
        logger.warn({ ticketId }, "Discord ready watcher timed out after 20s — setting crashed, NOT auto-restarting");
        appendLiveLog(
          ticketId,
          "[Lumora] ⚠ Bot did not connect to Discord within 20 seconds.\n" +
          "[Lumora] The bot process is running but silent. Common causes:\n" +
          "[Lumora]   • Missing or wrong DISCORD_TOKEN / DISCORD_BOT_TOKEN env var\n" +
          "[Lumora]   • Bot code never calls client.login() or discord.run()\n" +
          "[Lumora]   • Async startup error that doesn't crash the process\n" +
          "[Lumora] Use the AI Assistant tab to diagnose and fix this automatically.\n",
        );
        // Kill the silent process but do NOT schedule an auto-restart.
        // Auto-restarting a bot with a bad token or missing login call just
        // loops forever (starting → connecting → 20s → starting → ...).
        // The user can see the error, use the AI chat to fix it, then restart manually.
        stopProcess(ticketId);
        db.update(hostedBotsTable)
          .set({
            status: "crashed",
            errorMessage:
              "Bot started but never connected to Discord (20s timeout). " +
              "Most likely cause: missing or wrong DISCORD_TOKEN env var, or the bot code " +
              "never calls client.login(). Use the AI Assistant to diagnose this.",
            recentLog: tail(getLiveLog(ticketId), OUTPUT_TAIL_CHARS),
          })
          .where(eq(hostedBotsTable.ticketId, ticketId))
          .catch((err: unknown) => logger.error({ err }, "Failed to set watchdog-timeout status"));
        return; // STOP — do not auto-restart
      }

      setTimeout(poll, 500);
    } catch (err) {
      logger.warn({ err, ticketId }, "watchForDiscordReady poll threw unexpectedly");
    }
  }

  setTimeout(poll, 400); // first check shortly after supervision is attached
}

function attachSupervision(
  ticketId: number,
  child: ChildProcess,
  onCrash?: (info: { exitCode: number | null }) => void,
): void {
  setRunningProcess(ticketId, child);
  armStabilityReset(ticketId);

  child.stdout?.on("data", (d: Buffer) => appendLiveLog(ticketId, d.toString()));
  child.stderr?.on("data", (d: Buffer) => appendLiveLog(ticketId, d.toString()));

  child.once("exit", (code) => {
    clearRunningProcess(ticketId);
    const wasIntentional = consumeIntentionalStop(ticketId);
    const tailLog = tail(getLiveLog(ticketId), OUTPUT_TAIL_CHARS);

    // Produce a human-friendly error — run the same crash diagnosis we use at
    // startup. userVars aren't available here so token checks are skipped, but
    // all output-pattern matches (Discord HTTP 500, invalid token text, etc.)
    // still work.  Fall back to a clean generic message rather than leaking a
    // raw stack trace in the error box (the full log is already visible above).
    let errorMessage: string | null = null;
    if (!wasIntentional) {
      const diagnosis = diagnoseBotCrash(tailLog, {});
      errorMessage = diagnosis ??
        `The bot process exited unexpectedly (exit code ${code ?? "unknown"}). ` +
        `Check the output log above for details.`;
    }

    db.update(hostedBotsTable)
      .set({
        status: wasIntentional ? "stopped" : "crashed",
        errorMessage,
        recentLog: tailLog,
      })
      .where(eq(hostedBotsTable.ticketId, ticketId))
      .catch((err: unknown) => {
        logger.error({ err }, "Failed to update hosted bot status after crash");
      });

    if (wasIntentional) return;

    onCrash?.({ exitCode: code });
    scheduleAutoRestart(ticketId, onCrash);
  });
}

/**
 * Validates that a file is a well-formed ZIP archive by checking:
 *  1. Local-file-header magic bytes (PK\x03\x04) — catches wrong file type.
 *  2. End-of-Central-Directory record (PK\x05\x06) — catches truncated /
 *     interrupted uploads that produce "unexpected EOF" during extraction.
 *
 * Returns an error string on failure, or null if the file looks valid.
 */
async function validateZipHeader(zipPath: string): Promise<string | null> {
  let stat: import("node:fs").Stats;
  try {
    stat = await fsp.stat(zipPath);
  } catch {
    return "The uploaded file could not be read.";
  }

  if (stat.size === 0) {
    return "Upload failed. Your ZIP was empty. Please upload again.";
  }

  // Minimum valid ZIP is 22 bytes (empty EOCD only).
  if (stat.size < 22) {
    return "Upload failed. Your ZIP was incomplete or corrupted. Please upload again.";
  }

  let fd: import("node:fs/promises").FileHandle | null = null;
  try {
    fd = await fsp.open(zipPath, "r");

    // ── 1. Local-file-header magic ──────────────────────────────────────────
    const startBuf = Buffer.alloc(4);
    await fd.read(startBuf, 0, 4, 0);
    if (startBuf[0] !== 0x50 || startBuf[1] !== 0x4b) {
      return "The file you uploaded is not a ZIP archive. Please upload a .zip file.";
    }

    // ── 2. End-of-Central-Directory (EOCD) scan ─────────────────────────────
    // For ZIPs without a comment the EOCD is the last 22 bytes.
    // We scan up to 64 KB + 22 bytes from the end to handle ZIPs with comments.
    const eocdWindowSize = Math.min(stat.size, 65536 + 22);
    const eocdBuf = Buffer.alloc(eocdWindowSize);
    await fd.read(eocdBuf, 0, eocdWindowSize, stat.size - eocdWindowSize);

    let eocdFound = false;
    // Search backwards — EOCD is near the end.
    for (let i = eocdWindowSize - 22; i >= 0; i--) {
      if (
        eocdBuf[i]     === 0x50 &&
        eocdBuf[i + 1] === 0x4b &&
        eocdBuf[i + 2] === 0x05 &&
        eocdBuf[i + 3] === 0x06
      ) {
        eocdFound = true;
        break;
      }
    }

    if (!eocdFound) {
      return "Upload failed. Your ZIP was incomplete or corrupted — the transfer may have been interrupted. Please upload again.";
    }

    return null;
  } catch {
    return "Upload failed. Your ZIP was incomplete or corrupted. Please upload again.";
  } finally {
    await fd?.close().catch(() => {});
  }
}

export async function hostUploadedZip(params: {
  ticketId: number;
  zipPath: string;
  fileName: string;
  onCrash?: (info: { exitCode: number | null }) => void;
}): Promise<HostResult> {
  const { ticketId, zipPath, fileName, onCrash } = params;

  stopProcess(ticketId);
  resetAutoRestartAttempts(ticketId);

  // ── ZIP validation ──────────────────────────────────────────────────────
  // Validate the file BEFORE touching the database. If the ZIP is corrupt or
  // not a ZIP at all we return an error without creating a deployment record.
  const headerError = await validateZipHeader(zipPath);
  if (headerError) {
    logger.warn({ ticketId, fileName, headerError }, "ZIP validation failed — rejecting upload");
    return { status: "error", message: headerError };
  }

  // ── Prepare extraction directory ────────────────────────────────────────
  const extractRoot = ticketBotDir(ticketId);
  await fsp.rm(extractRoot, { recursive: true, force: true });
  await fsp.mkdir(extractRoot, { recursive: true });

  // Create (or update) the deployment record only now that the file is valid.
  await updateHostedBot(ticketId, {
    fileName,
    extractPath: extractRoot,
    status: "installing",
    errorMessage: null,
  });

  // ── Extract with one automatic retry ───────────────────────────────────────
  // Transient I/O errors (e.g. race conditions on some filesystems) can make
  // the first attempt fail even on a valid archive. We retry once after a brief
  // pause before surfacing the error to the user.
  let extractErr: unknown = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (attempt > 1) {
      appendLiveLog(ticketId, "[Lumora] Retrying extraction…\n");
      await fsp.rm(extractRoot, { recursive: true, force: true });
      await fsp.mkdir(extractRoot, { recursive: true });
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
    }
    try {
      await extract(zipPath, { dir: extractRoot });
      extractErr = null;
      break;
    } catch (err) {
      extractErr = err;
      if (attempt < 2) {
        logger.warn({ err, ticketId, fileName }, "ZIP extraction failed — retrying once");
      }
    }
  }

  if (extractErr !== null) {
    // Log the real error for admins; show a clean message to the customer.
    logger.error({ err: extractErr, ticketId, fileName }, "ZIP extraction failed after retry");
    // Clean up partial extraction directory and the uploaded zip file.
    await Promise.all([
      fsp.rm(extractRoot, { recursive: true, force: true }).catch(() => {}),
      fsp.rm(zipPath, { force: true }).catch(() => {}),
    ]);
    return reportFailure(ticketId, fileName, "error", {
      message: "Upload failed. Your ZIP was incomplete or corrupted. Please upload again.",
    });
  }

  // Remove any Replit-platform files (artifact.toml, .replit, etc.) so the
  // platform never registers spurious workflows from the extracted ZIP contents.
  await stripPlatformFiles(extractRoot);
  logger.info({ ticketId }, "Platform files stripped from extracted ZIP");

  // ── Bot-root detection ──────────────────────────────────────────────────
  appendLiveLog(ticketId, "[Lumora] Scanning ZIP for bot project root…\n");
  const rootResult = await findProjectRoot(extractRoot);

  if (rootResult.kind === "not_found") {
    return reportFailure(ticketId, fileName, "error", {
      message:
        "No Discord bot project was found in the ZIP.\n\n" +
        "For a Node.js bot: include a package.json that lists discord.js (or a " +
        "compatible library) as a dependency.\n" +
        "For a Python bot: include a requirements.txt with discord.py / py-cord / " +
        "nextcord and a bot.py or main.py entry file.\n\n" +
        "If you uploaded a workspace ZIP, make sure it contains at least one " +
        "package subfolder with discord.js in its dependencies.",
    });
  }

  if (rootResult.kind === "ambiguous") {
    const list = rootResult.candidates.map((c, i) => {
      const lines = [`  ${i + 1}. ${c.label}`];
      if (c.pkgJsonPath) lines.push(`     package.json: ${c.pkgJsonPath}`);
      return lines.join("\n");
    }).join("\n");
    return reportFailure(ticketId, fileName, "error", {
      message:
        `${rootResult.candidates.length} Discord bots were found in the ZIP — ` +
        "please upload a ZIP of just the one you want to host:\n\n" +
        list +
        "\n\nTip: zip only the bot's own folder (the one containing its package.json), " +
        "not the entire workspace.",
    });
  }

  // rootResult.kind === "found"
  const { dir: detectedBotDir, language, pkg, hasDiscord } = rootResult.root;

  // Relative path used only for human-readable log messages (before isolation).
  const relRoot = path.relative(extractRoot, detectedBotDir) || ".";
  const discordNote = hasDiscord
    ? language === "node" ? " (discord.js detected)" : " (discord.py detected)"
    : " ⚠ no Discord library detected in dependencies";

  logger.info({ ticketId, detectedBotDir, language, hasDiscord }, "Bot project root detected");
  appendLiveLog(
    ticketId,
    `[Lumora] Selected bot       : ${path.basename(detectedBotDir)}\n` +
    `[Lumora] Bot root           : ${relRoot}${discordNote}\n` +
    `[Lumora] Language           : ${language === "node" ? "Node.js" : "Python"}\n`,
  );

  // If no Discord library was found in package.json / requirements.txt,
  // scan source files before giving up — the bot might have its dep unlisted
  // or bundled, but the source code still uses discord.js patterns.
  let discordConfirmed = hasDiscord;
  if (!discordConfirmed) {
    appendLiveLog(ticketId, "[Lumora] No Discord lib in deps — scanning source files…\n");
    discordConfirmed = await scanSourceFilesForDiscord(detectedBotDir);
    if (discordConfirmed) {
      appendLiveLog(ticketId, "[Lumora] Discord usage found in source files ✓\n");
    }
  }

  if (!discordConfirmed) {
    const hint = language === "node"
      ? 'Add "discord.js" (or a compatible library such as eris / oceanic.js) ' +
        'to "dependencies" in your bot\'s package.json.'
      : "Add discord.py, py-cord, nextcord, or disnake to requirements.txt.";
    return reportFailure(ticketId, fileName, "error", {
      message:
        "The uploaded ZIP does not appear to be a Discord bot.\n\n" +
        `No Discord library was found in the package at "${relRoot}", and no ` +
        "Discord-specific code patterns were detected in its source files.\n\n" +
        hint,
    });
  }

  // ── Bot isolation ───────────────────────────────────────────────────────
  // Copy the detected bot folder to a fully isolated /tmp location so that
  // npm/pnpm/yarn cannot walk up the directory tree and discover Lumora's own
  // workspace files (pnpm-workspace.yaml, catalog definitions, etc.).
  // Also rewrites any catalog:/workspace: dep versions to "*" so install works
  // without the parent workspace context.
  appendLiveLog(ticketId, "[Lumora] Isolating bot into clean build directory…\n");
  const projectRoot = await isolateBot(detectedBotDir, ticketId);
  logger.info({ ticketId, detectedBotDir, projectRoot }, "Bot isolated to tmp directory");

  const pm: PackageManager | null = language === "node"
    ? detectPackageManager(projectRoot, pkg!)
    : null;

  await updateHostedBot(ticketId, { language });

  // ── Dependency installation ─────────────────────────────────────────────
  const pkgJsonPath = language === "node" ? path.join(projectRoot, "package.json") : null;
  appendLiveLog(
    ticketId,
    `[Lumora] Bot root           : ${projectRoot}\n` +
    `[Lumora] Package manager    : ${pm ?? "pip"}\n` +
    (pkgJsonPath ? `[Lumora] Using package.json : ${pkgJsonPath}\n` : "") +
    `[Lumora] ─── Installing dependencies ───────────────────\n`,
  );
  logger.info(
    { ticketId, projectRoot, pkgJsonPath, pm, language },
    "Bot runner: starting dependency installation",
  );

  let install: { exitedCleanly: boolean; exitCode: number | null; output: string };
  if (language === "node") {
    const installArgs =
      pm === "pnpm" ? ["install", "--no-frozen-lockfile"] :
      pm === "yarn" ? ["install", "--non-interactive"] :
      ["install", "--no-audit", "--no-fund"];
    appendLiveLog(ticketId, `[Lumora] Install command     : ${pm} ${installArgs.join(" ")}\n`);
    install = await runCommand(pm!, installArgs, projectRoot, INSTALL_TIMEOUT_MS);
  } else if (fs.existsSync(path.join(projectRoot, "requirements.txt"))) {
    appendLiveLog(ticketId, `[Lumora] Install command     : ${PYTHON_BIN} ${PIP_INSTALL_ARGS.join(" ")}\n`);
    install = await runCommand(PYTHON_BIN, PIP_INSTALL_ARGS, projectRoot, INSTALL_TIMEOUT_MS);
  } else {
    // No requirements.txt — nothing to install.
    install = { exitedCleanly: true, exitCode: 0, output: "" };
  }

  if (!install.exitedCleanly) {
    return reportFailure(ticketId, fileName, "error", {
      message:
        language === "node"
          ? "Dependency installation failed."
          : "Failed to install Python dependencies from requirements.txt.",
      detail: install.output,
    });
  }

  // ── Build step (TypeScript / compiled Node bots) ────────────────────────
  // Running build before resolving the start command ensures dist/ exists
  // before we check whether the entry file is present on disk.
  if (language === "node") {
    const scripts = (pkg!["scripts"] ?? {}) as Record<string, string>;
    if (typeof scripts["build"] === "string") {
      logger.info({ ticketId }, "Running build script before start");
      const build = await runCommand(pm!, ["run", "build"], projectRoot, INSTALL_TIMEOUT_MS);
      if (!build.exitedCleanly) {
        return reportFailure(ticketId, fileName, "error", {
          message: 'The build step ("build" script in package.json) failed.',
          detail: build.output,
        });
      }
    }
  }

  // ── Start-command resolution ────────────────────────────────────────────
  // Done after install + build so existence checks see the final filesystem.
  let startCommand: StartCommand | { error: string } = language === "node"
    ? resolveNodeStartCommand(projectRoot, pkg!, pm!)
    : resolvePythonStartCommand(projectRoot);

  if ("error" in startCommand) {
    // Before giving up, try a static pre-launch fix to add a start script.
    const earlyVars = await getHostedBotEnvVars(ticketId);
    const preLaunch = await analyzeAndFixBeforeLaunch({
      projectRoot,
      persistentDir: detectedBotDir,
      language,
      pkg: pkg ?? {},
      userVars: earlyVars,
      ticketId,
    });
    if (preLaunch.packageJsonModified) {
      for (const fix of preLaunch.fixes) {
        appendLiveLog(ticketId, `[Lumora] Pre-launch fix: ${fix.description}\n`);
      }
      // Re-read the patched package.json and retry start-command resolution.
      try {
        const updatedPkg = JSON.parse(
          await fsp.readFile(path.join(projectRoot, "package.json"), "utf-8"),
        ) as Record<string, unknown>;
        startCommand = resolveNodeStartCommand(projectRoot, updatedPkg, pm!);
      } catch {
        /* leave as error */
      }
    } else {
      // Log token alias notice even when not fixing start script
      for (const fix of preLaunch.fixes) {
        appendLiveLog(ticketId, `[Lumora] Note: ${fix.description}\n`);
      }
    }
  }

  if ("error" in startCommand) {
    return reportFailure(ticketId, fileName, "error", { message: startCommand.error });
  }

  appendLiveLog(
    ticketId,
    `[Lumora] ✓ Dependencies installed\n` +
    `[Lumora] Start command      : ${startCommand.label}\n` +
    `[Lumora] ─── Starting bot process ──────────────────────\n`,
  );
  logger.info(
    { ticketId, projectRoot, startCommand: startCommand.label },
    "Bot runner: launching bot process",
  );

  // Store detectedBotDir (the persistent original location within storage/)
  // as extractPath so restarts can recover after a server restart by
  // re-isolating from it. The tmp dir (projectRoot) is ephemeral.
  await updateHostedBot(ticketId, {
    status: "starting",
    startCommand: startCommand.label,
    extractPath: detectedBotDir,
  });

  // Apply token-alias resolution so bots using TOKEN/BOT_TOKEN work without
  // the customer having to rename their secret.
  const userVars = resolveTokenAlias(await getHostedBotEnvVars(ticketId));

  // Also run the remaining pre-launch checks (token alias notice, etc.) now
  // that we have the resolved env vars — skip if we already ran above.
  {
    const preLaunch = await analyzeAndFixBeforeLaunch({
      projectRoot,
      persistentDir: detectedBotDir,
      language,
      pkg: pkg ?? {},
      userVars,
      ticketId,
    });
    for (const fix of preLaunch.fixes) {
      // Only log fixes that haven't already been logged above
      if (!fix.description.includes("Pre-launch fix:")) {
        appendLiveLog(ticketId, `[Lumora] Pre-launch: ${fix.description}\n`);
      }
    }
  }

  // ── Autonomous AI pre-launch agent ─────────────────────────────────────
  // Runs a multi-turn AI agent that inspects every file, detects problems,
  // and applies fixes BEFORE the first startup probe. Falls back gracefully
  // when OPENROUTER_API_KEY is not configured.
  if (process.env["OPENROUTER_API_KEY"]) {
    const preLaunchAgent = await runAutonomousAgent({
      context: {
        ticketId,
        projectRoot,
        persistentDir: detectedBotDir,
        language,
        fileName,
        userVarNames: Object.keys(userVars),
      },
      mode: "pre_launch",
      pkg: pkg ?? null,
    });

    if (preLaunchAgent.requiresUserAction) {
      return reportFailure(ticketId, fileName, "error", {
        message: preLaunchAgent.friendlyMessage,
        detail: preLaunchAgent.userActionMessage,
        startCommand: startCommand.label,
      });
    }

    // If the agent determined a different start command, apply it.
    if (preLaunchAgent.startCommand) {
      const [agentCmd, ...agentArgs] = preLaunchAgent.startCommand.split(" ");
      if (agentCmd) {
        startCommand = { cmd: agentCmd, args: agentArgs, label: preLaunchAgent.startCommand };
        await updateHostedBot(ticketId, { startCommand: preLaunchAgent.startCommand });
      }
    }

    // Re-read package.json in case the agent modified it (e.g. added start script)
    if (language === "node" && pm) {
      try {
        const updatedPkg = JSON.parse(
          await fsp.readFile(path.join(projectRoot, "package.json"), "utf-8"),
        ) as Record<string, unknown>;
        const resolved = resolveNodeStartCommand(projectRoot, updatedPkg, pm);
        if (!("error" in resolved)) {
          startCommand = resolved;
          await updateHostedBot(ticketId, { startCommand: resolved.label });
        }
      } catch { /* leave unchanged */ }
    }
  }

  const probe = await runStartupProbe(startCommand.cmd, startCommand.args, projectRoot, ticketId, userVars);

  if (probe.crashed) {
    logger.warn(
      { ticketId, exitCode: probe.exitCode, outputTail: tail(probe.output, 500) },
      "Bot crashed on startup — entering AI repair loop",
    );

    // Run the known-pattern diagnosis first for a fast answer.
    const quickDiagnosis = diagnoseBotCrash(probe.output, userVars);

    // Attempt AI-powered auto-repair (up to MAX_REPAIR_ATTEMPTS times).
    const repairOutcome = await runRepairLoop({
      ticketId,
      projectRoot,
      persistentBotDir: detectedBotDir,
      language,
      pkg,
      pm,
      fileName,
      startCmd: startCommand,
      crashOutput: probe.output,
      userVars,
      onCrash,
    });

    if (repairOutcome.fixed) {
      // Bot is now running after repair — report success.
      return {
        status: "running",
        message: repairOutcome.friendlyMessage,
        startCommand: startCommand.label,
      };
    }

    // All repair attempts failed — report crash with the best diagnosis we have.
    return reportFailure(ticketId, fileName, "crashed", {
      message: quickDiagnosis ?? repairOutcome.friendlyMessage,
      detail: probe.output,
      startCommand: startCommand.label,
    });
  }

  // Determine initial Discord status from signals seen during the probe window.
  const initialStatus: HostStatus =
    probe.discordSignal === "online" ? "online" :
    probe.discordSignal === "login_failed" ? "login_failed" :
    "connecting";

  attachSupervision(ticketId, probe.child, onCrash);
  await updateHostedBot(ticketId, {
    status: initialStatus,
    errorMessage: initialStatus === "login_failed"
      ? "Process running but Discord connection failed. Check your bot token and gateway intents."
      : null,
    aiExplanation: null,
    lastStartedAt: new Date(),
    recentLog: tail(getLiveLog(ticketId), OUTPUT_TAIL_CHARS),
  });

  if (initialStatus === "connecting") {
    watchForDiscordReady(ticketId);
  }

  return {
    status: initialStatus,
    message:
      initialStatus === "online"
        ? "The bot is running and connected to Discord."
        : initialStatus === "login_failed"
        ? "The bot process started, but Discord connection failed. Check your token and intents."
        : "The bot process started and is connecting to Discord.",
    startCommand: startCommand.label,
  };
}

export async function restartHostedBot(
  ticketId: number,
  onCrash?: (info: { exitCode: number | null }) => void,
  opts?: { isAutoRestart?: boolean },
): Promise<HostResult> {
  const [row] = await db
    .select()
    .from(hostedBotsTable)
    .where(eq(hostedBotsTable.ticketId, ticketId));

  if (!row || !row.extractPath || !row.startCommand) {
    return { status: "error", message: "No bot has been uploaded to this ticket yet." };
  }

  // Stop any running process and cancel queued restarts.
  stopProcess(ticketId);
  if (!opts?.isAutoRestart) {
    resetAutoRestartAttempts(ticketId);
    // Clear the live log so the user sees fresh output for this restart attempt.
    clearLiveLog(ticketId);
  }

  // row.extractPath is the persistent original bot dir (inside storage/).
  // The actual run directory is the isolated /tmp copy. Re-isolate if it's
  // gone (e.g. after a server restart that wiped /tmp).
  const originalBotDir = row.extractPath;
  if (!fs.existsSync(originalBotDir)) {
    const message = "The previously extracted files are missing. Please re-upload the ZIP file.";
    return reportFailure(ticketId, row.fileName, "error", { message });
  }

  const tmpRoot = isolatedBotDir(ticketId);
  let projectRoot = tmpRoot;

  if (!fs.existsSync(tmpRoot)) {
    // /tmp was wiped (server restart). Re-isolate from the persistent copy.
    appendLiveLog(ticketId, "[Lumora] Restoring bot files…\n");
    await updateHostedBot(ticketId, { status: "installing", errorMessage: "Restoring bot files…" });
    try {
      projectRoot = await isolateBot(originalBotDir, ticketId);
      // Re-install dependencies since node_modules was in the tmp dir.
      const lang = (row.language as BotLanguage) ?? "node";
      if (lang === "node") {
        const pkgRaw = fs.existsSync(path.join(projectRoot, "package.json"))
          ? fs.readFileSync(path.join(projectRoot, "package.json"), "utf-8") : "{}";
        const pkg = JSON.parse(pkgRaw) as Record<string, unknown>;
        const pm = detectPackageManager(projectRoot, pkg);
        const installArgs = pm === "pnpm" ? ["install", "--no-frozen-lockfile"]
          : pm === "yarn" ? ["install", "--non-interactive"]
          : ["install", "--no-audit", "--no-fund"];
        appendLiveLog(ticketId, `[Lumora] Installing dependencies (${pm})…\n`);
        await updateHostedBot(ticketId, { errorMessage: `Installing dependencies (${pm})… this may take a minute` });
        const install = await runCommand(pm, installArgs, projectRoot, INSTALL_TIMEOUT_MS);
        if (!install.exitedCleanly) {
          return reportFailure(ticketId, row.fileName, "error", {
            message: "Dependency installation failed. Check the Logs tab for details.",
            detail: install.output,
          });
        }
      } else if (fs.existsSync(path.join(projectRoot, "requirements.txt"))) {
        appendLiveLog(ticketId, "[Lumora] Installing Python dependencies…\n");
        await updateHostedBot(ticketId, { errorMessage: "Installing Python dependencies… this may take a minute" });
        const install = await runCommand(PYTHON_BIN, PIP_INSTALL_ARGS, projectRoot, INSTALL_TIMEOUT_MS);
        if (!install.exitedCleanly) {
          return reportFailure(ticketId, row.fileName, "error", {
            message: "Python dependency installation failed. Check the Logs tab for details.",
            detail: install.output,
          });
        }
      }
      await updateHostedBot(ticketId, { errorMessage: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reportFailure(ticketId, row.fileName, "error", {
        message: "Failed to restore the bot's files. Please try restarting again.",
        detail: msg,
      });
    }
  }

  await updateHostedBot(ticketId, { status: "starting", errorMessage: null, aiExplanation: null });

  const [cmd, ...args] = row.startCommand.split(" ");
  const userVars = resolveTokenAlias(await getHostedBotEnvVars(ticketId));
  const probe = await runStartupProbe(cmd!, args, projectRoot, ticketId, userVars);

  if (probe.crashed) {
    logger.warn(
      { ticketId, exitCode: probe.exitCode, outputTail: tail(probe.output, 500) },
      "Bot crashed on restart — attempting AI repair",
    );
    await updateHostedBot(ticketId, { restartCount: row.restartCount + 1 });

    // Run the same AI repair loop used during initial deploy.
    const lang = (row.language as BotLanguage) ?? "node";
    let pkgForRepair: Record<string, unknown> | null = null;
    if (lang === "node") {
      try {
        pkgForRepair = JSON.parse(
          await fsp.readFile(path.join(projectRoot, "package.json"), "utf-8"),
        ) as Record<string, unknown>;
      } catch { /* ignore */ }
    }
    const pmForRepair: PackageManager | null =
      lang === "node" && pkgForRepair
        ? detectPackageManager(projectRoot, pkgForRepair)
        : null;

    const [startCmdStr, ...startCmdArgs] = row.startCommand.split(" ");
    const startCmdForRepair: StartCommand = {
      cmd: startCmdStr!,
      args: startCmdArgs,
      label: row.startCommand,
    };

    const repairOutcome = await runRepairLoop({
      ticketId,
      projectRoot,
      persistentBotDir: originalBotDir,
      language: lang,
      pkg: pkgForRepair,
      pm: pmForRepair,
      fileName: row.fileName,
      startCmd: startCmdForRepair,
      crashOutput: probe.output,
      userVars,
      onCrash,
    });

    if (repairOutcome.fixed) {
      return {
        status: "running",
        message: repairOutcome.friendlyMessage,
        startCommand: row.startCommand,
      };
    }

    const diagnosis = diagnoseBotCrash(probe.output, userVars);
    return reportFailure(ticketId, row.fileName, "crashed", {
      message: diagnosis ?? repairOutcome.friendlyMessage,
      detail: diagnosis ? probe.output : undefined,
      startCommand: row.startCommand,
    });
  }

  const restartStatus: HostStatus =
    probe.discordSignal === "online" ? "online" :
    probe.discordSignal === "login_failed" ? "login_failed" :
    "connecting";

  attachSupervision(ticketId, probe.child, onCrash);
  await updateHostedBot(ticketId, {
    status: restartStatus,
    errorMessage: restartStatus === "login_failed"
      ? "Process running but Discord connection failed. Check your bot token and gateway intents."
      : null,
    aiExplanation: null,
    lastStartedAt: new Date(),
    restartCount: row.restartCount + 1,
    recentLog: tail(getLiveLog(ticketId), OUTPUT_TAIL_CHARS),
  });

  if (restartStatus === "connecting") {
    watchForDiscordReady(ticketId);
  }

  return {
    status: restartStatus,
    message:
      restartStatus === "online"
        ? "The bot was restarted and connected to Discord."
        : restartStatus === "login_failed"
        ? "The bot process restarted, but Discord connection failed."
        : "The bot process restarted and is connecting to Discord.",
  };
}

export async function getHostedBotStatus(ticketId: number) {
  const [row] = await db
    .select()
    .from(hostedBotsTable)
    .where(eq(hostedBotsTable.ticketId, ticketId));
  return row ?? null;
}

/**
 * Gracefully stops the bot without clearing its upload/config, so it can be
 * restarted later via restartHostedBot.
 */
export async function stopHostedBot(ticketId: number): Promise<HostResult> {
  const [row] = await db
    .select()
    .from(hostedBotsTable)
    .where(eq(hostedBotsTable.ticketId, ticketId));

  if (!row) {
    return { status: "error", message: "No bot has been uploaded to this ticket yet." };
  }

  stopProcess(ticketId); // also cancels any pending restart timer
  resetAutoRestartAttempts(ticketId);
  cancelPendingRestart(ticketId); // belt-and-suspenders: ensure no queued restart fires

  await updateHostedBot(ticketId, {
    status: "stopped",
    errorMessage: null,
    aiExplanation: null,
    recentLog: tail(getLiveLog(ticketId), OUTPUT_TAIL_CHARS),
  });

  return { status: "stopped" as any, message: "The bot has been stopped." };
}

export async function resumeHostedBotsOnBoot(
  notify: (ticketId: number, result: HostResult) => void,
): Promise<void> {
  // Any bot whose process is gone needs restarting or resetting.
  // "starting" bots that already have an extractPath (were fully uploaded)
  // can be auto-resumed just like running bots.  Bots with no extractPath
  // were mid-upload when we went down — reset them to stopped.
  const startingRows = await db
    .select()
    .from(hostedBotsTable)
    .where(eq(hostedBotsTable.status, "starting"));

  // Any bot stuck in "starting" at boot time had its process killed when the
  // server went down. Auto-resuming them hides genuine crash-loop problems and
  // confused users who tried to stop a bot before the server restarted.
  // Reset them all to "stopped" and let the user decide when to restart.
  if (startingRows.length > 0) {
    await db
      .update(hostedBotsTable)
      .set({
        status: "stopped",
        errorMessage: null,
      })
      .where(
        inArray(
          hostedBotsTable.ticketId,
          startingRows.map((r) => r.ticketId),
        ),
      );
  }

  const resumableStarting: typeof startingRows = [];
  const stuckStarting: typeof startingRows = [];

  // Resume any bot that was live at the time the server was restarted,
  // regardless of which phase of the Discord connection lifecycle it was in.
  // Also resume bots that were mid-launch but have a persistent extractPath.
  const liveRows = await db
    .select()
    .from(hostedBotsTable)
    .where(
      inArray(hostedBotsTable.status, ["running", "online", "connecting", "login_failed"]),
    );

  const rowsToResume = [...liveRows, ...resumableStarting];

  for (const row of rowsToResume) {
    const [ticket] = await db
      .select()
      .from(ticketsTable)
      .where(eq(ticketsTable.id, row.ticketId));
    if (!ticket || ticket.status !== "open") continue;

    try {
      const result = await restartHostedBot(row.ticketId, (info) => {
        notify(row.ticketId, {
          status: "crashed",
          message: `The hosted bot stopped unexpectedly (exit code ${info.exitCode ?? "unknown"}).`,
        });
      });
      notify(row.ticketId, result);
    } catch (err) {
      logger.error({ err, ticketId: row.ticketId }, "Failed to resume hosted bot");
    }
  }
}

export { ticketUploadDir };
