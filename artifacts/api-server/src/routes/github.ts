import path from "node:path";
import fs from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { Router, type IRouter } from "express";
import {
  getHostedBotStatus,
  hostUploadedZip,
  ticketUploadDir,
  updateHostedBot,
} from "../discord/hosting/runner";
import { formatResultMessage } from "../discord/resultFormat";
import { notifyTicketChannel } from "../discord/notify";
import { clearSessionCookie, resolveSession } from "../lib/session";
import { logger } from "../lib/logger";

const execAsync = promisify(exec);
const router: IRouter = Router();

/** Clone a public GitHub repo, zip it, then hand it to the standard hosting pipeline. */
router.post("/bots/deploy-github", async (req, res) => {
  const session = await resolveSession(req);
  if (!session) {
    clearSessionCookie(res);
    res.status(401).json({ error: "Your session has expired. Please redeem your access key again." });
    return;
  }

  const { repoUrl, language } = req.body as { repoUrl?: string; language?: string };

  if (!repoUrl || typeof repoUrl !== "string") {
    res.status(400).json({ error: "A GitHub repository URL is required." });
    return;
  }

  // Only allow HTTPS GitHub URLs (public repos, no auth)
  const ghPattern = /^https:\/\/github\.com\/[\w.\-]+\/[\w.\-]+(\.git)?$/i;
  const cleanUrl = repoUrl.replace(/\/$/, "").replace(/\.git$/, "");
  if (!ghPattern.test(cleanUrl + ".git") && !ghPattern.test(cleanUrl)) {
    res.status(400).json({ error: "Only public GitHub repository URLs (https://github.com/user/repo) are supported." });
    return;
  }

  // Extract repo name for the zip filename
  const repoName = cleanUrl.split("/").pop() || "bot";
  const fileName = `${repoName}.zip`;

  const tmpCloneDir = path.join("/tmp", `lumora-gh-${session.ticket.id}-${Date.now()}`);
  const uploadDir = ticketUploadDir(session.ticket.id);
  const zipPath = path.join(uploadDir, fileName);

  // Respond immediately — client will poll for status
  await updateHostedBot(session.ticket.id, {
    fileName,
    extractPath: "",
    status: "installing",
    errorMessage: null,
    aiExplanation: null,
  });
  res.status(202).json({ status: "processing" });

  // Run in background
  const ticketId = session.ticket.id;
  setImmediate(async () => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.mkdir(tmpCloneDir, { recursive: true });

      // Clone with depth=1 (shallow) for speed
      logger.info({ ticketId, repoUrl: cleanUrl }, "GitHub deploy: cloning repo");
      await execAsync(`git clone --depth 1 "${cleanUrl}.git" "${tmpCloneDir}"`, {
        timeout: 60_000,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      });

      // Zip the cloned directory using the system zip command
      logger.info({ ticketId }, "GitHub deploy: zipping cloned repo");
      const cloneParent = path.dirname(tmpCloneDir);
      const cloneDirName = path.basename(tmpCloneDir);
      await execAsync(`cd "${cloneParent}" && zip -r "${zipPath}" "${cloneDirName}"`, {
        timeout: 60_000,
      });

      // Clean up clone dir
      await fs.rm(tmpCloneDir, { recursive: true, force: true });

      logger.info({ ticketId, zipPath }, "GitHub deploy: starting bot hosting");
      const result = await hostUploadedZip({
        ticketId,
        zipPath,
        fileName,
        onCrash: (info) => {
          notifyTicketChannel(
            ticketId,
            `The hosted bot stopped unexpectedly (exit code ${info.exitCode ?? "unknown"}). The customer can restart it from the hosting portal.`,
          ).catch(() => undefined);
        },
      });

      notifyTicketChannel(
        ticketId,
        formatResultMessage(result, `Deployed from GitHub: ${cleanUrl}`),
      ).catch(() => undefined);
    } catch (err: any) {
      logger.error({ err, ticketId, repoUrl: cleanUrl }, "GitHub deploy failed");
      const message = err?.message?.includes("Authentication failed") || err?.message?.includes("not found")
        ? "Repository not found or is private. Only public repositories are supported."
        : err?.message?.includes("timeout")
        ? "Clone timed out — the repository may be too large. Try a ZIP upload instead."
        : "GitHub deploy failed. Check the repository URL and try again.";
      await updateHostedBot(ticketId, {
        status: "error",
        errorMessage: message,
      }).catch(() => undefined);
      await fs.rm(tmpCloneDir, { recursive: true, force: true }).catch(() => undefined);
    }
  });
});

export default router;
