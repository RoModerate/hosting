import type { HostResult } from "./hosting/runner";

export function formatResultMessage(result: HostResult, prefix?: string): string {
  const heading = prefix ? `${prefix}: ${result.message}` : result.message;
  const parts = [heading];

  if (result.startCommand && result.status === "running") {
    parts.push(`Start command: ${result.startCommand}`);
  }

  if (result.detail && result.status !== "running") {
    parts.push("", "```", result.detail.slice(0, 1500), "```");
  }

  if (result.aiExplanation && result.status !== "running") {
    parts.push("", "Likely cause:", result.aiExplanation);
  }

  return parts.join("\n");
}
