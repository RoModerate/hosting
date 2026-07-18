import { Router, type IRouter } from "express";
import { clearSessionCookie, resolveSession } from "../lib/session";
import { getLiveLog } from "../discord/hosting/processManager";
import { getHostedBotStatus, restartHostedBot, updateHostedBot } from "../discord/hosting/runner";
import {
  writeFileContent,
  readFileContent,
  listDirectory,
  deletePath,
  FileManagerSecurityError,
  FileManagerError,
} from "../discord/hosting/fileManager";
import { logger } from "../lib/logger";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

const router: IRouter = Router();

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env["OPENROUTER_MODEL"] || "openai/gpt-4o-mini";

// ─── In-memory undo stack per ticket ─────────────────────────────────────────

const undoStack = new Map<number, Array<{ path: string; content: string }>>();

function pushUndo(ticketId: number, filePath: string, content: string) {
  if (!undoStack.has(ticketId)) undoStack.set(ticketId, []);
  const stack = undoStack.get(ticketId)!;
  stack.push({ path: filePath, content });
  if (stack.length > 20) stack.shift();
}

function popUndo(ticketId: number): { path: string; content: string } | null {
  const stack = undoStack.get(ticketId);
  if (!stack || stack.length === 0) return null;
  return stack.pop()!;
}

// ─── Repair history ───────────────────────────────────────────────────────────

interface RepairEntry {
  timestamp: string;
  action: string;
  description: string;
}

