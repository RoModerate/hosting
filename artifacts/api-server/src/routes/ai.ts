import { Router, type IRouter } from "express";
import { clearSessionCookie, resolveSession } from "../lib/session";
import { getLiveLog } from "../discord/hosting/processManager";
import { getHostedBotStatus, restartHostedBot, updateHostedBot } from "../discord/hosting/runner";
import {
  writeFileContent,
  readFileContent,
  listDirectory,
  deletePath,
  resolveBotPath,
  FileManagerSecurityError,
  FileManagerError,
} from "../discord/hosting/fileManager";
import { logger } from "../lib/logger";
import fs from "node:fs";

const router: IRouter = Router();

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env["OPENROUTER_MODEL"] || "openai/gpt-4o-mini";

// ─── In-memory undo stack per ticket ─────────────────────────────────────────
// Stores the last content of a file before each write so the AI can undo it.

const undoStack = new Map<number, Array<{ path: string; content: string }>>();

function pushUndo(ticketId: number, path: string, content: string) {
  if (!undoStack.has(ticketId)) undoStack.set(ticketId, []);
  const stack = undoStack.get(ticketId)!;
  stack.push({ path, content });
  if (stack.length > 20) stack.shift();
}

function popUndo(ticketId: number): { path: string; content: string } | null {
  const stack = undoStack.get(ticketId);
  if (!stack || stack.length === 0) return null;
  return stack.pop()!;
}

// ─── Tool definitions ────────────────────────────────────────────────────────

const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "write_file",
      description:
        "Write or overwrite a file in the user's bot project. Use to apply code fixes. Always write the complete file content. The previous content is saved automatically for undo.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative file path within the bot project (e.g. 'index.js', 'src/bot.py'). No leading slash.",
          },
          content: {
            type: "string",
            description: "Complete content to write to the file.",
          },
          reason: {
            type: "string",
            description: "Short explanation of what this fix does (shown to the user).",
          },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the current content of a file in the user's bot project.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative file path to read (e.g. 'index.js', 'config.json').",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List files and directories in the user's bot project. Use to explore the project structure.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Directory to list. Use '' or '.' for the project root.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_file",
      description: "Delete a file or empty directory from the user's bot project.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative file path to delete.",
          },
          reason: {
            type: "string",
            description: "Short reason for deletion.",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "undo_last_change",
      description:
        "Undo the last write_file change by restoring the previous file content. Can be called multiple times to undo multiple changes.",
      parameters: {
        type: "object",
        properties: {},
      },
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
          message: {
            type: "string",
            description: "Short message to show the user while the bot restarts.",
          },
        },
      },
    },
  },
];

