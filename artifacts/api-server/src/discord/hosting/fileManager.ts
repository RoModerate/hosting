import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { ticketBotDir } from "./paths";

/** Thrown for any request that would read/write/delete outside a bot's own sandbox. */
export class FileManagerSecurityError extends Error {}

/** Thrown for ordinary "that path doesn't exist" / "not a file" style failures. */
export class FileManagerError extends Error {}

const MAX_TEXT_FILE_BYTES = 4 * 1024 * 1024; // 4MB — plenty for source/config files
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB per file

export const MAX_FILE_UPLOAD_BYTES = MAX_UPLOAD_BYTES;

export interface FileEntry {
  name: string;
  path: string; // relative to the bot's root, forward-slash separated
  type: "file" | "directory" | "symlink";
  size: number;
  extension: string | null;
}

/** The sandbox root for a given ticket's uploaded bot. Everything below must stay inside this. */
export function botFilesRoot(ticketId: number): string {
  return ticketBotDir(ticketId);
}

/**
 * Resolves a user-supplied relative path against the bot's sandbox root,
 * rejecting anything that would escape it — path traversal (`../..`),
 * absolute-path overrides, null bytes, and symlinks that point outside the
 * sandbox are all refused. Returns the absolute path on disk; the caller is
 * responsible for checking whether it actually exists.
 */
export function resolveBotPath(ticketId: number, relPath: string | undefined | null): string {
  const root = botFilesRoot(ticketId);
  const clean = (relPath ?? "").replace(/\\/g, "/");

  if (clean.includes("\0")) {
    throw new FileManagerSecurityError("Invalid path.");
  }

  // path.resolve with a leading "/" would otherwise treat the segment as
  // absolute and discard `root` entirely — strip any leading slashes first.
  const normalizedRel = clean.replace(/^\/+/, "");
  const resolved = path.resolve(root, normalizedRel);

  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new FileManagerSecurityError("That path is outside your bot's files.");
  }

  // Defend against symlinks planted inside the extracted ZIP that point
  // somewhere outside the sandbox (e.g. a symlink to /etc/passwd). We walk
  // up from the resolved path to the deepest existing ancestor and canonicalize
  // that, then re-check containment.
  let toCheck = resolved;
  while (!fs.existsSync(toCheck)) {
    const parent = path.dirname(toCheck);
    if (parent === toCheck) break;
    toCheck = parent;
  }
  try {
    const real = fs.realpathSync(toCheck);
    if (real !== root && !real.startsWith(root + path.sep) && real !== path.dirname(root)) {
      // Only reject if the existing ancestor itself resolves outside the
      // sandbox — a non-existent target path (e.g. a new file being
      // created) is fine as long as its existing ancestor is contained.
      if (toCheck === resolved) {
        throw new FileManagerSecurityError("That path is outside your bot's files.");
      }
    }
  } catch (err) {
    if (err instanceof FileManagerSecurityError) throw err;
    // realpath failing for other reasons (e.g. permissions) — fall through,
    // the plain containment check above already protects us.
  }

  return resolved;
}

function extensionOf(name: string): string | null {
  const ext = path.extname(name);
  return ext ? ext.toLowerCase() : null;
}

function toRelPath(root: string, absPath: string): string {
  const rel = path.relative(root, absPath);
  return rel.split(path.sep).join("/");
}

/** Ensures the bot's sandbox directory exists on disk (it may not yet, if nothing was ever uploaded). */
export function ensureBotFilesRootExists(ticketId: number): boolean {
  return fs.existsSync(botFilesRoot(ticketId));
}

export async function listDirectory(ticketId: number, relPath: string): Promise<FileEntry[]> {
  const root = botFilesRoot(ticketId);
  const abs = resolveBotPath(ticketId, relPath);

  let stat: fs.Stats;
  try {
    stat = await fsp.stat(abs);
  } catch {
    throw new FileManagerError("That folder doesn't exist.");
  }
  if (!stat.isDirectory()) {
    throw new FileManagerError("That path is a file, not a folder.");
  }

  const entries = await fsp.readdir(abs, { withFileTypes: true });
  const out: FileEntry[] = [];
  for (const entry of entries) {
    const entryAbs = path.join(abs, entry.name);
    let size = 0;
    let type: FileEntry["type"] = "file";
    try {
      const lst = await fsp.lstat(entryAbs);
      if (lst.isSymbolicLink()) {
        type = "symlink";
      } else if (lst.isDirectory()) {
        type = "directory";
      } else {
        type = "file";
        size = lst.size;
      }
    } catch {
      continue;
    }
    out.push({
      name: entry.name,
      path: toRelPath(root, entryAbs),
      type,
      size,
      extension: type === "file" ? extensionOf(entry.name) : null,
    });
  }

  out.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return out;
}

export interface ReadFileResult {
  content: string | null;
  isBinary: boolean;
  size: number;
  truncated: boolean;
}

/** Heuristic binary sniff: a NUL byte in the first chunk means "don't treat as text". */
function looksBinary(buf: Buffer): boolean {
  const sample = buf.subarray(0, Math.min(buf.length, 8000));
  return sample.includes(0);
}

