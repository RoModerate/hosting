import { Router, type IRouter } from "express";
import { clearSessionCookie, resolveSession } from "../lib/session";
import { getLiveLog } from "../discord/hosting/processManager";
import { getHostedBotStatus, restartHostedBot, updateHostedBot } from "../discord/hosting/runner";
import { writeFileContent } from "../discord/hosting/fileManager";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env["OPENROUTER_MODEL"] || "openai/gpt-4o-mini";

// ─── Tool definitions ────────────────────────────────────────────────────────

const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "write_file",
      description:
        "Write or overwrite a file in the user's bot project. Use this to apply code fixes directly. Always write the complete file content.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "Relative file path within the bot project (e.g. 'index.js', 'src/bot.py', 'package.json'). No leading slash.",
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
      name: "restart_bot",
      description:
        "Restart the bot process to apply file changes. Call this after writing fixes so the changes take effect.",
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

      // Security: block path traversal
      if (filePath.includes("..") || filePath.startsWith("/")) {
        return `Error: Invalid path "${filePath}".`;
      }

      await writeFileContent(ticketId, filePath, content);
      const reason = args["reason"] ? ` (${args["reason"]})` : "";
      logger.info({ ticketId, filePath }, "AI agent wrote file fix");
      return `✓ Wrote ${filePath}${reason}`;
    }

    if (name === "restart_bot") {
      await updateHostedBot(ticketId, {
        status: "starting",
        errorMessage: null,
        aiExplanation: null,
      });

      // Fire restart in background — don't await so the response comes back fast
      restartHostedBot(ticketId, () => undefined).catch(() => undefined);
      return "✓ Bot restart initiated — it will be online in a moment.";
    }

    return `Unknown tool: ${name}`;
  } catch (err: any) {
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

  const systemPrompt = `You are Lumora AI — a technical assistant and autonomous agent embedded in the Lumora Discord bot hosting portal.

## Current Bot Context
${botContext}${consoleContext}

## Your Capabilities
You have access to tools that let you directly fix the user's bot:
- **write_file**: Write or overwrite any file in the bot project to apply code fixes
- **restart_bot**: Restart the bot process to apply changes

When a user asks you to fix something:
1. Diagnose the issue from the logs/context
2. Use write_file to apply the fix
3. Use restart_bot to restart and apply it
4. Explain what you did in your final message

## Rules
- Be concise and direct — skip preamble, get to the fix
- When you see an error in the logs, diagnose it and offer to fix it (or just fix it if asked)
- Use code blocks when showing code
- Never expose token/secret values
- Only fix files that exist or that you're clearly creating from scratch
- After writing fixes, always restart the bot
- Supported runtimes: Node.js (discord.js, Eris, Sapphire), Python (discord.py, py-cord, hikari, disnake), Java (JDA, Javacord, D4J)`;

  const ticketId = session.ticket.id;

  try {
    // ── First call: may include tool calls ─────────────────────────────────
    const firstRes = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://lumora.host",
        "X-Title": "Lumora Portal AI",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-12).map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content).slice(0, 4000),
          })),
        ],
        tools: AI_TOOLS,
        tool_choice: "auto",
        temperature: 0.2,
        max_tokens: 1200,
      }),
    });

    if (!firstRes.ok) {
      const errText = await firstRes.text().catch(() => "");
      logger.error({ status: firstRes.status, body: errText.slice(0, 300) }, "OpenRouter AI chat failed");
      res.status(502).json({ error: "AI service temporarily unavailable. Try again shortly." });
      return;
    }

    const firstData = (await firstRes.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
          tool_calls?: Array<{
            id: string;
            type: string;
            function: { name: string; arguments: string };
          }>;
        };
        finish_reason?: string;
      }>;
    };

    const firstChoice = firstData.choices?.[0];
    const firstMsg = firstChoice?.message;

    // ── No tool calls — just return the text ──────────────────────────────
    if (!firstMsg?.tool_calls?.length) {
      res.json({ content: firstMsg?.content ?? "", toolResults: [] });
      return;
    }

    // ── Execute tool calls ────────────────────────────────────────────────
    const toolResults: Array<{ tool: string; result: string }> = [];

    for (const tc of firstMsg.tool_calls) {
      let args: Record<string, string> = {};
      try {
        args = JSON.parse(tc.function.arguments) as Record<string, string>;
      } catch {
        args = {};
      }
      const result = await executeTool(tc.function.name, args, ticketId);
      toolResults.push({ tool: tc.function.name, result });
    }

    // ── Second call: get final response after tool execution ──────────────
    const toolMessages = [
      { role: "assistant" as const, content: firstMsg.content ?? null, tool_calls: firstMsg.tool_calls },
      ...firstMsg.tool_calls.map((tc, i) => ({
        role: "tool" as const,
        tool_call_id: tc.id,
        content: toolResults[i]?.result ?? "Done.",
      })),
    ];

    const secondRes = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://lumora.host",
        "X-Title": "Lumora Portal AI",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-12).map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content).slice(0, 4000),
          })),
          ...toolMessages,
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
    });

    if (!secondRes.ok) {
      // Tool calls succeeded but follow-up failed — return summary of what was done
      const summary = toolResults.map((r) => `${r.result}`).join("\n");
      res.json({ content: summary, toolResults });
      return;
    }

    const secondData = (await secondRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const finalContent = secondData.choices?.[0]?.message?.content ?? "";

    res.json({ content: finalContent, toolResults });
  } catch (err) {
    logger.error({ err }, "AI chat route error");
    res.status(502).json({ error: "Failed to reach the AI service." });
  }
});

export default router;
