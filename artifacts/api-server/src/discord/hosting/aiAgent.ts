/**
 * Lumora Autonomous Deployment Agent
 *
 * A fully autonomous, multi-turn AI agent that handles the entire deployment
 * lifecycle: project analysis, code fixes, dependency installation, and
 * readiness validation — without any user input.
 *
 * Used in two phases:
 *   - pre_launch: runs BEFORE the first startup probe to catch and fix issues early
 *   - post_crash: runs AFTER a crash to diagnose and repair the bot
 *
 * Security: env var VALUES are never sent to the AI. Only variable NAMES are
 * included in context so the agent knows what secrets are configured.
 */

import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { execSync } from "node:child_process";
import { logger } from "../../lib/logger";
import type { BotLanguage } from "./runner";
import { appendLiveLog, getLiveLog } from "./processManager";
import { buildFileTree, loadKnowledge } from "./aiRepair";

// ─── Config ───────────────────────────────────────────────────────────────────

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env["OPENROUTER_MODEL"] || "openai/gpt-4o-mini";

/** Max tool-call rounds per agent session. Keeps latency bounded. */
const MAX_AGENT_TURNS = 12;

/** Max chars from any single file read (keeps prompt size reasonable). */
const MAX_FILE_READ_CHARS = 6000;

/** Max chars from log reads. */
const MAX_LOG_READ_CHARS = 3000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentContext {
  ticketId: number;
  /** Isolated tmp run directory — where we actually run the bot. */
  projectRoot: string;
  /** Persistent storage directory — changes here survive server restarts. */
  persistentDir: string;
  language: BotLanguage;
  fileName: string;
  /** Environment variable NAMES only — no values sent to AI. */
  userVarNames: string[];
}

export interface AgentResult {
  /** Human-readable descriptions of each change applied. */
  appliedFixes: string[];
  /** Customer-facing explanation of the outcome. */
  friendlyMessage: string;
  /** True when a human must act (wrong token, logic bug, etc.). */
  requiresUserAction: boolean;
  userActionMessage?: string;
  /** New start command if the agent determined a different one. */
  startCommand?: string;
}

/** Intermediate flag set when the agent calls mark_done. */
interface DoneSignal {
  success: boolean;
  message: string;
  requiresUserAction: boolean;
  userActionMessage?: string;
  startCommand?: string;
}

// ─── Tool definitions (OpenAI function-calling format) ────────────────────────

const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List files and directories in the bot project. Start here to understand the project structure.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative directory path. Use '' or '.' for project root." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the content of any source file. Use to inspect code, config, requirements, etc.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path (e.g. 'index.js', 'src/bot.py')." },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write or overwrite a file with complete content. Always write the ENTIRE file — never a partial snippet. Applied to both run dir and persistent storage.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path to write (e.g. 'index.js', 'src/bot.py')." },
          content: { type: "string", description: "Full file content to write." },
          reason: { type: "string", description: "Short description of what this fix does (shown in the console)." },
        },
        required: ["path", "content", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_files",
      description: "Search for a text pattern across all source files. Useful for finding where a token is referenced, where an import is broken, etc.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Text string or simple regex pattern to search for." },
          path: { type: "string", description: "Directory to search within. Defaults to project root." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "install_dependencies",
      description: "Install a missing npm or pip package that the bot requires. Only use for packages clearly needed by the project.",
      parameters: {
        type: "object",
        properties: {
          package: { type: "string", description: "Package name to install (e.g. 'discord.js', 'dotenv', 'discord.py')." },
          runtime: { type: "string", enum: ["node", "python"], description: "Runtime to install for. Defaults to the project's detected language." },
        },
        required: ["package"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_logs",
      description: "Read the bot's latest runtime logs / crash output.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_start_command",
      description: "Override the bot's start command if the auto-detected one is wrong (e.g. the main file is not index.js, or the project needs 'node dist/index.js').",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "Full start command (e.g. 'node dist/index.js', 'python bot.py', 'node --experimental-vm-modules src/main.mjs')." },
          reason: { type: "string", description: "Why this command is correct." },
        },
        required: ["command", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_done",
      description: "Signal that the agent has finished its analysis and repairs. Call this once all fixes are applied and the bot is ready to start (or when no further automated fix is possible).",
      parameters: {
        type: "object",
        properties: {
          success: { type: "boolean", description: "True if the bot should be attempted — fixes were applied or the project looks healthy. False if no safe automated fix is possible." },
          message: { type: "string", description: "Customer-friendly summary of what was found and what was done (2-4 sentences). Never mention secrets or file paths." },
          requires_user_action: { type: "boolean", description: "True if the user must do something manually (wrong token, missing intents, logic bug, etc.)." },
          user_action_message: { type: "string", description: "What the user must do, if anything. Omit if not needed." },
        },
        required: ["success", "message"],
      },
    },
  },
] as const;

