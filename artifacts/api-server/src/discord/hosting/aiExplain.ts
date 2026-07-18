import { logger } from "../../lib/logger";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env["GROQ_MODEL"] || "llama-3.3-70b-versatile";

/**
 * Ask an LLM (via Hugging Face Inference API) to translate a raw hosting
 * failure/error log into a short, plain-language explanation for the customer.
 * Returns null (never throws) if the key is missing or the request fails,
 * so hosting flows never block on this.
 */
export async function explainHostingFailure(params: {
  message: string;
  detail?: string;
  fileName: string;
}): Promise<string | null> {
  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) {
    logger.warn(
      "GROQ_API_KEY not set; skipping AI failure explanation",
    );
    return null;
  }

  const { message, detail, fileName } = params;
  const prompt = [
    `A customer's uploaded Discord bot ("${fileName}") failed to host. Outcome: ${message}`,
    detail
      ? `Captured install/startup output (may include the root cause):\n${detail.slice(0, 4000)}`
      : "",
    "",
    "Explain to the customer, in plain, professional, non-technical language, what most likely went wrong and what they should check or fix in their code or configuration. If the log clearly points to a specific cause (missing dependency, missing token/env var, syntax error, wrong entry file, port conflict, etc.), name it directly. Keep the explanation to 3-6 sentences. Do not use emojis or markdown headings.",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      logger.error(
        { status: response.status, text },
        "Groq request failed",
      );
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    return content || null;
  } catch (err) {
    logger.error({ err }, "Failed to call Groq for failure explanation");
    return null;
  }
}
