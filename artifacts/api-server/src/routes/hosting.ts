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
  getHostedBotEnvVars,
  getHostedBotStatus,
  hostUploadedZip,
  MAX_ZIP_BYTES,
  restartHostedBot,
  setHostedBotEnvVars,
  stopHostedBot,
  ticketUploadDir,
  updateHostedBot,
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
    repairAttempts: bot.repairAttempts ?? 0,
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

    // ── ZIP integrity check on the in-memory buffer (before writing to disk) ──
    // This gives the client an immediate 400 for corrupt/truncated ZIPs instead
    // of a 202 that later fails during background extraction.
    {
      const buf = file.buffer;

      if (buf.length < 22) {
        res.status(400).json({ error: "Upload failed. Your ZIP was incomplete or corrupted. Please upload again." });
        return;
      }

      // Local-file-header magic: PK\x03\x04
      if (buf[0] !== 0x50 || buf[1] !== 0x4b) {
        res.status(400).json({ error: "The file you uploaded is not a ZIP archive. Please upload a .zip file." });
        return;
      }

      // End-of-Central-Directory scan — catches uploads interrupted mid-transfer.
      const eocdWindow = Math.min(buf.length, 65536 + 22);
      const eocdStart  = buf.length - eocdWindow;
      let eocdFound = false;
      for (let i = eocdWindow - 4; i >= 0; i--) {
        if (
          buf[eocdStart + i]     === 0x50 &&
          buf[eocdStart + i + 1] === 0x4b &&
          buf[eocdStart + i + 2] === 0x05 &&
          buf[eocdStart + i + 3] === 0x06
        ) {
          eocdFound = true;
          break;
        }
      }
      if (!eocdFound) {
        logger.warn(
          { ticketId: session.ticket.id, fileName: file.originalname, size: buf.length },
          "ZIP upload rejected: EOCD not found (likely interrupted transfer)",
        );
        res.status(400).json({ error: "Upload failed. Your ZIP was incomplete or corrupted — the transfer may have been interrupted. Please upload again." });
        return;
      }
    }

    try {
      const uploadDir = ticketUploadDir(session.ticket.id);
      await fs.mkdir(uploadDir, { recursive: true });
      const zipPath = path.join(uploadDir, file.originalname);
      await fs.writeFile(zipPath, file.buffer);

      // Mark as installing in DB immediately so the dashboard sees it on the next poll
      await updateHostedBot(session.ticket.id, {
        fileName: file.originalname,
        extractPath: "",
        status: "installing",
        errorMessage: null,
        aiExplanation: null,
      });

      // Respond immediately — client will poll for status updates
      res.status(202).json({ status: "processing" });

      // Continue processing in the background
      const ticketId = session.ticket.id;
      hostUploadedZip({
        ticketId,
        zipPath,
        fileName: file.originalname,
        onCrash: (info) => {
          notifyTicketChannel(
            ticketId,
            `The hosted bot stopped unexpectedly (exit code ${info.exitCode ?? "unknown"}). The customer can restart it from the hosting portal.`,
          ).catch(() => undefined);
        },
      })
        .then((result) => {
          notifyTicketChannel(
            ticketId,
            formatResultMessage(result, "Uploaded via hosting portal"),
          ).catch(() => undefined);
        })
        .catch((err) => {
          logger.error({ err, ticketId }, "Background hosting failed");
          updateHostedBot(ticketId, {
            status: "error",
            errorMessage: "An unexpected server error occurred during deployment.",
          }).catch(() => undefined);
        });
    } catch (err) {
      logger.error({ err, ticketId: session.ticket.id }, "Failed to start bot upload");
      res.status(500).json({ error: "Failed to start deployment. Please try again." });
    }
  },
);

router.get("/bots/env", async (req, res) => {
  const session = await resolveSession(req);
  if (!session) {
    clearSessionCookie(res);
    res.status(401).json({ error: "Your session has expired. Please redeem your access key again." });
    return;
  }

  const vars = await getHostedBotEnvVars(session.ticket.id);
  res.json({ vars });
});

router.post("/bots/env", async (req, res) => {
  const session = await resolveSession(req);
  if (!session) {
    clearSessionCookie(res);
    res.status(401).json({ error: "Your session has expired. Please redeem your access key again." });
    return;
  }

  const body = req.body as { vars?: unknown };
  if (!body || typeof body.vars !== "object" || body.vars === null || Array.isArray(body.vars)) {
    res.status(400).json({ error: "Expected a JSON object of environment variables." });
    return;
  }

  const rawVars = body.vars as Record<string, unknown>;
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawVars)) {
    const trimmedKey = key.trim();
    if (!trimmedKey) continue;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmedKey)) {
      res.status(400).json({ error: `"${trimmedKey}" is not a valid environment variable name.` });
      return;
    }
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      res.status(400).json({ error: `The value for "${trimmedKey}" must be text.` });
      return;
    }
    vars[trimmedKey] = String(value);
  }

  try {
    await setHostedBotEnvVars(session.ticket.id, vars);
    res.json({ ok: true, vars });
  } catch (err) {
    logger.error({ err, ticketId: session.ticket.id }, "Failed to save hosted bot env vars");
    res.status(500).json({ error: "Failed to save secrets. Please try again." });
  }
});

router.post("/bots/stop", async (req, res) => {
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

  const result = await stopHostedBot(session.ticket.id);

  notifyTicketChannel(
    session.ticket.id,
    formatResultMessage(result, "Stopped via hosting portal"),
  ).catch(() => undefined);

  res.json(toHostOutcome(result));
});

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

  // Flip status to "starting" in the DB immediately so the portal begins
  // polling for progress — then return right away. The actual restart (which
  // takes several seconds for the startup probe) runs in the background.
  await updateHostedBot(session.ticket.id, {
    status: "starting",
    errorMessage: null,
    aiExplanation: null,
  });
  res.json({ status: "starting", message: "Bot restart initiated." });

  const ticketId = session.ticket.id;
  const crashCallback = (info: { exitCode: number | null }) => {
    notifyTicketChannel(
      ticketId,
      `The hosted bot stopped unexpectedly (exit code ${info.exitCode ?? "unknown"}). The customer can restart it from the hosting portal.`,
    ).catch(() => undefined);
  };

  setImmediate(async () => {
    try {
      const result = await restartHostedBot(ticketId, crashCallback);
      notifyTicketChannel(
        ticketId,
        formatResultMessage(result, "Restarted via hosting portal"),
      ).catch(() => undefined);
    } catch (err) {
      logger.error({ err, ticketId }, "Background restart failed");
    }
  });
});

export default router;