// ─── Path helpers ─────────────────────────────────────────────────────────────

const SKIP_SEARCH_DIRS = new Set([
  "node_modules", ".git", "__pycache__", ".venv", "venv",
  "dist", "build", ".next", "coverage", "out", ".output",
]);

function safeRelPath(relPath: string): string | null {
  const normalized = path.normalize(relPath.replace(/^\/+/, ""));
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) return null;
  return normalized;
}

// ─── Tool executor ────────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AgentContext,
  doneSignalRef: { value: DoneSignal | null },
): Promise<string> {
  try {
    // ── list_files ────────────────────────────────────────────────────────
    if (name === "list_files") {
      const relDir = String(args["path"] ?? "").replace(/^\/+/, "") || ".";
      const absDir = relDir === "." ? ctx.projectRoot : path.join(ctx.projectRoot, relDir);

      if (!absDir.startsWith(ctx.projectRoot)) return "Error: path is outside project.";

      let entries: fs.Dirent[];
      try {
        entries = await fsp.readdir(absDir, { withFileTypes: true });
      } catch {
        return `Directory not found: ${relDir}`;
      }

      entries.sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      const lines = entries
        .filter((e) => !SKIP_SEARCH_DIRS.has(e.name))
        .map((e) => (e.isDirectory() ? `📁 ${e.name}/` : `📄 ${e.name}`));

      return lines.length > 0 ? lines.join("\n") : "(empty directory)";
    }

    // ── read_file ─────────────────────────────────────────────────────────
    if (name === "read_file") {
      const relPath = safeRelPath(String(args["path"] ?? ""));
      if (!relPath) return "Error: invalid path.";

      const absPath = path.join(ctx.projectRoot, relPath);
      if (!absPath.startsWith(ctx.projectRoot)) return "Error: path is outside project.";

      try {
        const raw = await fsp.readFile(absPath, "utf-8");
        const preview = raw.slice(0, MAX_FILE_READ_CHARS);
        const truncated = raw.length > MAX_FILE_READ_CHARS
          ? `\n... (${raw.length - MAX_FILE_READ_CHARS} chars truncated)`
          : "";
        return `\`\`\`\n${preview}${truncated}\n\`\`\``;
      } catch {
        return `File not found: ${relPath}`;
      }
    }

    // ── write_file ────────────────────────────────────────────────────────
    if (name === "write_file") {
      const relPath = safeRelPath(String(args["path"] ?? ""));
      const content = String(args["content"] ?? "");
      const reason = String(args["reason"] ?? "file updated");

      if (!relPath) return "Error: invalid path.";

      const absTmp = path.join(ctx.projectRoot, relPath);
      const absPersist = path.join(ctx.persistentDir, relPath);

      if (!absTmp.startsWith(ctx.projectRoot)) return "Error: path is outside project.";

      // Write to both run dir and persistent dir
      await fsp.mkdir(path.dirname(absTmp), { recursive: true });
      await fsp.writeFile(absTmp, content, "utf-8");

      try {
        await fsp.mkdir(path.dirname(absPersist), { recursive: true });
        await fsp.writeFile(absPersist, content, "utf-8");
      } catch {
        // Persistent write failure is non-fatal
      }

      appendLiveLog(ctx.ticketId, `[Lumora AI] Fixed: ${reason} (${relPath})\n`);
      logger.info({ ticketId: ctx.ticketId, relPath, reason }, "AI agent wrote file");
      return `✓ Wrote ${relPath} — ${reason}`;
    }

    // ── search_files ──────────────────────────────────────────────────────
    if (name === "search_files") {
      const query = String(args["query"] ?? "");
      const searchDir = safeRelPath(String(args["path"] ?? "") || ".") ?? ".";
      const absDir = searchDir === "." ? ctx.projectRoot : path.join(ctx.projectRoot, searchDir);

      if (!query) return "Error: query is required.";
      if (!absDir.startsWith(ctx.projectRoot)) return "Error: path is outside project.";

      const results: string[] = [];

      async function walk(dir: string): Promise<void> {
        let entries: fs.Dirent[];
        try { entries = await fsp.readdir(dir, { withFileTypes: true }); }
        catch { return; }

        for (const entry of entries) {
          if (SKIP_SEARCH_DIRS.has(entry.name)) continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(full);
          } else if (entry.isFile()) {
            try {
              const text = await fsp.readFile(full, "utf-8");
              const lines = text.split("\n");
              const rel = path.relative(ctx.projectRoot, full);
              let matchCount = 0;
              lines.forEach((line, i) => {
                if (results.length >= 30 || matchCount >= 3) return;
                if (line.includes(query)) {
                  results.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
                  matchCount++;
                }
              });
            } catch { /* binary or unreadable */ }
          }
        }
      }

      await walk(absDir);
      return results.length > 0
        ? results.join("\n")
        : `No matches found for "${query}"`;
    }

    // ── install_dependencies ──────────────────────────────────────────────
    if (name === "install_dependencies") {
      const pkg = String(args["package"] ?? "").trim();
      const runtime = String(args["runtime"] ?? ctx.language);

      if (!pkg) return "Error: package name is required.";

      // Validate package name (prevent command injection)
      if (!/^[@a-zA-Z0-9._/-]+$/.test(pkg)) {
        return `Error: "${pkg}" is not a valid package name.`;
      }

      appendLiveLog(ctx.ticketId, `[Lumora AI] Installing ${pkg}…\n`);
      logger.info({ ticketId: ctx.ticketId, pkg, runtime }, "AI agent installing package");

      try {
        if (runtime === "python") {
          execSync(
            `python3 -m pip install --no-input --disable-pip-version-check ${pkg}`,
            { cwd: ctx.projectRoot, timeout: 120_000, stdio: "pipe" },
          );
        } else {
          execSync(
            `npm install --no-audit --no-fund ${pkg}`,
            { cwd: ctx.projectRoot, timeout: 120_000, stdio: "pipe" },
          );
        }
        appendLiveLog(ctx.ticketId, `[Lumora AI] Installed ${pkg} ✓\n`);
        return `✓ Installed ${pkg}`;
      } catch (err: any) {
        const msg = err?.stderr?.toString?.()?.slice(0, 300) ?? String(err);
        return `Failed to install ${pkg}: ${msg}`;
      }
    }

    // ── read_logs ─────────────────────────────────────────────────────────
    if (name === "read_logs") {
      const log = getLiveLog(ctx.ticketId);
      if (!log) return "(no logs yet)";
      const recent = log.slice(-MAX_LOG_READ_CHARS);
      return `\`\`\`\n${recent}\n\`\`\``;
    }

    // ── set_start_command ─────────────────────────────────────────────────
    if (name === "set_start_command") {
      const command = String(args["command"] ?? "").trim();
      const reason = String(args["reason"] ?? "");
      if (!command) return "Error: command is required.";

      // Store in the done signal — the runner picks it up from AgentResult
      if (!doneSignalRef.value) {
        // Store temporarily so mark_done can include it
        (ctx as any).__pendingStartCommand = command;
      }
      appendLiveLog(ctx.ticketId, `[Lumora AI] Start command set to: ${command} — ${reason}\n`);
      return `✓ Start command set to: ${command}`;
    }

    // ── mark_done ─────────────────────────────────────────────────────────
    if (name === "mark_done") {
      const success = Boolean(args["success"] ?? true);
      const message = String(args["message"] ?? "Analysis complete.");
      const requiresUserAction = Boolean(args["requires_user_action"] ?? false);
      const userActionMessage = args["user_action_message"]
        ? String(args["user_action_message"])
        : undefined;
      const startCommand = (ctx as any).__pendingStartCommand as string | undefined;

      doneSignalRef.value = { success, message, requiresUserAction, userActionMessage, startCommand };
      return "✓ Done signal recorded.";
    }

    return `Unknown tool: ${name}`;
  } catch (err: any) {
    logger.error({ err, tool: name, ticketId: ctx.ticketId }, "Agent tool execution failed");
    return `Error in ${name}: ${err?.message ?? "unknown error"}`;
  }
}

