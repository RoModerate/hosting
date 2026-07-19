import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, ticketsTable, hostingKeysTable } from "@workspace/db";
import { issueSessionCookieWithDiscord } from "../lib/session";
import { logger } from "../lib/logger";
import { getHostedBotStatus } from "../discord/hosting/runner";
import crypto from "crypto";

const router = Router();

const DISCORD_CLIENT_ID = process.env["DISCORD_CLIENT_ID"] ?? "";
const DISCORD_CLIENT_SECRET = process.env["DISCORD_CLIENT_SECRET"] ?? "";
const DISCORD_BOT_TOKEN = process.env["DISCORD_BOT_TOKEN"] ?? "";
const DISCORD_GUILD_ID = process.env["DISCORD_GUILD_ID"] ?? "";
const DISCORD_STAFF_ROLE_ID = process.env["DISCORD_STAFF_ROLE_ID"] ?? "";

/**
 * Check whether a Discord user has the staff role in the guild using the bot
 * token. Returns false on any error so it never blocks login attempts.
 */
async function isStaffMember(discordUserId: string): Promise<boolean> {
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID || !DISCORD_STAFF_ROLE_ID) {
    return false;
  }
  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`,
      { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } },
    );
    if (!res.ok) return false;
    const member = await res.json() as { roles: string[] };
    return member.roles.includes(DISCORD_STAFF_ROLE_ID);
  } catch {
    return false;
  }
}

/**
 * Find or auto-provision a ticket + active key for a staff member so they can
 * always log in without going through the admin panel first.
 */
async function getOrCreateStaffAccess(discordUser: {
  id: string;
  username: string;
  global_name?: string | null;
}): Promise<{ ticket: typeof ticketsTable.$inferSelect; key: typeof hostingKeysTable.$inferSelect }> {
  // Use a stable synthetic channel ID so we can find/create the ticket
  const syntheticChannelId = `staff-${discordUser.id}`;

  const [existingTicket] = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.channelId, syntheticChannelId));

  let ticket = existingTicket;

  if (!ticket) {
    const [created] = await db
      .insert(ticketsTable)
      .values({
        guildId: DISCORD_GUILD_ID,
        channelId: syntheticChannelId,
        ownerId: discordUser.id,
        ownerUsername: discordUser.username,
        status: "open",
      })
      .returning();
    ticket = created;
    logger.info({ discordId: discordUser.id }, "Auto-provisioned staff ticket");
  }

  // Find an existing active key for this ticket
  const keys = await db
    .select()
    .from(hostingKeysTable)
    .where(eq(hostingKeysTable.ticketId, ticket.id));

  const activeKey = keys.find(
    (k) => k.status === "active" && k.expiresAt && k.expiresAt.getTime() > Date.now(),
  );

  if (activeKey) return { ticket, key: activeKey };

  // Create a long-lived key (10 years) for staff
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 10);

  const [newKey] = await db
    .insert(hostingKeysTable)
    .values({
      key: crypto.randomBytes(16).toString("hex"),
      ticketId: ticket.id,
      hostingDurationDays: 3650,
      status: "active",
      createdByDiscordId: discordUser.id,
      redeemedAt: new Date(),
      expiresAt,
    })
    .returning();

  logger.info({ discordId: discordUser.id }, "Auto-provisioned staff hosting key");
  return { ticket, key: newKey };
}

// GET /api/auth/discord/url — frontend calls this to get the OAuth redirect URL
router.get("/auth/discord/url", (req, res) => {
  if (!DISCORD_CLIENT_ID) {
    res.status(503).json({ error: "Discord OAuth is not configured. DISCORD_CLIENT_ID is missing." });
    return;
  }

  const redirectUri = (req.query["redirect_uri"] as string) || "";
  if (!redirectUri) {
    res.status(400).json({ error: "redirect_uri is required" });
    return;
  }

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
  });

  res.json({ url: `https://discord.com/api/oauth2/authorize?${params}` });
});

