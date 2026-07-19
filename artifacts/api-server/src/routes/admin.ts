import { Router, type IRouter } from "express";
import { eq, desc, inArray } from "drizzle-orm";
import crypto from "node:crypto";
import { db, appConfigTable, ticketsTable, hostingKeysTable, hostedBotsTable } from "@workspace/db";
import { connectBot, getBotStatus } from "../discord/connectionManager";
import { stopHostedBot, updateHostedBot } from "../discord/hosting/runner";
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

function getAuthPassword(req: { headers: Record<string, string | string[] | undefined>; body?: any }): string {
  return (req.headers["x-admin-password"] as string) || (req.body as any)?.adminPassword || "";
}

async function getConfigValue(key: string): Promise<string | null> {
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

// ─── Key generation helper ────────────────────────────────────────────────────

const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateAccessKey(): string {
  const groups: string[] = [];
  for (let g = 0; g < 4; g++) {
    let group = "";
    for (let i = 0; i < 4; i++) {
      const byte = crypto.randomBytes(1)[0]!;
      group += KEY_ALPHABET[byte % KEY_ALPHABET.length];
    }
    groups.push(group);
  }
  return groups.join("-");
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get("/admin/status", async (req, res) => {
  const password = (req.headers["x-admin-password"] as string) || "";
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

  try {
    const token = updates["DISCORD_BOT_TOKEN"]?.trim() || (await getConfigValue("DISCORD_BOT_TOKEN"));
    const guildId = updates["DISCORD_GUILD_ID"]?.trim() || (await getConfigValue("DISCORD_GUILD_ID"));
    const staffRoleId = updates["DISCORD_STAFF_ROLE_ID"]?.trim() || (await getConfigValue("DISCORD_STAFF_ROLE_ID"));
    const categoryName = updates["DISCORD_TICKET_CATEGORY_NAME"]?.trim() || (await getConfigValue("DISCORD_TICKET_CATEGORY_NAME")) || "Tickets";

    if (token && guildId && staffRoleId) {
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

// ─── Key generation ───────────────────────────────────────────────────────────

router.post("/admin/keys/generate", async (req, res) => {
  const password = getAuthPassword(req as any);
  if (!checkAdminAuth(password)) {
    res.status(401).json({ error: "Invalid admin password." });
    return;
  }

  const { hostingDurationDays, discordUserId, discordUsername } = req.body as {
    hostingDurationDays?: number;
    discordUserId?: string;
    discordUsername?: string;
  };

  const days = Math.max(1, Math.min(365, Number(hostingDurationDays) || 30));

  try {
    let ticketId: number;

    if (discordUserId) {
      // Check for an existing ticket for this Discord user
      const [existing] = await db
        .select()
        .from(ticketsTable)
        .where(eq(ticketsTable.ownerId, discordUserId));

      if (existing) {
        ticketId = existing.id;
        if (discordUsername && discordUsername !== existing.ownerUsername) {
          await db
            .update(ticketsTable)
            .set({ ownerUsername: discordUsername })
            .where(eq(ticketsTable.id, ticketId));
        }
      } else {
        const [ticket] = await db
          .insert(ticketsTable)
          .values({
            guildId: "admin",
            channelId: "admin",
            ownerId: discordUserId,
            ownerUsername: discordUsername || discordUserId,
            status: "open",
          })
          .returning();
        ticketId = ticket!.id;
      }
    } else {
      // Create a ticket with no Discord owner — can be linked later
      const [ticket] = await db
        .insert(ticketsTable)
        .values({
          guildId: "admin",
          channelId: "admin",
          ownerId: `unassigned-${Date.now()}`,
          ownerUsername: "Unassigned",
          status: "open",
        })
        .returning();
      ticketId = ticket!.id;
    }

    const key = generateAccessKey();
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await db.insert(hostingKeysTable).values({
      ticketId,
      key,
      status: "active",
      expiresAt,
      hostingDurationDays: days,
      createdByDiscordId: discordUserId || "admin",
    });

    logger.info({ ticketId, days }, "Admin generated hosting key");
    res.json({ key, ticketId, hostingDurationDays: days, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    logger.error({ err }, "Failed to generate admin key");
    res.status(500).json({ error: "Failed to generate key." });
  }
});

// ─── Ticket management ────────────────────────────────────────────────────────

router.get("/admin/tickets", async (req, res) => {
  const password = (req.headers["x-admin-password"] as string) || "";
  if (!checkAdminAuth(password)) {
    res.status(401).json({ error: "Invalid admin password." });
    return;
  }

  try {
    const tickets = await db
      .select()
      .from(ticketsTable)
      .orderBy(desc(ticketsTable.id));

    const keys = await db.select().from(hostingKeysTable);

    const result = tickets.map((t) => ({
      id: t.id,
      ownerId: t.ownerId,
      ownerUsername: t.ownerUsername,
      status: t.status,
      createdAt: (t as any).createdAt,
      keys: keys
        .filter((k) => k.ticketId === t.id)
        .map((k) => ({
          id: k.id,
          key: k.key,
          status: k.status,
          expiresAt: k.expiresAt,
          hostingDurationDays: k.hostingDurationDays,
        })),
    }));

    res.json({ tickets: result });
  } catch (err) {
    logger.error({ err }, "Failed to list tickets");
    res.status(500).json({ error: "Failed to fetch tickets." });
  }
});

// ─── User management ─────────────────────────────────────────────────────────

/** GET /admin/users — all users with bot status, key info, quick actions */
router.get("/admin/users", async (req, res) => {
  const password = (req.headers["x-admin-password"] as string) || "";
  if (!checkAdminAuth(password)) {
    res.status(401).json({ error: "Invalid admin password." });
    return;
  }

  try {
    const tickets = await db.select().from(ticketsTable).orderBy(desc(ticketsTable.id));
    const keys = await db.select().from(hostingKeysTable);
    const bots = await db.select().from(hostedBotsTable);

    const users = tickets.map((t) => {
      const ticketKeys = keys.filter((k) => k.ticketId === t.id);
      const bot = bots.find((b) => b.ticketId === t.id) ?? null;
      const activeKey = ticketKeys.find(
        (k) => k.status === "active" && k.expiresAt && k.expiresAt.getTime() > Date.now(),
      ) ?? null;
      return {
        ticketId: t.id,
        ownerId: t.ownerId,
        ownerUsername: t.ownerUsername,
        ticketStatus: t.status,
        createdAt: (t as any).createdAt,
        activeKey: activeKey
          ? { id: activeKey.id, expiresAt: activeKey.expiresAt, hostingDurationDays: activeKey.hostingDurationDays }
          : null,
        allKeys: ticketKeys.map((k) => ({
          id: k.id,
          status: k.status,
          expiresAt: k.expiresAt,
          hostingDurationDays: k.hostingDurationDays,
        })),
        bot: bot
          ? {
              status: bot.status,
              fileName: bot.fileName,
              botName: bot.botName,
              restartCount: bot.restartCount,
              lastStartedAt: bot.lastStartedAt,
              errorMessage: bot.errorMessage,
            }
          : null,
      };
    });

    res.json({ users });
  } catch (err) {
    logger.error({ err }, "Failed to list users");
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

/** POST /admin/tickets/:id/suspend — revoke all active keys (blocks login) */
router.post("/admin/tickets/:id/suspend", async (req, res) => {
  const password = (req.headers["x-admin-password"] as string) || "";
  if (!checkAdminAuth(password)) {
    res.status(401).json({ error: "Invalid admin password." });
    return;
  }

  const ticketId = parseInt(req.params["id"] ?? "0");
  try {
    // Revoke all active/unused keys for this ticket
    const keys = await db.select().from(hostingKeysTable).where(eq(hostingKeysTable.ticketId, ticketId));
    for (const k of keys) {
      if (k.status === "active" || k.status === "unused") {
        await db.update(hostingKeysTable).set({ status: "revoked" }).where(eq(hostingKeysTable.id, k.id));
      }
    }
    logger.info({ ticketId }, "Admin suspended user (all keys revoked)");
    res.json({ ok: true, revokedCount: keys.filter((k) => k.status === "active" || k.status === "unused").length });
  } catch (err) {
    logger.error({ err, ticketId }, "Failed to suspend user");
    res.status(500).json({ error: "Failed to suspend user." });
  }
});

/** POST /admin/tickets/:id/reset-bot — stop + clear bot deployment */
router.post("/admin/tickets/:id/reset-bot", async (req, res) => {
  const password = (req.headers["x-admin-password"] as string) || "";
  if (!checkAdminAuth(password)) {
    res.status(401).json({ error: "Invalid admin password." });
    return;
  }

  const ticketId = parseInt(req.params["id"] ?? "0");
  try {
    await stopHostedBot(ticketId).catch(() => undefined);
    await updateHostedBot(ticketId, {
      status: "stopped",
      errorMessage: "Deployment reset by admin.",
      aiExplanation: null,
    }).catch(() => undefined);
    logger.info({ ticketId }, "Admin reset bot deployment");
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, ticketId }, "Failed to reset bot");
    res.status(500).json({ error: "Failed to reset bot." });
  }
});

/** DELETE /admin/tickets/:id — delete user account and all associated data */
router.delete("/admin/tickets/:id", async (req, res) => {
  const password = (req.headers["x-admin-password"] as string) || "";
  if (!checkAdminAuth(password)) {
    res.status(401).json({ error: "Invalid admin password." });
    return;
  }

  const ticketId = parseInt(req.params["id"] ?? "0");
  try {
    await stopHostedBot(ticketId).catch(() => undefined);
    await db.delete(hostedBotsTable).where(eq(hostedBotsTable.ticketId, ticketId));
    await db.delete(hostingKeysTable).where(eq(hostingKeysTable.ticketId, ticketId));
    await db.delete(ticketsTable).where(eq(ticketsTable.id, ticketId));
    logger.info({ ticketId }, "Admin deleted user account");
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, ticketId }, "Failed to delete user");
    res.status(500).json({ error: "Failed to delete user." });
  }
});

/** POST /admin/keys/:id/revoke — revoke a specific hosting key */
router.post("/admin/keys/:id/revoke", async (req, res) => {
  const password = (req.headers["x-admin-password"] as string) || "";
  if (!checkAdminAuth(password)) {
    res.status(401).json({ error: "Invalid admin password." });
    return;
  }

  const keyId = parseInt(req.params["id"] ?? "0");
  try {
    await db.update(hostingKeysTable).set({ status: "revoked" }).where(eq(hostingKeysTable.id, keyId));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, keyId }, "Failed to revoke key");
    res.status(500).json({ error: "Failed to revoke key." });
  }
});

router.patch("/admin/tickets/:id/link", async (req, res) => {
  const password = (req.headers["x-admin-password"] as string) || "";
  if (!checkAdminAuth(password)) {
    res.status(401).json({ error: "Invalid admin password." });
    return;
  }

  const ticketId = parseInt(req.params["id"] ?? "0");
  const { discordUserId, discordUsername } = req.body as {
    discordUserId?: string;
    discordUsername?: string;
  };

  if (!discordUserId) {
    res.status(400).json({ error: "discordUserId is required" });
    return;
  }

  try {
    await db
      .update(ticketsTable)
      .set({
        ownerId: discordUserId,
        ownerUsername: discordUsername || discordUserId,
      })
      .where(eq(ticketsTable.id, ticketId));

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, ticketId }, "Failed to link Discord ID to ticket");
    res.status(500).json({ error: "Failed to update ticket." });
  }
});

export default router;
