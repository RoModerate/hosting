import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, appConfigTable } from "@workspace/db";
import { connectBot, getBotStatus } from "../discord/connectionManager";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const CONFIG_KEYS = [
  "DISCORD_BOT_TOKEN",
  "DISCORD_GUILD_ID",
  "DISCORD_STAFF_ROLE_ID",
  "DISCORD_TICKET_CATEGORY_NAME",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL",
] as const;

function getAdminPassword(): string {
  return process.env["ADMIN_PASSWORD"] || "lumora-admin";
}

function checkAdminAuth(password: string): boolean {
  return password === getAdminPassword();
}

async function getConfigValue(key: string): Promise<string | null> {
  // DB config takes priority over env vars
  const [row] = await db
    .select()
    .from(appConfigTable)
    .where(eq(appConfigTable.key, key));
  if (row) return row.value;
  return process.env[key] ?? null;
}

async function buildConfigStatus() {
  const configKeys = await Promise.all(
    CONFIG_KEYS.map(async (key) => ({
      key,
      isSet: Boolean(await getConfigValue(key)),
    })),
  );
  return configKeys;
}

router.get("/admin/status", async (req, res) => {
  const password =
    (req.headers["x-admin-password"] as string) || "";
  if (!checkAdminAuth(password)) {
    res.status(401).json({ error: "Invalid admin password." });
    return;
  }

  const { connected, tag } = getBotStatus();
  const configKeys = await buildConfigStatus();
  res.json({ botConnected: connected, botTag: tag ?? null, configKeys });
});

router.post("/admin/config", async (req, res) => {
  const {
    adminPassword,
    discordBotToken,
    discordGuildId,
    discordStaffRoleId,
    discordTicketCategoryName,
    openrouterApiKey,
    openrouterModel,
  } = req.body as {
    adminPassword?: string;
    discordBotToken?: string | null;
    discordGuildId?: string | null;
    discordStaffRoleId?: string | null;
    discordTicketCategoryName?: string | null;
    openrouterApiKey?: string | null;
    openrouterModel?: string | null;
  };

  if (!adminPassword || !checkAdminAuth(adminPassword)) {
    res.status(401).json({ error: "Invalid admin password." });
    return;
  }

  const updates: Record<string, string | null> = {
    DISCORD_BOT_TOKEN: discordBotToken ?? null,
    DISCORD_GUILD_ID: discordGuildId ?? null,
    DISCORD_STAFF_ROLE_ID: discordStaffRoleId ?? null,
    DISCORD_TICKET_CATEGORY_NAME: discordTicketCategoryName ?? null,
    OPENROUTER_API_KEY: openrouterApiKey ?? null,
    OPENROUTER_MODEL: openrouterModel ?? null,
  };

  // Persist non-null values to DB
  for (const [key, value] of Object.entries(updates)) {
    if (value !== null && value.trim() !== "") {
      await db
        .insert(appConfigTable)
        .values({ key, value: value.trim() })
        .onConflictDoUpdate({
          target: appConfigTable.key,
          set: { value: value.trim(), updatedAt: new Date() },
        });
    }
  }

  // Try to reconnect the bot with the new or existing config
  try {
    const token = updates["DISCORD_BOT_TOKEN"]?.trim() || (await getConfigValue("DISCORD_BOT_TOKEN"));
    const guildId = updates["DISCORD_GUILD_ID"]?.trim() || (await getConfigValue("DISCORD_GUILD_ID"));
    const staffRoleId = updates["DISCORD_STAFF_ROLE_ID"]?.trim() || (await getConfigValue("DISCORD_STAFF_ROLE_ID"));
    const categoryName = updates["DISCORD_TICKET_CATEGORY_NAME"]?.trim() || (await getConfigValue("DISCORD_TICKET_CATEGORY_NAME")) || "Tickets";

    if (token && guildId && staffRoleId) {
      // Run connect in background so the response isn't blocked
      connectBot({ token, guildId, staffRoleId, ticketCategoryName: categoryName }).catch((err) => {
        logger.error({ err }, "Failed to reconnect Discord bot after config update");
      });
    }
  } catch (err) {
    logger.error({ err }, "Error during bot reconnect after config update");
  }

  const { connected, tag } = getBotStatus();
  const configKeys = await buildConfigStatus();
  res.json({ botConnected: connected, botTag: tag ?? null, configKeys });
});

export default router;