// ─── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(
  mode: "pre_launch" | "post_crash",
  ctx: AgentContext,
  fileTree: string,
  pkg: Record<string, unknown> | null,
  knowledge: string,
  crashLogs: string | undefined,
  attemptNumber: number,
): string {
  const lang = ctx.language === "node" ? "Node.js" : ctx.language === "python" ? "Python" : "Java";
  const configuredVars = ctx.userVarNames.length > 0
    ? `Configured env vars (names only): ${ctx.userVarNames.join(", ")}`
    : "No environment variables configured by the user.";

  const pkgSection = pkg
    ? `## package.json\n\`\`\`json\n${JSON.stringify(pkg, null, 2).slice(0, 2000)}\n\`\`\``
    : "";

  const treeSection = `## Project File Tree\n\`\`\`\n${fileTree.slice(0, 2000)}\n\`\`\``;

  const crashSection = crashLogs
    ? `## Crash Output\n\`\`\`\n${crashLogs.slice(-3000)}\n\`\`\``
    : "";

  const modeInstructions = mode === "pre_launch"
    ? `## Your Mission (Pre-Launch Analysis)
You are the FIRST line of defence before the bot starts for the first time.
Your job: analyze the project, detect and fix any issues, then call mark_done.

Workflow:
1. Call list_files to understand the project structure.
2. Read the main entry file and any config files.
3. Search for common issues (missing start script, wrong imports, missing deps).
4. Apply fixes with write_file, install_dependencies, or set_start_command.
5. Call mark_done when all fixes are applied (or when no safe automated fix is possible).

Common issues to check:
- Missing or wrong scripts.start in package.json → fix with write_file
- Wrong entry file in scripts.start (file does not exist) → find real entry, update scripts.start
- workspace:* or catalog: dependencies → rewrite them to actual version numbers or remove
- Missing required packages (discord.js, dotenv, etc.) → install_dependencies
- TypeScript project without build step → add/fix tsconfig.json, add build script
- Python bot with missing requirements.txt → create it with write_file
- Missing DISCORD_BOT_TOKEN usage → check if token env var is read from a non-standard name
- Wrong/missing .env file references when using dotenv

Be decisive and apply fixes. Do NOT just explain — actually fix.`
    : `## Your Mission (Crash Repair — Attempt ${attemptNumber})
The bot crashed. Diagnose the root cause from the crash output and source code, then apply a fix.

Workflow:
1. Analyze the crash output carefully — what specific error caused the crash?
2. Use read_file to inspect the source file(s) referenced in the stack trace.
3. Apply a targeted fix with write_file.
4. If a package is missing, use install_dependencies.
5. Call mark_done when the fix is applied (or when no safe fix is possible).

Focus on the SPECIFIC error — do not rewrite the whole bot. Apply the minimum change needed.

If the crash is caused by:
- Missing module → install it
- Syntax error → fix it in write_file
- Wrong env var name for the Discord token → use search_files to find where token is read
- Intents not enabled / bad token → mark_done with requires_user_action=true
- Logic/runtime error in the bot code → fix it with write_file`;

  return [
    `You are Lumora Autonomous Deployment Agent — an expert ${lang} Discord bot deployment engineer.`,
    `Bot file: ${ctx.fileName}`,
    configuredVars,
    "",
    knowledge,
    "",
    treeSection,
    pkgSection,
    crashSection,
    "",
    modeInstructions,
    "",
    "## Rules",
    "- Be autonomous: call tools, make fixes, do not ask questions.",
    "- Always write COMPLETE file content in write_file — never a partial snippet.",
    "- Never expose or mention secret values (tokens, API keys) even if you see them in code.",
    "- After applying all fixes, always call mark_done to signal completion.",
    "- If requires_user_action=true (bad token, gateway intents, logic bugs), set it in mark_done.",
    "- Keep mark_done message customer-friendly: no jargon, no file paths, no secret values.",
  ]
    .filter((l) => l !== undefined && l !== null)
    .join("\n");
}