// POST /api/auth/discord/exchange — exchange code for session
router.post("/auth/discord/exchange", async (req, res) => {
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    res.status(503).json({ error: "Discord OAuth is not configured on this server." });
    return;
  }

  const { code, redirectUri } = req.body as { code?: string; redirectUri?: string };

  if (!code || !redirectUri) {
    res.status(400).json({ error: "code and redirectUri are required" });
    return;
  }

  let discordUser: {
    id: string;
    username: string;
    global_name?: string | null;
    avatar?: string | null;
  };

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      logger.warn({ status: tokenRes.status, err }, "Discord token exchange failed");
      res.status(400).json({ error: "Failed to exchange Discord code. The code may have expired." });
      return;
    }

    const tokenData = await tokenRes.json() as { access_token: string };
    const accessToken = tokenData.access_token;

    // Get Discord user info
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      res.status(400).json({ error: "Failed to retrieve Discord profile." });
      return;
    }

    discordUser = await userRes.json() as typeof discordUser;
  } catch (err) {
    logger.error({ err }, "Discord OAuth exchange error");
    res.status(500).json({ error: "Discord authentication failed. Please try again." });
    return;
  }

  // Staff members (those with the designated staff role) always get in — their
  // ticket and key are auto-provisioned on first login.
  const staff = await isStaffMember(discordUser.id);

  let activeKey: typeof hostingKeysTable.$inferSelect;
  let matchedTicket: typeof ticketsTable.$inferSelect;

  if (staff) {
    const provisioned = await getOrCreateStaffAccess(discordUser);
    activeKey = provisioned.key;
    matchedTicket = provisioned.ticket;
  } else {
    // Regular users: find an existing ticket + active key
    const tickets = await db
      .select()
      .from(ticketsTable)
      .where(eq(ticketsTable.ownerId, discordUser.id));

    if (tickets.length === 0) {
      res.status(403).json({
        error: "no_ticket",
        message: "No hosting access was found for your Discord account. Please contact staff to get a hosting key.",
      });
      return;
    }

    let foundKey = null;
    let foundTicket = null;

    for (const ticket of tickets) {
      const keys = await db
        .select()
        .from(hostingKeysTable)
        .where(eq(hostingKeysTable.ticketId, ticket.id));

      const active = keys.find(
        (k) =>
          k.status === "active" &&
          k.expiresAt &&
          k.expiresAt.getTime() > Date.now(),
      );

      if (active) {
        foundKey = active;
        foundTicket = ticket;
        break;
      }
    }

    if (!foundKey || !foundTicket) {
      res.status(403).json({
        error: "key_expired",
        message: "Your hosting access has expired. Please contact staff to renew.",
      });
      return;
    }

    activeKey = foundKey;
    matchedTicket = foundTicket;
  }

  const discordProfile = {
    id: discordUser.id,
    username: discordUser.username,
    globalName: discordUser.global_name ?? null,
    avatar: discordUser.avatar ?? null,
  };

  issueSessionCookieWithDiscord(res, activeKey, discordProfile);

  const bot = await getHostedBotStatus(matchedTicket.id);

  res.json({
    ticketId: matchedTicket.id,
    ownerUsername: matchedTicket.ownerUsername,
    expiresAt: activeKey.expiresAt!.toISOString(),
    hostingDurationDays: activeKey.hostingDurationDays,
    discord: discordProfile,
    hostedBot: bot
      ? {
          fileName: bot.fileName,
          status: bot.status,
          startCommand: bot.startCommand || null,
          restartCount: bot.restartCount,
          repairAttempts: bot.repairAttempts ?? 0,
          errorMessage: bot.errorMessage ?? null,
          aiExplanation: bot.aiExplanation ?? null,
          lastStartedAt: bot.lastStartedAt ? bot.lastStartedAt.toISOString() : null,
        }
      : null,
  });
});

export default router;
