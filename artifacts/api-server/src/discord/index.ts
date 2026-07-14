import { eq } from "drizzle-orm";
import { db, appConfigTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { connectBot } from "./connectionManager";

/**
 * Read a config value: DB row first, then environment variable, then null.
 */
async function resolveConfig(key: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(appConfigTable)
    .where(eq(appConfigTable.key, key));
  if (row?.value) return row.value;
  return process.env[key] ?? null;
}

export async function startDiscordBot(): Promise<void> {
  const token = await resolveConfig("DISCORD_BOT_TOKEN");
  const guildId = await resolveConfig("DISCORD_GUILD_ID");
  const staffRoleId = await resolveConfig("DISCORD_STAFF_ROLE_ID");
  const ticketCategoryName =
    (await resolveConfig("DISCORD_TICKET_CATEGORY_NAME")) || "Tickets";

  if (!token || !guildId || !staffRoleId) {
    logger.warn(
      "Discord bot not started: DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, or DISCORD_STAFF_ROLE_ID is missing. " +
        "Set them via the admin panel or environment variables.",
    );
    return;
  }

  try {
    await connectBot({ token, guildId, staffRoleId, ticketCategoryName });
  } catch (err) {
    logger.error({ err }, "Failed to start Discord bot");
  }
}