// ─── Execute a single tool call ──────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, string>,
  ticketId: number,
): Promise<string> {
  try {
    if (name === "write_file") {
      const filePath = args["path"]?.replace(/^\/+/, "");
      const content = args["content"];
      if (!filePath || content === undefined) return "Error: path and content are required.";

      if (filePath.includes("..") || filePath.startsWith("/")) {
        return `Error: Invalid path "${filePath}".`;
      }

      // Save old content for undo before overwriting
      try {
        const existing = await readFileContent(ticketId, filePath);
        pushUndo(ticketId, filePath, existing.content);
      } catch {
        // File doesn't exist yet — push empty string as undo target
        pushUndo(ticketId, filePath, "");
      }

      await writeFileContent(ticketId, filePath, content);
      const reason = args["reason"] ? ` — ${args["reason"]}` : "";
      logger.info({ ticketId, filePath }, "AI agent wrote file fix");
      return `✓ Wrote ${filePath}${reason}`;
    }

    if (name === "read_file") {
      const filePath = args["path"]?.replace(/^\/+/, "");
      if (!filePath) return "Error: path is required.";

      if (filePath.includes("..") || filePath.startsWith("/")) {
        return `Error: Invalid path "${filePath}".`;
      }

      const result = await readFileContent(ticketId, filePath);
      const preview = result.content.slice(0, 4000);
      const truncated = result.content.length > 4000 ? `\n... (truncated, ${result.content.length} bytes total)` : "";
      return `\`\`\`\n${preview}${truncated}\n\`\`\``;
    }

    if (name === "list_files") {
      const dirPath = args["path"] || ".";
      const entries = await listDirectory(ticketId, dirPath === "." ? "" : dirPath);

      if (entries.length === 0) return "(empty directory)";

      const lines = entries.map((e) => {
        const icon = e.type === "directory" ? "📁" : "📄";
        const size = e.type === "file" ? ` (${(e.size / 1024).toFixed(1)} KB)` : "";
        return `${icon} ${e.path}${size}`;
      });
      return lines.join("\n");
    }

    if (name === "delete_file") {
      const filePath = args["path"]?.replace(/^\/+/, "");
      if (!filePath) return "Error: path is required.";

      if (filePath.includes("..") || filePath.startsWith("/")) {
        return `Error: Invalid path "${filePath}".`;
      }

      // Back up before deleting
      try {
        const existing = await readFileContent(ticketId, filePath);
        pushUndo(ticketId, filePath, existing.content);
      } catch { /* ignore */ }

      await deletePath(ticketId, filePath);
      const reason = args["reason"] ? ` — ${args["reason"]}` : "";
      return `✓ Deleted ${filePath}${reason}`;
    }

    if (name === "undo_last_change") {
      const entry = popUndo(ticketId);
      if (!entry) return "Nothing to undo — no previous changes recorded this session.";

      if (entry.content === "") {
        // File was newly created — delete it to undo
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

    if (name === "restart_bot") {
      await updateHostedBot(ticketId, {
        status: "starting",
        errorMessage: null,
        aiExplanation: null,
      });
      restartHostedBot(ticketId, () => undefined).catch(() => undefined);
      return "✓ Bot restart initiated — it will be online in a moment.";
    }

    return `Unknown tool: ${name}`;
  } catch (err: any) {
    if (err instanceof FileManagerSecurityError) return `Security error: ${err.message}`;
    if (err instanceof FileManagerError) return `File error: ${err.message}`;
    logger.error({ err, tool: name, ticketId }, "AI tool execution failed");
    return `Error executing ${name}: ${err?.message || "Unknown error"}`;
  }
}

// ─── Route ───────────────────────────────────────────────────────────────────

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

  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) {
    // Try getting it from DB config
    const { db: dbInstance, appConfigTable: configTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");
    const [row] = await dbInstance.select().from(configTable).where(eq(configTable.key, "OPENROUTER_API_KEY"));
    if (!row) {
      res.status(503).json({ error: "AI assistant is not configured on this server. Set OPENROUTER_API_KEY in the admin panel." });
      return;
    }
  }

  const resolvedApiKey = apiKey || await (async () => {
    const { db: dbInstance, appConfigTable: configTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");
    const [row] = await dbInstance.select().from(configTable).where(eq(configTable.key, "OPENROUTER_API_KEY"));
    return row?.value;
  })();

  if (!resolvedApiKey) {
    res.status(503).json({ error: "AI assistant is not configured on this server." });
    return;
  }

  // Gather bot context
  const bot = await getHostedBotStatus(session.ticket.id);
  const liveLog = getLiveLog(session.ticket.id);

  const botContext = bot
    ? [
        `Bot file: ${bot.fileName || "none"}`,
        `Status: ${bot.status}`,
        `Start command: ${bot.startCommand || "auto-detected"}`,
        `Restart count: ${bot.restartCount}`,
        bot.errorMessage
          ? `\nCrash log (last 2000 chars):\n\`\`\`\n${bot.errorMessage.slice(-2000)}\n\`\`\``
          : "",
        bot.aiExplanation ? `\nPrevious AI diagnosis: ${bot.aiExplanation}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "No bot deployed yet.";

  const consoleContext = liveLog
    ? `\nRecent console output (last 1500 chars):\n\`\`\`\n${liveLog.slice(-1500)}\n\`\`\``
    : "";

  const systemPrompt = `You are Lumora AI — an autonomous coding agent embedded in the Lumora Discord bot hosting portal.

## Current Bot Context
${botContext}${consoleContext}

## Your Capabilities
You have full access to the user's bot project files:
- **read_file**: Read any file to understand the code
- **list_files**: List files/directories to explore the project structure
- **write_file**: Write or overwrite files to apply fixes (previous content is automatically saved for undo)
- **delete_file**: Delete files that are no longer needed
- **undo_last_change**: Restore a file to its state before the last write_file or delete_file call
- **restart_bot**: Restart the bot process to apply changes

## Workflow
When a user asks you to fix, modify, or create something:
1. If you need to understand the code first, use read_file or list_files
2. Apply fixes with write_file (always write complete file content, never partial)
3. Use restart_bot after writing fixes so changes take effect
4. Send a text message summarising exactly what you changed and why

When a user asks you to undo:
1. Call undo_last_change to restore the previous file state
2. Use restart_bot to apply the restored state
3. Confirm what was undone

## Rules
- Be concise and direct — get to the fix without preamble
- Always write complete file content in write_file, never just a snippet
- Use code blocks when showing code in chat
- Never expose token/secret values even if you see them in files
- After writing fixes, always restart the bot
- When exploring a project for the first time, start with list_files to understand the structure
- Supported runtimes: Node.js (discord.js, Eris, Sapphire), Python (discord.py, py-cord, hikari, disnake), Java (JDA, Javacord, D4J)
- **YOU MUST ALWAYS END WITH A TEXT MESSAGE.** After every tool-call sequence, send a plain-text reply explaining what you did. Never let your final action be a tool call with no follow-up text — the user cannot see tool results directly.`;

  const ticketId = session.ticket.id;

  // Types for the multi-turn message history
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

  const MAX_AGENT_TURNS = 8;

  try {
    const history: ChatMsg[] = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-12).map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: String(m.content).slice(0, 4000),
      })),
    ];

    const allToolResults: Array<{ tool: string; result: string }> = [];
    let finalContent = "";

    // ── Multi-turn agent loop ─────────────────────────────────────────────
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
          temperature: 0.2,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        logger.error({ status: response.status, body: errText.slice(0, 300) }, "OpenRouter AI chat failed");
        if (turn === 0) {
          res.status(502).json({ error: "AI service temporarily unavailable. Try again shortly." });
          return;
        }
        // On later turns, fall back to whatever we have
        break;
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string | null;
            tool_calls?: ToolCall[];
          };
          finish_reason?: string;
        }>;
      };

      const msg = data.choices?.[0]?.message;
      const toolCalls = msg?.tool_calls ?? [];
      const content = msg?.content ?? null;

      // Add assistant turn to history
      history.push({
        role: "assistant",
        content,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      } as ChatMsg);

      // No tool calls — AI is done
      if (toolCalls.length === 0) {
        finalContent = content ?? "";
        break;
      }

      // Execute all tool calls in this round
      const roundResults: { tool_call_id: string; tool: string; result: string }[] = [];
      for (const tc of toolCalls) {
        let args: Record<string, string> = {};
        try {
          args = JSON.parse(tc.function.arguments) as Record<string, string>;
        } catch { /* ignore */ }

        const result = await executeTool(tc.function.name, args, ticketId);
        allToolResults.push({ tool: tc.function.name, result });
        roundResults.push({ tool_call_id: tc.id, tool: tc.function.name, result });
      }

      // Feed tool results back into history
      for (const r of roundResults) {
        history.push({ role: "tool", tool_call_id: r.tool_call_id, content: r.result });
      }
    }

    // If the model completed all tool calls but sent no closing text, build a
    // fallback summary so the user always sees a message (not just checkmarks).
    if (!finalContent && allToolResults.length > 0) {
      const actions = allToolResults.map((r) => {
        if (r.tool === "write_file") return "applied a code fix";
        if (r.tool === "restart_bot") return "restarted the bot";
        if (r.tool === "install_dependencies") return "installed a dependency";
        if (r.tool === "delete_file") return "deleted a file";
        if (r.tool === "undo_last_change") return "undid the last change";
        if (r.tool === "read_file" || r.tool === "list_files") return null; // read-only, skip
        return r.tool.replace(/_/g, " ");
      }).filter(Boolean);
      const unique = [...new Set(actions)];
      finalContent = unique.length > 0
        ? `Done — ${unique.join(", ")}.`
        : "Done.";
    }

    res.json({ content: finalContent, toolResults: allToolResults });
  } catch (err) {
    logger.error({ err }, "AI chat route error");
    res.status(502).json({ error: "Failed to reach the AI service." });
  }
});

export default router;