export async function readFileContent(ticketId: number, relPath: string): Promise<ReadFileResult> {
  const abs = resolveBotPath(ticketId, relPath);

  let stat: fs.Stats;
  try {
    stat = await fsp.lstat(abs);
  } catch {
    throw new FileManagerError("That file doesn't exist.");
  }
  if (stat.isSymbolicLink()) {
    throw new FileManagerSecurityError("Symlinks cannot be opened.");
  }
  if (!stat.isFile()) {
    throw new FileManagerError("That path is a folder, not a file.");
  }

  const truncated = stat.size > MAX_TEXT_FILE_BYTES;
  const buf = await fsp.readFile(abs, {});
  const slice = truncated ? (buf as unknown as Buffer).subarray(0, MAX_TEXT_FILE_BYTES) : (buf as unknown as Buffer);

  if (looksBinary(slice)) {
    return { content: null, isBinary: true, size: stat.size, truncated: false };
  }

  return { content: slice.toString("utf-8"), isBinary: false, size: stat.size, truncated };
}

/** Writes text content to a file, creating parent directories and the file itself if needed. */
export async function writeFileContent(ticketId: number, relPath: string, content: string): Promise<void> {
  const abs = resolveBotPath(ticketId, relPath);
  if (Buffer.byteLength(content, "utf-8") > MAX_TEXT_FILE_BYTES) {
    throw new FileManagerError("That file is too large to save from the editor.");
  }

  let existingStat: fs.Stats | null = null;
  try {
    existingStat = await fsp.lstat(abs);
  } catch {
    existingStat = null;
  }
  if (existingStat) {
    if (existingStat.isSymbolicLink()) throw new FileManagerSecurityError("Symlinks cannot be edited.");
    if (existingStat.isDirectory()) throw new FileManagerError("That path is a folder, not a file.");
  }

  await fsp.mkdir(path.dirname(abs), { recursive: true });
  await fsp.writeFile(abs, content, "utf-8");
}

/** Writes an uploaded (possibly binary) buffer to a file, creating parent directories as needed. */
export async function writeUploadedFile(ticketId: number, relPath: string, buffer: Buffer): Promise<void> {
  const abs = resolveBotPath(ticketId, relPath);
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new FileManagerError(`That file is larger than the ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))}MB limit.`);
  }

  let existingStat: fs.Stats | null = null;
  try {
    existingStat = await fsp.lstat(abs);
  } catch {
    existingStat = null;
  }
  if (existingStat) {
    if (existingStat.isSymbolicLink()) throw new FileManagerSecurityError("Symlinks cannot be replaced.");
    if (existingStat.isDirectory()) throw new FileManagerError("A folder already exists at that path.");
  }

  await fsp.mkdir(path.dirname(abs), { recursive: true });
  await fsp.writeFile(abs, buffer);
}

export async function createDirectory(ticketId: number, relPath: string): Promise<void> {
  const abs = resolveBotPath(ticketId, relPath);
  if (fs.existsSync(abs)) {
    throw new FileManagerError("Something already exists at that path.");
  }
  await fsp.mkdir(abs, { recursive: true });
}

export interface SearchResult {
  path: string;
  name: string;
  type: "file" | "directory" | "symlink";
  size: number;
  extension: string | null;
}

/**
 * Recursively searches the bot's file tree for entries whose name contains
 * `query` (case-insensitive). Returns at most `limit` results.
 */
export async function searchFiles(
  ticketId: number,
  query: string,
  limit = 200,
): Promise<SearchResult[]> {
  const root = botFilesRoot(ticketId);
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (results.length >= limit || depth > 12) return;
    let entries: fs.Dirent[];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= limit) break;
      // Skip node_modules and .git for performance
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const absPath = path.join(dir, entry.name);
      let type: SearchResult["type"] = "file";
      let size = 0;
      try {
        const lst = await fsp.lstat(absPath);
        if (lst.isSymbolicLink()) type = "symlink";
        else if (lst.isDirectory()) type = "directory";
        else { type = "file"; size = lst.size; }
      } catch { continue; }

      if (entry.name.toLowerCase().includes(q)) {
        results.push({
          path: toRelPath(root, absPath),
          name: entry.name,
          type,
          size,
          extension: type === "file" ? extensionOf(entry.name) : null,
        });
      }
      if (type === "directory") {
        await walk(absPath, depth + 1);
      }
    }
  }

  await walk(root, 0);
  return results;
}

export async function deletePath(ticketId: number, relPath: string): Promise<void> {
  const root = botFilesRoot(ticketId);
  const abs = resolveBotPath(ticketId, relPath);

  if (abs === root) {
    throw new FileManagerSecurityError("You can't delete your bot's root folder.");
  }

  let stat: fs.Stats;
  try {
    stat = await fsp.lstat(abs);
  } catch {
    throw new FileManagerError("That path doesn't exist.");
  }

  if (stat.isDirectory() && !stat.isSymbolicLink()) {
    await fsp.rm(abs, { recursive: true, force: true });
  } else {
    await fsp.unlink(abs);
  }
}
