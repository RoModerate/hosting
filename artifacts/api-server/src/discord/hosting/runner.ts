import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import extract from "extract-zip";
import { eq } from "drizzle-orm";
import { db, hostedBotsTable, ticketsTable } from "@workspace/db";
import { logger } from "../../lib/logger";
import { ticketBotDir, ticketUploadDir } from "./paths";
import {
  clearRunningProcess,
  setRunningProcess,
  stopProcess,
} from "./processManager";
import { explainHostingFailure } from "./aiExplain";

export const MAX_ZIP_BYTES = 100 * 1024 * 1024; // 100MB
const INSTALL_TIMEOUT_MS = 10 * 60 * 1000; // 10 min — large monorepos can be slow
const STARTUP_PROBE_MS = 8 * 1000;
const OUTPUT_TAIL_CHARS = 3500;

export type HostStatus = "running" | "crashed" | "error";

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

interface StartupProbeResult {
  child: ChildProcess;
  crashed: boolean;
  exitCode: number | null;
  output: string;
}

/** Unique port for each hosted bot so none of them fight over 8080. */
function botPort(ticketId: number): number {
  return 10000 + (ticketId % 10000);
}

/** Bot-specific env: inherits everything from host but overrides dangerous vars. */
function botEnv(ticketId: number): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PORT: String(botPort(ticketId)),
    // Prevent bots from accidentally stealing our DB / Discord creds
    // by clearing variables that only make sense for our own server.
    // (Users supply their own via .env inside the ZIP.)
    DISCORD_BOT_TOKEN: "",
    SESSION_SECRET: "",
    ADMIN_PASSWORD: "",
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

function runStartupProbe(
  cmd: string,
  args: string[],
  cwd: string,
  ticketId: number,
): Promise<StartupProbeResult> {
  return new Promise((resolve) => {
    let output = "";
    let settled = false;
    const child = spawn(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: botEnv(ticketId),
    });

    child.stdout?.on("data", (d: Buffer) => {
      output = tail(output + d.toString(), OUTPUT_TAIL_CHARS);
    });
    child.stderr?.on("data", (d: Buffer) => {
      output = tail(output + d.toString(), OUTPUT_TAIL_CHARS);
    });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ child, crashed: false, exitCode: null, output });
    }, STARTUP_PROBE_MS);

    child.once("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ child, crashed: true, exitCode: code, output });
    });

    child.once("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      output = tail(output + `\n${err.message}`, OUTPUT_TAIL_CHARS);
      resolve({ child, crashed: true, exitCode: null, output });
    });
  });
}

// Directories that are never a bot project root — skip them when searching.
const SKIP_DIRS = new Set([
  ".git", "node_modules", ".agents", ".local", ".cache", ".replit",
  "dist", "build", "__pycache__", ".venv", "venv", ".next", ".nuxt",
  "coverage", ".turbo", ".svelte-kit", "out", ".output",
]);

// Score a directory that contains package.json.
// Higher score = more likely to be the actual bot root.
function scorePackageDir(dir: string, pkg: Record<string, unknown>, depth: number): number {
  let score = 10 - depth; // prefer shallower
  const scripts = (pkg["scripts"] ?? {}) as Record<string, string>;
  if (typeof scripts["start"] === "string") score += 8;
  if (typeof scripts["dev"] === "string") score += 5;
  // Penalise obvious monorepo / tooling roots
  if (pkg["workspaces"]) score -= 6;
  if (typeof scripts["preinstall"] === "string" && scripts["preinstall"].includes("pnpm")) score -= 6;
  // Reward having recognisable entry files
  for (const f of ["index.js", "index.mjs", "bot.js", "main.js", "index.ts", "bot.ts"]) {
    if (fs.existsSync(path.join(dir, f))) { score += 3; break; }
  }
  return score;
}

interface ProjectCandidate { dir: string; pkg: Record<string, unknown>; score: number }

