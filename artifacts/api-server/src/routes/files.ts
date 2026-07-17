import { Router, type IRouter } from "express";
import multer from "multer";
import {
  clearSessionCookie,
  resolveSession,
} from "../lib/session";
import {
  createDirectory,
  deletePath,
  ensureBotFilesRootExists,
  FileManagerError,
  FileManagerSecurityError,
  listDirectory,
  MAX_FILE_UPLOAD_BYTES,
  readFileContent,
  searchFiles,
  writeFileContent,
  writeUploadedFile,
} from "../discord/hosting/fileManager";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_UPLOAD_BYTES },
});

async function requireSession(req: Parameters<typeof resolveSession>[0]) {
  return resolveSession(req);
}

function handleError(err: unknown, res: import("express").Response): void {
  if (err instanceof FileManagerSecurityError) {
    res.status(403).json({ error: err.message });
    return;
  }
  if (err instanceof FileManagerError) {
    res.status(400).json({ error: err.message });
    return;
  }
  logger.error({ err }, "File manager operation failed");
  res.status(500).json({ error: "Something went wrong. Please try again." });
}

router.get("/bots/files/list", async (req, res) => {
  const session = await requireSession(req);
  if (!session) {
    clearSessionCookie(res);
    res.status(401).json({ error: "Your session has expired. Please redeem your access key again." });
    return;
  }

  if (!ensureBotFilesRootExists(session.ticket.id)) {
    res.json({ entries: [] });
    return;
  }

  try {
    const relPath = typeof req.query["path"] === "string" ? req.query["path"] : "";
    const entries = await listDirectory(session.ticket.id, relPath);
    res.json({ entries });
  } catch (err) {
    handleError(err, res);
  }
});

router.get("/bots/files/read", async (req, res) => {
  const session = await requireSession(req);
  if (!session) {
    clearSessionCookie(res);
    res.status(401).json({ error: "Your session has expired. Please redeem your access key again." });
    return;
  }

  const relPath = typeof req.query["path"] === "string" ? req.query["path"] : "";
  if (!relPath) {
    res.status(400).json({ error: "A file path is required." });
    return;
  }

  try {
    const result = await readFileContent(session.ticket.id, relPath);
    res.json(result);
  } catch (err) {
    handleError(err, res);
  }
});

router.put("/bots/files/write", async (req, res) => {
  const session = await requireSession(req);
  if (!session) {
    clearSessionCookie(res);
    res.status(401).json({ error: "Your session has expired. Please redeem your access key again." });
    return;
  }

  const body = req.body as { path?: unknown; content?: unknown };
  if (typeof body?.path !== "string" || !body.path.trim()) {
    res.status(400).json({ error: "A file path is required." });
    return;
  }
  if (typeof body?.content !== "string") {
    res.status(400).json({ error: "File content must be text." });
    return;
  }

  try {
    await writeFileContent(session.ticket.id, body.path, body.content);
    res.json({ ok: true });
  } catch (err) {
    handleError(err, res);
  }
});

router.post("/bots/files/mkdir", async (req, res) => {
  const session = await requireSession(req);
  if (!session) {
    clearSessionCookie(res);
    res.status(401).json({ error: "Your session has expired. Please redeem your access key again." });
    return;
  }

  const body = req.body as { path?: unknown };
  if (typeof body?.path !== "string" || !body.path.trim()) {
    res.status(400).json({ error: "A folder path is required." });
    return;
  }

  try {
    await createDirectory(session.ticket.id, body.path);
    res.json({ ok: true });
  } catch (err) {
    handleError(err, res);
  }
});

router.post(
  "/bots/files/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err) {
        res.status(400).json({
          error: `Could not process the uploaded file. Max size is ${Math.floor(MAX_FILE_UPLOAD_BYTES / (1024 * 1024))}MB.`,
        });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    const session = await requireSession(req);
    if (!session) {
      clearSessionCookie(res);
      res.status(401).json({ error: "Your session has expired. Please redeem your access key again." });
      return;
    }

    const file = req.file;
    const targetDir = typeof req.body?.path === "string" ? req.body.path : "";
    if (!file) {
      res.status(400).json({ error: "No file was uploaded." });
      return;
    }

    const targetPath = targetDir ? `${targetDir}/${file.originalname}` : file.originalname;

    try {
      await writeUploadedFile(session.ticket.id, targetPath, file.buffer);
      res.json({ ok: true, path: targetPath });
    } catch (err) {
      handleError(err, res);
    }
  },
);

router.get("/bots/files/search", async (req, res) => {
  const session = await requireSession(req);
  if (!session) {
    clearSessionCookie(res);
    res.status(401).json({ error: "Your session has expired. Please redeem your access key again." });
    return;
  }

  const q = typeof req.query["q"] === "string" ? req.query["q"].trim() : "";
  if (!q) {
    res.json({ results: [] });
    return;
  }

  if (!ensureBotFilesRootExists(session.ticket.id)) {
    res.json({ results: [] });
    return;
  }

  try {
    const results = await searchFiles(session.ticket.id, q);
    res.json({ results });
  } catch (err) {
    handleError(err, res);
  }
});

router.delete("/bots/files", async (req, res) => {
  const session = await requireSession(req);
  if (!session) {
    clearSessionCookie(res);
    res.status(401).json({ error: "Your session has expired. Please redeem your access key again." });
    return;
  }

  const relPath = typeof req.query["path"] === "string" ? req.query["path"] : "";
  if (!relPath) {
    res.status(400).json({ error: "A path is required." });
    return;
  }

  try {
    await deletePath(session.ticket.id, relPath);
    res.json({ ok: true });
  } catch (err) {
    handleError(err, res);
  }
});

export default router;