async function appendRepairHistory(ticketId: number, entry: RepairEntry): Promise<void> {
  try {
    const { db: dbI, hostedBotsTable: tbl } = await import("@workspace/db");
    const { eq: eqI } = await import("drizzle-orm");
    const [row] = await dbI
      .select({ repairLog: tbl.repairLog })
      .from(tbl)
      .where(eqI(tbl.ticketId, ticketId));
    const existing: RepairEntry[] = JSON.parse(row?.repairLog ?? "[]");
    existing.push(entry);
    await dbI
      .update(tbl)
      .set({ repairLog: JSON.stringify(existing.slice(-50)) })
      .where(eqI(tbl.ticketId, ticketId));
  } catch { /* non-fatal */ }
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "view_logs",
      description:
        "View the bot's recent stdout/stderr output. Use this FIRST when diagnosing a crash or unexpected behaviour.",
      parameters: {
        type: "object",
        properties: {
          lines: { type: "number", description: "Number of recent lines to return (default 80)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_status",
      description:
        "Get the current bot deployment status, error messages, restart count, and bot name. Use after restarting to confirm the bot came online.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List files and directories in the user's bot project.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory to list. Use '' or '.' for project root." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the current content of a file in the bot project.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative file path to read." },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_files",
      description:
        "Grep for a text pattern across all bot source files. Use to find where a variable is used, locate an import, etc.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Text to search for." },
          path:  { type: "string", description: "Sub-directory to search (defaults to root)." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description:
        "Make a targeted replacement inside a file. Safer than write_file for small precise changes — the old_text must match exactly (including whitespace).",
      parameters: {
        type: "object",
        properties: {
          path:     { type: "string", description: "Relative file path." },
          old_text: { type: "string", description: "Exact text to find and replace." },
          new_text: { type: "string", description: "Replacement text." },
          reason:   { type: "string", description: "Short explanation of the change." },
        },
        required: ["path", "old_text", "new_text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description:
        "Write or overwrite a complete file. Always write the ENTIRE file content. The previous content is saved for undo. Use edit_file for small targeted changes.",
      parameters: {
        type: "object",
        properties: {
          path:    { type: "string", description: "Relative file path within the bot project." },
          content: { type: "string", description: "Complete content to write." },
          reason:  { type: "string", description: "Short explanation of what this fix does." },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_file",
      description: "Delete a file or empty directory from the bot project.",
      parameters: {
        type: "object",
        properties: {
          path:   { type: "string", description: "Relative file path to delete." },
          reason: { type: "string", description: "Short reason for deletion." },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "install_dependencies",
      description:
        "Install a missing npm package (Node.js) or pip package (Python). Use when the bot crashes with MODULE_NOT_FOUND or ModuleNotFoundError.",
      parameters: {
        type: "object",
        properties: {
          package: { type: "string", description: "Package name (e.g. 'dotenv', 'discord.py')." },
          runtime: { type: "string", enum: ["node", "python"], description: "Runtime. Defaults to node." },
        },
        required: ["package"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "undo_last_change",
      description: "Restore the last changed file to its previous state.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "restart_bot",
      description: "Restart the bot process to apply file changes. Always call this after writing fixes.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "Short message to show while restarting." },
        },
      },
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ticketId: number,
): Promise<string> {
  try {
    // ── view_logs ─────────────────────────────────────────────────────────
    if (name === "view_logs") {
      const lines = Number(args["lines"] ?? 80);
      const log = getLiveLog(ticketId);
      if (!log) return "(no logs yet — the bot may not have started)";
      const logLines = log.split("\n");
      const recent = logLines.slice(-lines).join("\n");
      return "```\n" + recent + "\n```";
    }

    // ── check_status ──────────────────────────────────────────────────────
    if (name === "check_status") {
      const bot = await getHostedBotStatus(ticketId);
      if (!bot) return "No bot deployed.";
      const lines = [
        `Status: ${bot.status}`,
        `File: ${bot.fileName}`,
        `Start command: ${bot.startCommand || "auto-detected"}`,
        `Restart count: ${bot.restartCount}`,
        `Repair attempts: ${bot.repairAttempts}`,
        (bot as any).botName ? `Bot name: ${(bot as any).botName}` : null,
        bot.errorMessage ? `\nLast error:\n${bot.errorMessage.slice(0, 800)}` : null,
      ].filter(Boolean).join("\n");
      return lines;
    }

    // ── list_files ────────────────────────────────────────────────────────
    if (name === "list_files") {
      const dirPath = String(args["path"] || ".");
      const entries = await listDirectory(ticketId, dirPath === "." ? "" : dirPath);
      if (entries.length === 0) return "(empty directory)";
      const lines = entries.map((e) => {
        const icon = e.type === "directory" ? "📁" : "📄";
        const size = e.type === "file" ? ` (${(e.size / 1024).toFixed(1)} KB)` : "";
        return `${icon} ${e.path}${size}`;
      });
      return lines.join("\n");
    }

    // ── read_file ─────────────────────────────────────────────────────────
    if (name === "read_file") {
      const filePath = String(args["path"] ?? "").replace(/^\/+/, "");
      if (!filePath) return "Error: path is required.";
      if (filePath.includes("..") || filePath.startsWith("/")) return `Error: Invalid path "${filePath}".`;
      const result = await readFileContent(ticketId, filePath);
      const preview = result.content.slice(0, 6000);
      const truncated = result.content.length > 6000
        ? `\n... (truncated — ${result.content.length} bytes total)` : "";
      return "```\n" + preview + truncated + "\n```";
    }

    // ── search_files ──────────────────────────────────────────────────────
    if (name === "search_files") {
      const query = String(args["query"] ?? "");
      if (!query) return "Error: query is required.";

      // Resolve the bot's tmp run directory (where the isolated copy lives)
      const tmpDir = `/tmp/lumora-bots/${ticketId}`;
      let baseDir = tmpDir;
      if (!fs.existsSync(tmpDir)) {
        const { db: dbI, hostedBotsTable: tbl } = await import("@workspace/db");
        const { eq: eqI } = await import("drizzle-orm");
        const [row] = await dbI.select({ extractPath: tbl.extractPath }).from(tbl).where(eqI(tbl.ticketId, ticketId));
        baseDir = row?.extractPath ?? tmpDir;
      }

      const searchDirArg = String(args["path"] || ".");
      const searchDir = searchDirArg === "." ? baseDir : path.join(baseDir, searchDirArg.replace(/^\/+/, ""));
      if (!searchDir.startsWith(baseDir)) return "Error: path is outside project.";

      const SKIP = new Set(["node_modules", ".git", "__pycache__", ".venv", "venv", "dist", "build", ".next"]);
      const results: string[] = [];

      async function walk(dir: string): Promise<void> {
        let entries: fs.Dirent[];
        try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
        for (const e of entries) {
          if (SKIP.has(e.name)) continue;
          const full = path.join(dir, e.name);
          if (e.isDirectory()) { await walk(full); }
          else if (e.isFile()) {
            try {
              const text = await fsp.readFile(full, "utf-8");
              const fileLines = text.split("\n");
              const rel = path.relative(baseDir, full);
              let count = 0;
              fileLines.forEach((line, i) => {
                if (results.length < 40 && count < 5 && line.includes(query)) {
                  results.push(`${rel}:${i + 1}: ${line.trim().slice(0, 140)}`);
                  count++;
                }
              });
            } catch { /* binary */ }
          }
        }
      }

      await walk(searchDir);
      return results.length > 0 ? results.join("\n") : `No matches for "${query}"`;
    }

    // ── edit_file ─────────────────────────────────────────────────────────
    if (name === "edit_file") {
      const filePath = String(args["path"] ?? "").replace(/^\/+/, "");
      const oldText = String(args["old_text"] ?? "");
      const newText = String(args["new_text"] ?? "");
      const reason = args["reason"] ? String(args["reason"]) : undefined;

      if (!filePath) return "Error: path is required.";
      if (filePath.includes("..") || filePath.startsWith("/")) return `Error: Invalid path "${filePath}".`;
      if (!oldText) return "Error: old_text is required.";

      let current: string;
      try {
        const read = await readFileContent(ticketId, filePath);
        current = read.content;
      } catch {
        return `Error: File not found: ${filePath}`;
      }

      if (!current.includes(oldText)) {
        return `Error: The old_text was not found in ${filePath}. The text must match exactly including whitespace and indentation.`;
      }

      pushUndo(ticketId, filePath, current);
      const updated = current.replace(oldText, newText);
      await writeFileContent(ticketId, filePath, updated);

      const reasonStr = reason ? ` — ${reason}` : "";
      await appendRepairHistory(ticketId, {
        timestamp: new Date().toISOString(),
        action: "edit_file",
        description: reason ?? `Edited ${filePath}`,
      });
      logger.info({ ticketId, filePath }, "AI chat agent targeted-edited file");
      return `✓ Edited ${filePath}${reasonStr}`;
    }

    // ── write_file ────────────────────────────────────────────────────────
    if (name === "write_file") {
      const filePath = String(args["path"] ?? "").replace(/^\/+/, "");
      const content = String(args["content"] ?? "");
      if (!filePath || content === undefined) return "Error: path and content are required.";
      if (filePath.includes("..") || filePath.startsWith("/")) return `Error: Invalid path "${filePath}".`;

      try {
        const existing = await readFileContent(ticketId, filePath);
        pushUndo(ticketId, filePath, existing.content);
      } catch {
        pushUndo(ticketId, filePath, "");
      }

      await writeFileContent(ticketId, filePath, content);
      const reason = args["reason"] ? ` — ${args["reason"]}` : "";
      await appendRepairHistory(ticketId, {
        timestamp: new Date().toISOString(),
        action: "write_file",
        description: args["reason"] ? String(args["reason"]) : `Rewrote ${filePath}`,
      });
      logger.info({ ticketId, filePath }, "AI chat agent wrote file");
      return `✓ Wrote ${filePath}${reason}`;
    }

    // ── delete_file ───────────────────────────────────────────────────────
    if (name === "delete_file") {
      const filePath = String(args["path"] ?? "").replace(/^\/+/, "");
      if (!filePath) return "Error: path is required.";
      if (filePath.includes("..") || filePath.startsWith("/")) return `Error: Invalid path "${filePath}".`;
      try {
        const existing = await readFileContent(ticketId, filePath);
        pushUndo(ticketId, filePath, existing.content);
      } catch { /* ignore */ }
      await deletePath(ticketId, filePath);
      const reason = args["reason"] ? ` — ${args["reason"]}` : "";
      return `✓ Deleted ${filePath}${reason}`;
    }

    // ── install_dependencies ──────────────────────────────────────────────
    if (name === "install_dependencies") {
      const pkg = String(args["package"] ?? "").trim();
      const runtime = String(args["runtime"] ?? "node");
      if (!pkg) return "Error: package is required.";
      if (!/^[@a-zA-Z0-9._\/-]+$/.test(pkg)) return `Error: "${pkg}" is not a valid package name.`;

      const tmpDir = `/tmp/lumora-bots/${ticketId}`;
      let installDir = tmpDir;
      if (!fs.existsSync(tmpDir)) {
        const { db: dbI, hostedBotsTable: tbl } = await import("@workspace/db");
        const { eq: eqI } = await import("drizzle-orm");
        const [row] = await dbI.select({ extractPath: tbl.extractPath }).from(tbl).where(eqI(tbl.ticketId, ticketId));
        installDir = row?.extractPath ?? tmpDir;
      }

      try {
        if (runtime === "python") {
          execSync(`python3 -m pip install --no-input --disable-pip-version-check ${pkg}`,
            { cwd: installDir, timeout: 120_000, stdio: "pipe" });
        } else {
          execSync(`npm install --no-audit --no-fund ${pkg}`,
            { cwd: installDir, timeout: 120_000, stdio: "pipe" });
        }
        await appendRepairHistory(ticketId, {
          timestamp: new Date().toISOString(),
          action: "install_dependencies",
          description: `Installed ${pkg} (${runtime})`,
        });
        logger.info({ ticketId, pkg, runtime }, "AI chat agent installed package");
        return `✓ Installed ${pkg}`;
      } catch (err: any) {
        const msg = err?.stderr?.toString?.()?.slice(0, 400) ?? String(err);
        return `Failed to install ${pkg}: ${msg}`;
      }
    }

    // ── undo_last_change ──────────────────────────────────────────────────
    if (name === "undo_last_change") {
      const entry = popUndo(ticketId);
      if (!entry) return "Nothing to undo — no previous changes recorded this session.";
      if (entry.content === "") {
        try {
          await deletePath(ticketId, entry.path);
          return `✓ Undid creation of ${entry.path} (file deleted).`;
        } catch {
          return `Could not undo — ${entry.path} may already be gone.`;
        }
      }
      await writeFileContent(ticketId, entry.path, entry.content);
      return `✓ Restored ${entry.path} to its previous state.`;
    }

    // ── restart_bot ───────────────────────────────────────────────────────
    if (name === "restart_bot") {
      await updateHostedBot(ticketId, {
        status: "starting",
        errorMessage: null,
        aiExplanation: null,
      });
      restartHostedBot(ticketId, () => undefined).catch(() => undefined);
      await appendRepairHistory(ticketId, {
        timestamp: new Date().toISOString(),
        action: "restart_bot",
        description: args["message"] ? String(args["message"]) : "Bot restarted to apply fix",
      });
      return "✓ Bot restart initiated — checking status in a moment.";
    }

    return `Unknown tool: ${name}`;
  } catch (err: any) {
    if (err instanceof FileManagerSecurityError) return `Security error: ${err.message}`;
    if (err instanceof FileManagerError) return `File error: ${err.message}`;
    logger.error({ err, tool: name, ticketId }, "AI tool execution failed");
    return `Error executing ${name}: ${err?.message || "Unknown error"}`;
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

router.post("/ai/chat", async (req, res) => {
  const session = await resolveSession(req);
  if (!session) {
    clearSessionCookie(res);
    res.status(401).json({ error: "No active session." });
    return;
  }

  const { messages } = req.body as {
    messages?: Array<{ role: string; content: string }>;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "Messages array is required." });
    return;
  }

  const ticketId = session.ticket.id;

  // Resolve OpenRouter key: system env > DB admin config > user's own bot env vars
  let resolvedApiKey = process.env["OPENROUTER_API_KEY"] || "";

  if (!resolvedApiKey) {
    // Check DB admin config
    const { db: dbInstance, appConfigTable: configTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");
    const [row] = await dbInstance.select().from(configTable).where(eq(configTable.key, "OPENROUTER_API_KEY"));
    if (row?.value) resolvedApiKey = row.value;
  }

  if (!resolvedApiKey) {
    // Check user's own bot env vars (set via AI Settings in File Manager)
    const { getHostedBotEnvVars } = await import("../discord/hosting/runner");
    const userVars = await getHostedBotEnvVars(ticketId);
    resolvedApiKey = userVars["OPENROUTER_API_KEY"] || "";
  }

  if (!resolvedApiKey) {
    res.status(503).json({ error: "AI assistant is not configured. Add your OpenRouter API key in Files → AI Settings." });
    return;
  }
  const bot = await getHostedBotStatus(ticketId);
  const liveLog = getLiveLog(ticketId);

  const botContext = bot
    ? [
        `Bot file: ${bot.fileName}`,
        `Status: ${bot.status}`,
        `Start command: ${bot.startCommand || "auto-detected"}`,
        `Restart count: ${bot.restartCount}`,
        `Repair attempts: ${bot.repairAttempts}`,
        (bot as any).botName ? `Bot name: ${(bot as any).botName}` : null,
        bot.errorMessage
          ? `\nCurrent error:\n\`\`\`\n${bot.errorMessage.slice(-2000)}\n\`\`\``
          : null,
        bot.aiExplanation ? `\nPrevious AI diagnosis: ${bot.aiExplanation}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "No bot deployed yet.";

  const consoleContext = liveLog
    ? `\nRecent console output (last 1500 chars):\n\`\`\`\n${liveLog.slice(-1500)}\n\`\`\``
    : "";

  const systemPrompt = `You are Lumora AI — an autonomous Discord bot deployment fixer embedded in the Lumora hosting portal.

## Current Bot State
${botContext}${consoleContext}

## Your Tools
- **view_logs** — Read recent bot stdout/stderr. Start HERE when diagnosing any crash or problem.
- **check_status** — Get status, error message, restart count, bot name. Use after restarting to confirm success.
- **list_files** — Explore the project structure.
- **read_file** — Read any source file.
- **search_files** — Grep across all project files.
- **edit_file** — Targeted search-and-replace inside a file (best for small precise changes).
- **write_file** — Write a complete file (use for full rewrites; edit_file is safer for small changes).
- **delete_file** — Delete a file.
- **undo_last_change** — Restore the last changed file.
- **install_dependencies** — Install a missing npm or pip package.
- **restart_bot** — Restart the bot to apply changes.

## When to use tools
- **Only call tools when the user is asking about their bot or requesting a fix.** For greetings, general questions, or anything not bot-related, reply directly without calling any tools.
- If the bot status above already shows the information the user needs, answer from it directly — do not call \`check_status\` or \`view_logs\` again just to confirm.

## Autonomous Repair Workflow
Only trigger this when the user explicitly asks you to fix/diagnose, or when the bot status above shows crashed/error:
1. Call \`view_logs\` to see what happened
2. Call \`check_status\` for the full error context
3. Identify the SPECIFIC root cause (not just "it crashed")
4. Fix it — \`edit_file\` for targeted changes, \`write_file\` for full rewrites, \`install_dependencies\` for missing packages
5. Call \`restart_bot\`
6. Call \`check_status\` to verify the bot came online
7. Tell the user exactly what was wrong and what you fixed (2-3 sentences)

## Common Fixes
- **MODULE_NOT_FOUND / ModuleNotFoundError**: \`install_dependencies\` + restart
- **Invalid token / TokenInvalid**: use \`search_files\` to find where token is read; if env var name mismatches what's in Secrets, \`edit_file\` to fix the code (or tell user to rename the secret)
- **DisallowedIntents**: tell user to enable intents in Discord Developer Portal → Bot → Privileged Gateway Intents
- **Missing scripts.start**: \`read_file package.json\`, then \`edit_file\` to add the start script
- **Wrong entry file**: \`list_files\` to find the real main file, \`edit_file\` to fix package.json
- **Syntax error**: \`read_file\` the offending file, \`edit_file\` to fix it

## Rules
- **Be autonomous** — diagnose and fix first, explain after. Never say "you should try X" — just do it.
- **edit_file over write_file** — for small changes, edit_file is safer and preserves surrounding code
- Never expose token or secret values even if you see them in files
- Always call \`restart_bot\` after making file changes
- Always call \`check_status\` after restarting to confirm the bot came online
- Maximum 3 repair attempts per conversation before asking the user for help
- **Always end with a text message** summarizing what you found, what you changed, and the current status
- Supported runtimes: Node.js (discord.js, Eris, Sapphire), Python (discord.py, py-cord, hikari, disnake, nextcord)`;

  type ChatMsg =
    | { role: "system"; content: string }
    | { role: "user"; content: string }
    | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
    | { role: "tool"; tool_call_id: string; content: string };

  interface ToolCall {
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }

  const MAX_AGENT_TURNS = 10;

  try {
    const history: ChatMsg[] = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-14).map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: String(m.content).slice(0, 4000),
      })),
    ];

    const allToolResults: Array<{ tool: string; result: string }> = [];
    let finalContent = "";

    for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resolvedApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://lumora.host",
          "X-Title": "Lumora Portal AI",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: history,
          tools: AI_TOOLS,
          tool_choice: "auto",
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        logger.error({ status: response.status, body: errText.slice(0, 400) }, "OpenRouter AI chat failed");

        // Build a specific, actionable error message based on the status code.
        let userError: string;
        if (response.status === 401) {
          userError = "The OpenRouter API key is invalid. The server admin should check it in the admin panel.";
        } else if (response.status === 402) {
          const afford = errText.match(/can only afford (\d+)/i);
          const hint = afford ? ` (balance: ~${afford[1]} tokens)` : "";
          userError = `The OpenRouter account is out of credits${hint}. Top up at openrouter.ai/settings/credits.`;
        } else if (response.status === 429) {
          userError = "The AI assistant is rate-limited. Please wait a moment and try again.";
        } else if (response.status >= 500) {
          userError = "OpenRouter is having an outage. Please try again in a few minutes.";
        } else {
          userError = `AI service error (${response.status}). Please try again shortly.`;
        }

        if (turn === 0) {
          res.status(response.status === 402 || response.status === 401 ? 503 : 502).json({ error: userError });
          return;
        }
        // Mid-conversation failure — break loop and return whatever we have so far.
        finalContent = finalContent || userError;
        break;
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: { content?: string | null; tool_calls?: ToolCall[] };
          finish_reason?: string;
        }>;
      };

      const msg = data.choices?.[0]?.message;
      const toolCalls = msg?.tool_calls ?? [];
      const content = msg?.content ?? null;

      history.push({
        role: "assistant",
        content,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      } as ChatMsg);

      if (toolCalls.length === 0) {
        finalContent = content ?? "";
        break;
      }

      const roundResults: { tool_call_id: string; tool: string; result: string }[] = [];
      for (const tc of toolCalls) {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.function.arguments) as Record<string, unknown>; }
        catch { /* ignore */ }

        const result = await executeTool(tc.function.name, args, ticketId);
        allToolResults.push({ tool: tc.function.name, result });
        roundResults.push({ tool_call_id: tc.id, tool: tc.function.name, result });
      }

      for (const r of roundResults) {
        history.push({ role: "tool", tool_call_id: r.tool_call_id, content: r.result });
      }
    }

    // If model finished with tools but no closing text, build a plain-English fallback.
    if (!finalContent && allToolResults.length > 0) {
      const actions = allToolResults.map((r) => {
        if (r.tool === "write_file" || r.tool === "edit_file") return "applied a code fix";
        if (r.tool === "restart_bot") return "restarted the bot";
        if (r.tool === "install_dependencies") return "installed a missing package";
        if (r.tool === "delete_file") return "deleted a file";
        if (r.tool === "undo_last_change") return "undid the last change";
        if (r.tool === "check_status" || r.tool === "view_logs" || r.tool === "read_file" || r.tool === "list_files" || r.tool === "search_files") return null;
        return r.tool.replace(/_/g, " ");
      }).filter(Boolean);
      const unique = [...new Set(actions)];
      finalContent = unique.length > 0 ? `Done — ${unique.join(", ")}.` : "Done.";
    }

    res.json({ content: finalContent, toolResults: allToolResults });
  } catch (err) {
    logger.error({ err }, "AI chat route error");
    res.status(502).json({ error: "Failed to reach the AI service." });
  }
});

export default router;
