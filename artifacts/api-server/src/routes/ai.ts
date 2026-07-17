import { Router, type IRouter } from "express";
import { clearSessionCookie, resolveSession } from "../lib/session";
import { getLiveLog } from "../discord/hosting/processManager";
import { getHostedBotStatus } from "../discord/hosting/runner";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env["OPENROUTER_MODEL"] || "openai/gpt-4o-mini";

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

  // Gather bot context to inject into system prompt
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
        bot.aiExplanation
          ? `\nPrevious AI diagnosis: ${bot.aiExplanation}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "No bot deployed yet.";

  const consoleContext = liveLog
    ? `\nRecent console output (last 1500 chars):\n\`\`\`\n${liveLog.slice(-1500)}\n\`\`\``
    : "";

  const systemPrompt = `You are Lumora AI — a technical assistant embedded in the Lumora Discord bot hosting portal. You help users debug, fix, and understand their hosted Discord bots.

## Current Bot Context
${botContext}${consoleContext}

## Your Capabilities
- Diagnose crashes from error logs and console output
- Explain error messages in plain language
- Suggest exact code fixes or configuration changes
- Guide users through intents, token setup, dependency issues
- Help with Node.js (discord.js, Eris, Sapphire), Python (discord.py, py-cord, hikari, disnake), and Java (JDA, Javacord, D4J)

## Rules
- Be direct and concise — no unnecessary preamble
- Always reference the actual error from the logs when diagnosing
- Use code blocks when showing code examples
- Never ask for or expose token/secret values
- If you cannot determine the issue from logs, say so clearly and ask what the user is seeing
- Suggest actionable steps, not vague advice`;

  try {
    const response = await fetch(OPENROUTER_URL, {
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
          // Keep last 12 messages for context window efficiency
          ...messages.slice(-12).map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content).slice(0, 4000),
          })),
        ],
        temperature: 0.25,
        max_tokens: 900,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      logger.error({ status: response.status, body: errText }, "OpenRouter AI chat failed");
      res.status(502).json({ error: "AI service temporarily unavailable. Try again shortly." });
      return;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    res.json({ content });
  } catch (err) {
    logger.error({ err }, "AI chat route error");
    res.status(502).json({ error: "Failed to reach the AI service." });
  }
});

export default router;
