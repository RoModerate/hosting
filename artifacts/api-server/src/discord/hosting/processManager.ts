import type { ChildProcess } from "node:child_process";

interface RunningProcess {
  child: ChildProcess;
  startedAt: Date;
}

const runningProcesses = new Map<number, RunningProcess>();

// Set right before we deliberately kill a bot (manual stop/restart/redeploy)
// so the exit handler in runner.ts can tell the difference between "we did
// this on purpose" and "the bot crashed on its own" — only the latter should
// trigger auto-restart.
const intentionalStops = new Set<number>();

// Rolling tail of live stdout/stderr per ticket, independent of what gets
// persisted to the DB. Capped so a chatty bot can't leak memory.
const LOG_BUFFER_MAX = 12_000;
const liveLogs = new Map<number, string>();

// Auto-restart bookkeeping: how many times we've auto-restarted a bot inside
// its current crash-loop window, and the timer for "stability reset".
const restartAttempts = new Map<number, number>();
const stabilityTimers = new Map<number, NodeJS.Timeout>();

// Pending scheduled restart timeouts — cancelled when Stop is called so a
// queued auto-restart can't fire after the user explicitly stops the bot.
const pendingRestartTimers = new Map<number, NodeJS.Timeout>();

export function schedulePendingRestart(ticketId: number, fn: () => void, delayMs: number): void {
  cancelPendingRestart(ticketId);
  const t = setTimeout(() => {
    pendingRestartTimers.delete(ticketId);
    fn();
  }, delayMs);
  pendingRestartTimers.set(ticketId, t);
}

export function cancelPendingRestart(ticketId: number): void {
  const t = pendingRestartTimers.get(ticketId);
  if (t) {
    clearTimeout(t);
    pendingRestartTimers.delete(ticketId);
  }
}

export function setRunningProcess(ticketId: number, child: ChildProcess): void {
  runningProcesses.set(ticketId, { child, startedAt: new Date() });
}

export function getRunningProcess(ticketId: number): RunningProcess | undefined {
  return runningProcesses.get(ticketId);
}

/** True only if we have a handle AND the OS process is actually still alive. */
export function isRunning(ticketId: number): boolean {
  const proc = runningProcesses.get(ticketId);
  if (!proc) return false;
  if (proc.child.exitCode !== null || proc.child.killed) return false;
  // child.exitCode/killed can lag briefly; double check the PID is real.
  if (typeof proc.child.pid !== "number") return false;
  try {
    // Signal 0 does not kill anything — it just checks the PID exists.
    process.kill(proc.child.pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function getPid(ticketId: number): number | undefined {
  return runningProcesses.get(ticketId)?.child.pid;
}

export function stopProcess(ticketId: number): void {
  const proc = runningProcesses.get(ticketId);
  if (proc && proc.child.exitCode === null && !proc.child.killed) {
    intentionalStops.add(ticketId);
    // Hard-kill immediately — Discord bots don't need graceful shutdown,
    // and users expect the stop to take effect at once.
    proc.child.kill("SIGKILL");
  }
  runningProcesses.delete(ticketId);
  clearStabilityTimer(ticketId);
  // Cancel any queued auto-restart so it can't fire after an explicit stop.
  cancelPendingRestart(ticketId);
}

export function clearRunningProcess(ticketId: number): void {
  runningProcesses.delete(ticketId);
}

/** Consumes (and clears) the "this exit was intentional" flag for a ticket. */
export function consumeIntentionalStop(ticketId: number): boolean {
  const was = intentionalStops.has(ticketId);
  intentionalStops.delete(ticketId);
  return was;
}

export function appendLiveLog(ticketId: number, chunk: string): void {
  const existing = liveLogs.get(ticketId) ?? "";
  const next = existing + chunk;
  liveLogs.set(
    ticketId,
    next.length > LOG_BUFFER_MAX ? next.slice(next.length - LOG_BUFFER_MAX) : next,
  );
}

export function getLiveLog(ticketId: number): string {
  return liveLogs.get(ticketId) ?? "";
}

export function clearLiveLog(ticketId: number): void {
  liveLogs.delete(ticketId);
}

const MAX_AUTO_RESTARTS = 5;

/** Returns true (and increments the counter) if another auto-restart attempt is allowed. */
export function tryConsumeAutoRestartAttempt(ticketId: number): boolean {
  const attempts = restartAttempts.get(ticketId) ?? 0;
  if (attempts >= MAX_AUTO_RESTARTS) return false;
  restartAttempts.set(ticketId, attempts + 1);
  return true;
}

export function getAutoRestartAttempts(ticketId: number): number {
  return restartAttempts.get(ticketId) ?? 0;
}

export function resetAutoRestartAttempts(ticketId: number): void {
  restartAttempts.delete(ticketId);
}

function clearStabilityTimer(ticketId: number): void {
  const timer = stabilityTimers.get(ticketId);
  if (timer) {
    clearTimeout(timer);
    stabilityTimers.delete(ticketId);
  }
}

/**
 * Call after a (re)start succeeds. If the process is still alive after
 * `stableAfterMs`, we consider the crash loop over and reset the attempt
 * counter so a bot that's been healthy for a while gets the full retry
 * budget again if it crashes later.
 */
export function armStabilityReset(ticketId: number, stableAfterMs = 300_000): void {
  clearStabilityTimer(ticketId);
  const timer = setTimeout(() => {
    if (isRunning(ticketId)) {
      resetAutoRestartAttempts(ticketId);
    }
    stabilityTimers.delete(ticketId);
  }, stableAfterMs);
  stabilityTimers.set(ticketId, timer);
}

/** All ticket IDs we currently believe have a live process handle. */
export function listTrackedTicketIds(): number[] {
  return Array.from(runningProcesses.keys());
}

// ─── Manual restart cooldown ──────────────────────────────────────────────────
// Prevents users from spamming the restart button and creating an artificial
// crash-loop. Each successful manual restart sets a cooldown; auto-restarts
// and the initial deploy are exempt.

const RESTART_COOLDOWN_MS = 20_000; // 20 seconds
const lastManualRestartAt = new Map<number, number>();

/**
 * Checks whether a manual restart is allowed for the given ticket.
 * If allowed, records the current time so future calls respect the cooldown.
 * Returns { allowed: true } or { allowed: false, remainingSec: N }.
 */
export function checkAndSetRestartCooldown(
  ticketId: number,
): { allowed: boolean; remainingSec: number } {
  const last = lastManualRestartAt.get(ticketId) ?? 0;
  const elapsed = Date.now() - last;
  if (elapsed < RESTART_COOLDOWN_MS) {
    const remaining = Math.ceil((RESTART_COOLDOWN_MS - elapsed) / 1000);
    return { allowed: false, remainingSec: remaining };
  }
  lastManualRestartAt.set(ticketId, Date.now());
  return { allowed: true, remainingSec: 0 };
}

/** Clears the cooldown for a ticket (e.g. when the bot is stopped). */
export function clearRestartCooldown(ticketId: number): void {
  lastManualRestartAt.delete(ticketId);
}