async function findProjectRoot(rootDir: string): Promise<{ dir: string; pkg: Record<string, unknown> } | null> {
  const candidates: ProjectCandidate[] = [];

  async function search(dir: string, depth: number): Promise<void> {
    if (depth > 5 || candidates.length > 30) return; // safety limits

    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const raw = await fsp.readFile(pkgPath, "utf-8");
        const pkg = JSON.parse(raw) as Record<string, unknown>;
        const score = scorePackageDir(dir, pkg, depth);
        candidates.push({ dir, pkg, score });
        // If this is clearly a monorepo root, keep searching inside it.
        // Otherwise stop — the first package.json found in a branch wins.
        if (!pkg["workspaces"] && score >= 8) return;
      } catch {
        // malformed package.json — ignore
      }
    }

    let entries: fs.Dirent[];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
      await search(path.join(dir, entry.name), depth + 1);
    }
  }

  await search(rootDir, 0);

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return { dir: best.dir, pkg: best.pkg };
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
  "app.js", "server.js", "src/index.js", "src/bot.js",
];

function resolveStartCommand(
  projectRoot: string,
  pkg: Record<string, unknown>,
  pm: PackageManager,
): StartCommand | { error: string } {
  const scripts = (pkg["scripts"] ?? {}) as Record<string, string>;

  for (const name of RUNNABLE_SCRIPTS) {
    if (typeof scripts[name] === "string") {
      return { cmd: pm, args: ["run", name], label: `${pm} run ${name}` };
    }
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

  const availableScripts = Object.keys(scripts);
  const hint = availableScripts.length > 0
    ? `Your package.json has these scripts: ${availableScripts.join(", ")}. Rename one to "start", or add "start": "node index.js".`
    : 'Your package.json has no scripts at all. Add "start": "node index.js" (or whichever file starts your bot).';

  return { error: `No way to start the bot was found. ${hint}` };
}

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

function attachSupervision(
  ticketId: number,
  child: ChildProcess,
  onCrash?: (info: { exitCode: number | null }) => void,
): void {
  setRunningProcess(ticketId, child);
  child.once("exit", (code) => {
    clearRunningProcess(ticketId);
    db.update(hostedBotsTable)
      .set({ status: "crashed", errorMessage: `Process exited with code ${code}.` })
      .where(eq(hostedBotsTable.ticketId, ticketId))
      .catch((err) => {
        logger.error({ err }, "Failed to update hosted bot status after crash");
      });
    onCrash?.({ exitCode: code });
  });
}

export async function hostUploadedZip(params: {
  ticketId: number;
  zipPath: string;
  fileName: string;
  onCrash?: (info: { exitCode: number | null }) => void;
}): Promise<HostResult> {
  const { ticketId, zipPath, fileName, onCrash } = params;

  stopProcess(ticketId);

  const extractRoot = ticketBotDir(ticketId);
  await fsp.rm(extractRoot, { recursive: true, force: true });
  await fsp.mkdir(extractRoot, { recursive: true });

  await updateHostedBot(ticketId, {
    fileName,
    extractPath: extractRoot,
    status: "installing",
    errorMessage: null,
  });

  try {
    await extract(zipPath, { dir: extractRoot });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return reportFailure(ticketId, fileName, "error", {
      message: "Could not extract the ZIP file.",
      detail: message,
    });
  }

  // Remove any Replit-platform files (artifact.toml, .replit, etc.) so the
  // platform never registers spurious workflows from the extracted ZIP contents.
  await stripPlatformFiles(extractRoot);
  logger.info({ ticketId }, "Platform files stripped from extracted ZIP");

  const found = await findProjectRoot(extractRoot);
  if (!found) {
    const message = "No package.json was found in the ZIP. Make sure your bot's package.json is included in the ZIP file.";
    return reportFailure(ticketId, fileName, "error", { message });
  }

  const { dir: projectRoot, pkg } = found;
  const pm = detectPackageManager(projectRoot, pkg);
  logger.info({ ticketId, projectRoot, pm }, "Bot project root detected");

  const startCommand = resolveStartCommand(projectRoot, pkg, pm);
  if ("error" in startCommand) {
    return reportFailure(ticketId, fileName, "error", { message: startCommand.error });
  }

  // Build the install args appropriate for each package manager.
  const installArgs =
    pm === "pnpm" ? ["install", "--no-frozen-lockfile"] :
    pm === "yarn" ? ["install", "--non-interactive"] :
    ["install", "--no-audit", "--no-fund"];

  const install = await runCommand(pm, installArgs, projectRoot, INSTALL_TIMEOUT_MS);

  if (!install.exitedCleanly) {
    return reportFailure(ticketId, fileName, "error", {
      message: "Dependency installation failed.",
      detail: install.output,
      startCommand: startCommand.label,
    });
  }

  // Store the actual project root (may be a subdirectory of extractRoot) so restarts work.
  await updateHostedBot(ticketId, {
    status: "starting",
    startCommand: startCommand.label,
    extractPath: projectRoot,
  });

  const probe = await runStartupProbe(startCommand.cmd, startCommand.args, projectRoot, ticketId);

  if (probe.crashed) {
    return reportFailure(ticketId, fileName, "crashed", {
      message: `The bot crashed on startup (exit code ${probe.exitCode ?? "unknown"}).`,
      detail: probe.output,
      startCommand: startCommand.label,
    });
  }

  attachSupervision(ticketId, probe.child, onCrash);
  await updateHostedBot(ticketId, {
    status: "running",
    errorMessage: null,
    aiExplanation: null,
    lastStartedAt: new Date(),
  });

  return {
    status: "running",
    message: "The bot installed cleanly and is now running.",
    startCommand: startCommand.label,
  };
}

export async function restartHostedBot(
  ticketId: number,
  onCrash?: (info: { exitCode: number | null }) => void,
): Promise<HostResult> {
  const [row] = await db
    .select()
    .from(hostedBotsTable)
    .where(eq(hostedBotsTable.ticketId, ticketId));

  if (!row || !row.extractPath || !row.startCommand) {
    return { status: "error", message: "No bot has been uploaded to this ticket yet." };
  }

  stopProcess(ticketId);

  const projectRoot = row.extractPath;
  if (!fs.existsSync(projectRoot)) {
    const message = "The previously extracted files are missing. Please re-upload the ZIP file.";
    return reportFailure(ticketId, row.fileName, "error", { message });
  }

  const [cmd, ...args] = row.startCommand.split(" ");
  const probe = await runStartupProbe(cmd!, args, projectRoot, ticketId);

  if (probe.crashed) {
    await updateHostedBot(ticketId, { restartCount: row.restartCount + 1 });
    return reportFailure(ticketId, row.fileName, "crashed", {
      message: `The bot crashed on restart (exit code ${probe.exitCode ?? "unknown"}).`,
      detail: probe.output,
    });
  }

  attachSupervision(ticketId, probe.child, onCrash);
  await updateHostedBot(ticketId, {
    status: "running",
    errorMessage: null,
    aiExplanation: null,
    lastStartedAt: new Date(),
    restartCount: row.restartCount + 1,
  });

  return { status: "running", message: "The bot was restarted and is now running." };
}

export async function getHostedBotStatus(ticketId: number) {
  const [row] = await db
    .select()
    .from(hostedBotsTable)
    .where(eq(hostedBotsTable.ticketId, ticketId));
  return row ?? null;
}

export async function resumeHostedBotsOnBoot(
  notify: (ticketId: number, result: HostResult) => void,
): Promise<void> {
  const rows = await db
    .select()
    .from(hostedBotsTable)
    .where(eq(hostedBotsTable.status, "running"));

  for (const row of rows) {
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