// ─── OpenRouter call ─────────────────────────────────────────────────────────

type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

async function callOpenRouter(
  apiKey: string,
  messages: ChatMessage[],
  withTools: boolean,
): Promise<{ content: string | null; toolCalls: ToolCall[] } | null> {
  try {
    const body: Record<string, unknown> = {
      model: MODEL,
      messages,
      temperature: 0.1,
      max_tokens: 1500,
    };
    if (withTools) {
      body["tools"] = AGENT_TOOLS;
      body["tool_choice"] = "auto";
    }

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://lumora.host",
        "X-Title": "Lumora Deployment Agent",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      logger.error({ status: res.status }, "OpenRouter agent call failed");
      return null;
    }

    const data = (await res.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: ToolCall[];
        };
      }>;
    };

    const msg = data.choices?.[0]?.message;
    return {
      content: msg?.content ?? null,
      toolCalls: msg?.tool_calls ?? [],
    };
  } catch (err) {
    logger.error({ err }, "Failed to call OpenRouter for agent");
    return null;
  }
}

// ─── Main agent loop ─────────────────────────────────────────────────────────

/**
 * Runs the autonomous deployment agent. Returns a repair result the runner
 * can act on — the agent itself never starts or stops the bot.
 *
 * @param mode  "pre_launch" — before first probe; "post_crash" — after crash.
 */
