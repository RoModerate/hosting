import type { ChildProcess } from "node:child_process";

interface RunningProcess {
  child: ChildProcess;
  startedAt: Date;
}

const runningProcesses = new Map<number, RunningProcess>();

export function setRunningProcess(ticketId: number, child: ChildProcess): void {
  runningProcesses.set(ticketId, { child, startedAt: new Date() });
}

export function getRunningProcess(ticketId: number): RunningProcess | undefined {
  return runningProcesses.get(ticketId);
}

export function isRunning(ticketId: number): boolean {
  const proc = runningProcesses.get(ticketId);
  return Boolean(proc) && proc!.child.exitCode === null && !proc!.child.killed;
}

export function stopProcess(ticketId: number): void {
  const proc = runningProcesses.get(ticketId);
  if (proc && proc.child.exitCode === null && !proc.child.killed) {
    proc.child.kill("SIGTERM");
  }
  runningProcesses.delete(ticketId);
}

export function clearRunningProcess(ticketId: number): void {
  runningProcesses.delete(ticketId);
}
