import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, ticketsTable, hostingKeysTable } from "@workspace/db";
import { issueSessionCookieWithDiscord } from "../lib/session";
import { logger } from "../lib/logger";
import { getHostedBotStatus } from "../discord/hosting/runner";

const router = Router();

const DISCORD_CLIENT_ID = process.env["DISCORD_CLIENT_ID"] ?? "";
const DISCORD_CLIENT_SECRET = process.env["DISCORD_CLIENT_SECRET"] ?? "";

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

  // Find tickets owned by this Discord user
  const tickets = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.ownerId, discordUser.id));

  if (tickets.length === 0) {
    res.status(403).json({
      error: "no_ticket",
      message: "No hosting access was found for your Discord account. Please contact staff to get a hosting key.",
      discord: {
        id: discordUser.id,
        username: discordUser.username,
        globalName: discordUser.global_name ?? null,
        avatar: discordUser.avatar ?? null,
      },
    });
    return;
  }

  // Find an active key for any of the user's tickets
  let activeKey = null;
  let matchedTicket = null;

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
      activeKey = active;
      matchedTicket = ticket;
      break;
    }
  }

  if (!activeKey || !matchedTicket) {
    res.status(403).json({
      error: "key_expired",
      message: "Your hosting access has expired. Please contact staff to renew.",
      discord: {
        id: discordUser.id,
        username: discordUser.username,
        globalName: discordUser.global_name ?? null,
        avatar: discordUser.avatar ?? null,
      },
    });
    return;
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