export async function runAutonomousAgent(params: {
  context: AgentContext;
  mode: "pre_launch" | "post_crash";
  crashLogs?: string;
  pkg: Record<string, unknown> | null;
  attemptNumber?: number;
  /** Optional per-user OpenRouter key (from bot env vars); used when system key is absent. */
  userApiKey?: string;
}): Promise<AgentResult> {
  const { context: ctx, mode, crashLogs, pkg, attemptNumber = 1, userApiKey } = params;

  const apiKey = process.env["OPENROUTER_API_KEY"] || userApiKey || "";
  if (!apiKey) {
    // Fall back gracefully — no AI configured
    return {
      appliedFixes: [],
      friendlyMessage: "AI deployment agent is not configured. Add your OpenRouter API key in Files → AI Settings.",
      requiresUserAction: false,
    };
  }

  appendLiveLog(
    ctx.ticketId,
    mode === "pre_launch"
      ? "[Lumora AI] Starting pre-launch analysis…\n"
      : `[Lumora AI] Starting crash analysis (attempt ${attemptNumber})…\n`,
  );

  // Build initial context
  const [knowledge, fileTree] = await Promise.all([
    loadKnowledge(),
    buildFileTree(ctx.projectRoot, 4),
  ]);

  const systemPrompt = buildSystemPrompt(
    mode, ctx, fileTree, pkg, knowledge, crashLogs, attemptNumber,
  );

  const userTrigger =
    mode === "pre_launch"
      ? "Analyze this bot project. Detect and fix any deployment issues, then call mark_done."
      : "The bot crashed. Diagnose the root cause and apply a fix, then call mark_done.";

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userTrigger },
  ];

  const appliedFixes: string[] = [];
  const doneSignalRef: { value: DoneSignal | null } = { value: null };

  for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
    const response = await callOpenRouter(apiKey, messages, true);

    if (!response) {
      // API failure — stop and report
      break;
    }

    const { content, toolCalls } = response;

    // Add assistant message to history
    if (content || toolCalls.length > 0) {
      messages.push({
        role: "assistant",
        content: content ?? null,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      } as ChatMessage);
    }

    // No tool calls → agent finished its reasoning (shouldn't happen before mark_done)
    if (toolCalls.length === 0) break;

    // Execute all tool calls in this round
    const toolResultMessages: ChatMessage[] = [];

    for (const tc of toolCalls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.function.arguments) as Record<string, unknown>; }
      catch { /* ignore */ }

      const result = await executeTool(tc.function.name, args, ctx, doneSignalRef);

      // Track meaningful writes as applied fixes
      if (tc.function.name === "write_file" && result.startsWith("✓")) {
        const reason = (args["reason"] as string | undefined) ?? tc.function.name;
        appliedFixes.push(reason);
      }
      if (tc.function.name === "install_dependencies" && result.startsWith("✓")) {
        appliedFixes.push(`Installed package: ${args["package"]}`);
      }
      if (tc.function.name === "set_start_command" && result.startsWith("✓")) {
        appliedFixes.push(`Set start command: ${args["command"]}`);
      }

      toolResultMessages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: result,
      });

      // If agent signalled done, stop executing further tools
      if (doneSignalRef.value) break;
    }

    // Feed results back
    messages.push(...toolResultMessages);

    // Agent called mark_done — we're done
    if (doneSignalRef.value) break;
  }

  // Build result from done signal (or fallback if agent didn't call mark_done)
  const done = doneSignalRef.value;

  if (!done) {
    // Agent ran out of turns or errored without calling mark_done
    appendLiveLog(
      ctx.ticketId,
      appliedFixes.length > 0
        ? `[Lumora AI] Analysis complete — applied ${appliedFixes.length} fix(es).\n`
        : "[Lumora AI] Analysis complete — no automated fixes needed.\n",
    );

    return {
      appliedFixes,
      friendlyMessage:
        appliedFixes.length > 0
          ? `Lumora AI applied ${appliedFixes.length} fix(es) automatically.`
          : "Lumora AI analyzed the project — no issues were found or automated fixes are available.",
      requiresUserAction: false,
    };
  }

  if (done.requiresUserAction && done.userActionMessage) {
    appendLiveLog(ctx.ticketId, `[Lumora AI] Action needed: ${done.userActionMessage}\n`);
  } else if (!done.success) {
    appendLiveLog(ctx.ticketId, "[Lumora AI] No automated fix available for this error.\n");
  } else {
    appendLiveLog(
      ctx.ticketId,
      appliedFixes.length > 0
        ? `[Lumora AI] Applied ${appliedFixes.length} fix(es) — proceeding with deployment.\n`
        : "[Lumora AI] Project looks healthy — proceeding with deployment.\n",
    );
  }

  return {
    appliedFixes,
    friendlyMessage: done.message,
    requiresUserAction: done.requiresUserAction,
    userActionMessage: done.userActionMessage,
    startCommand: done.startCommand,
  };
}
