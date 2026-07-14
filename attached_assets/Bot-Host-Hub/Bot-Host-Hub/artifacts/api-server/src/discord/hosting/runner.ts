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

export const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50MB
const INSTALL_TIMEOUT_MS = 3 * 60 * 1000;
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

function runStartupProbe(
  cmd: string,
  args: string[],
  cwd: string,
): Promise<StartupProbeResult> {
  return new Promise((resolve) => {
    let output = "";
    let settled = false;
    const child = spawn(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
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

async function findProjectRoot(rootDir: string): Promise<string | null> {
  if (fs.existsSync(path.join(rootDir, "package.json"))) {
    return rootDir;
  }
  const entries = await fsp.readdir(rootDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());
  for (const dir of dirs) {
    const candidate = path.join(rootDir, dir.name);
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      return candidate;
    }
  }
  return null;
}

interface StartCommand {
  cmd: string;
  args: string[];
  label: string;
}

function resolveStartCommand(
  projectRoot: string,
  pkg: Record<string, unknown>,
): StartCommand | { error: string } {
  const scripts = pkg["scripts"] as Record<string, string> | undefined;
  if (scripts && typeof scripts["start"] === "string") {
    return { cmd: "npm", args: ["run", "start"], label: "npm run start" };
  }

  const main = typeof pkg["main"] === "string" ? pkg["main"] : null;
  if (main && fs.existsSync(path.join(projectRoot, main))) {
    return { cmd: "node", args: [main], label: `node ${main}` };
  }

  for (const candidate of ["index.js", "index.mjs", "index.cjs", "bot.js", "main.js"]) {
    if (fs.existsSync(path.join(projectRoot, candidate))) {
      return { cmd: "node", args: [candidate], label: `node ${candidate}` };
    }
  }

  return {
    error:
      'No way to start the bot was found. Add a "start" script or a "main" field to package.json, or include an index.js file.',
  };
}

async function updateHostedBot(
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

  const projectRoot = await findProjectRoot(extractRoot);
  if (!projectRoot) {
    const message = "No package.json was found in the ZIP (checked the root and one level deep).";
    return reportFailure(ticketId, fileName, "error", { message });
  }

  let pkg: Record<string, unknown>;
  try {
    const raw = await fsp.readFile(path.join(projectRoot, "package.json"), "utf-8");
    pkg = JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    const message = `package.json is not valid JSON: ${err instanceof Error ? err.message : String(err)}`;
    return reportFailure(ticketId, fileName, "error", { message });
  }

  const startCommand = resolveStartCommand(projectRoot, pkg);
  if ("error" in startCommand) {
    return reportFailure(ticketId, fileName, "error", { message: startCommand.error });
  }

  const install = await runCommand(
    "npm",
    ["install", "--no-audit", "--no-fund"],
    projectRoot,
    INSTALL_TIMEOUT_MS,
  );

  if (!install.exitedCleanly) {
    return reportFailure(ticketId, fileName, "error", {
      message: "Dependency installation failed.",
      detail: install.output,
      startCommand: startCommand.label,
    });
  }

  await updateHostedBot(ticketId, { status: "starting", startCommand: startCommand.label });

  const probe = await runStartupProbe(startCommand.cmd, startCommand.args, projectRoot);

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

  const projectRoot = await findProjectRoot(row.extractPath);
  if (!projectRoot) {
    const message = "The previously extracted files are missing. Please re-upload the ZIP file.";
    return reportFailure(ticketId, row.fileName, "error", { message });
  }

  const [cmd, ...args] = row.startCommand.split(" ");
  const probe = await runStartupProbe(cmd!, args, projectRoot);

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
