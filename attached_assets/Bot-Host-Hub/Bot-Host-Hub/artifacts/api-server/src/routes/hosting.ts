import path from "node:path";
import fs from "node:fs/promises";
import { Router, type IRouter } from "express";
import multer, { MulterError } from "multer";
import { eq } from "drizzle-orm";
import {
  db,
  hostingKeysTable,
  ticketsTable,
  type HostedBot,
  type HostingKey,
  type Ticket,
} from "@workspace/db";
import { RedeemAccessKeyBody } from "@workspace/api-zod";
import {
  getHostedBotStatus,
  hostUploadedZip,
  MAX_ZIP_BYTES,
  restartHostedBot,
  ticketUploadDir,
  type HostResult,
} from "../discord/hosting/runner";
import { formatResultMessage } from "../discord/resultFormat";
import { notifyTicketChannel } from "../discord/notify";
import {
  clearSessionCookie,
  issueSessionCookie,
  resolveSession,
} from "../lib/session";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ZIP_BYTES },
});

function toHostedBotSummary(bot: HostedBot | null) {
  if (!bot) return null;
  return {
    fileName: bot.fileName,
    status: bot.status,
    startCommand: bot.startCommand || null,
    restartCount: bot.restartCount,
    errorMessage: bot.errorMessage ?? null,
    aiExplanation: bot.aiExplanation ?? null,
    lastStartedAt: bot.lastStartedAt ? bot.lastStartedAt.toISOString() : null,
  };
}

function buildSessionResponse(
  ticket: Ticket,
  key: HostingKey,
  bot: HostedBot | null,
) {
  return {
    ticketId: ticket.id,
    ownerUsername: ticket.ownerUsername,
    expiresAt: key.expiresAt!.toISOString(),
    hostingDurationDays: key.hostingDurationDays,
    hostedBot: toHostedBotSummary(bot),
  };
}

function toHostOutcome(result: HostResult) {
  return {
    status: result.status,
    message: result.message,
    detail: result.detail ?? null,
    startCommand: result.startCommand ?? null,
    aiExplanation: result.aiExplanation ?? null,
  };
}

router.post("/keys/redeem", async (req, res) => {
  const parsed = RedeemAccessKeyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "An access key is required." });
    return;
  }

  const [row] = await db
    .select()
    .from(hostingKeysTable)
    .where(eq(hostingKeysTable.key, parsed.data.key.trim()));

  if (!row) {
    res.status(400).json({ error: "That access key was not recognized." });
    return;
  }

  if (row.status === "revoked") {
    res.status(400).json({ error: "That access key has been revoked." });
    return;
  }

  let activeKey = row;

  if (row.status === "unused") {
    const expiresAt = new Date(
      Date.now() + row.hostingDurationDays * 24 * 60 * 60 * 1000,
    );
    const [updated] = await db
      .update(hostingKeysTable)
      .set({ status: "active", redeemedAt: new Date(), expiresAt })
      .where(eq(hostingKeysTable.id, row.id))
      .returning();
    activeKey = updated!;
  } else if (row.status === "expired") {
    res.status(400).json({ error: "That access key has expired." });
    return;
  } else if (row.status === "active") {
    if (!row.expiresAt || row.expiresAt.getTime() <= Date.now()) {
      await db
        .update(hostingKeysTable)
        .set({ status: "expired" })
        .where(eq(hostingKeysTable.id, row.id));
      res.status(400).json({ error: "That access key has expired." });
      return;
    }
    // Re-redeeming an already-active key just re-establishes the session
    // (e.g. the customer opens the portal from a different browser).
  }

  const [ticket] = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.id, activeKey.ticketId));
  if (!ticket) {
    res
      .status(400)
      .json({ error: "The ticket associated with this key no longer exists." });
    return;
  }

  issueSessionCookie(res, activeKey);
  const bot = await getHostedBotStatus(ticket.id);
  res.json(buildSessionResponse(ticket, activeKey, bot));
});

router.get("/session/me", async (req, res) => {
  const session = await resolveSession(req);
  if (!session) {
    clearSessionCookie(res);
    res.status(401).json({ error: "No active session." });
    return;
  }

  const bot = await getHostedBotStatus(session.ticket.id);
  res.json(buildSessionResponse(session.ticket, session.key, bot));
});

router.post(
  "/bots/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err) {
        const message =
          err instanceof MulterError && err.code === "LIMIT_FILE_SIZE"
            ? `That file is too large. The maximum accepted size is ${Math.floor(MAX_ZIP_BYTES / (1024 * 1024))}MB.`
            : "Could not process the uploaded file.";
        res.status(400).json({ error: message });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    const session = await resolveSession(req);
    if (!session) {
      clearSessionCookie(res);
      res.status(401).json({ error: "Your session has expired. Please redeem your access key again." });
      return;
    }

    const file = req.file;
    if (!file || !file.originalname.toLowerCase().endsWith(".zip")) {
      res.status(400).json({ error: "Please upload a .zip file." });
      return;
    }

    try {
      const uploadDir = ticketUploadDir(session.ticket.id);
      await fs.mkdir(uploadDir, { recursive: true });
      const zipPath = path.join(uploadDir, file.originalname);
      await fs.writeFile(zipPath, file.buffer);

      const result = await hostUploadedZip({
        ticketId: session.ticket.id,
        zipPath,
        fileName: file.originalname,
        onCrash: (info) => {
          notifyTicketChannel(
            session.ticket.id,
            `The hosted bot stopped unexpectedly (exit code ${info.exitCode ?? "unknown"}). The customer can restart it from the hosting portal.`,
          ).catch(() => undefined);
        },
      });

      notifyTicketChannel(
        session.ticket.id,
        formatResultMessage(result, "Uploaded via hosting portal"),
      ).catch(() => undefined);

      res.json(toHostOutcome(result));
    } catch (err) {
      logger.error({ err, ticketId: session.ticket.id }, "Failed to host uploaded zip from portal");
      res.status(400).json({ error: "An unexpected error occurred while processing your upload." });
    }
  },
);

router.post("/bots/restart", async (req, res) => {
  const session = await resolveSession(req);
  if (!session) {
    clearSessionCookie(res);
    res.status(401).json({ error: "Your session has expired. Please redeem your access key again." });
    return;
  }

  const existing = await getHostedBotStatus(session.ticket.id);
  if (!existing) {
    res.status(400).json({ error: "No bot has been uploaded to this ticket yet." });
    return;
  }

  const result = await restartHostedBot(session.ticket.id, (info) => {
    notifyTicketChannel(
      session.ticket.id,
      `The hosted bot stopped unexpectedly (exit code ${info.exitCode ?? "unknown"}). The customer can restart it from the hosting portal.`,
    ).catch(() => undefined);
  });

  notifyTicketChannel(
    session.ticket.id,
    formatResultMessage(result, "Restarted via hosting portal"),
  ).catch(() => undefined);

  res.json(toHostOutcome(result));
});

export default router;
