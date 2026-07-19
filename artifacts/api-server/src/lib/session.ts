import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  hostingKeysTable,
  ticketsTable,
  appConfigTable,
  type HostingKey,
  type Ticket,
} from "@workspace/db";

const SESSION_COOKIE = "hosting_session";

export interface DiscordProfile {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
}

interface SessionPayload {
  keyId: number;
  discord?: DiscordProfile;
}

export interface ResolvedSession {
  key: HostingKey;
  ticket: Ticket;
  discord: DiscordProfile | null;
}

export function issueSessionCookie(res: Response, key: HostingKey): void {
  const payload: SessionPayload = { keyId: key.id };
  _setCookie(res, key, payload);
}

export function issueSessionCookieWithDiscord(
  res: Response,
  key: HostingKey,
  discord: DiscordProfile,
): void {
  const payload: SessionPayload = { keyId: key.id, discord };
  _setCookie(res, key, payload);
}

function _setCookie(res: Response, key: HostingKey, payload: SessionPayload): void {
  const maxAge = key.expiresAt
    ? Math.max(key.expiresAt.getTime() - Date.now(), 0)
    : undefined;

  res.cookie(SESSION_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    signed: true,
    path: "/",
    ...(maxAge !== undefined ? { maxAge } : {}),
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

/**
 * Resolves the current hosting session from the signed session cookie.
 * Returns null if there is no session, the cookie was tampered with, the key
 * was revoked, or the key's granted hosting duration has elapsed.
 */
export async function resolveSession(
  req: Request,
): Promise<ResolvedSession | null> {
  const raw = (req as Request & { signedCookies?: Record<string, unknown> })
    .signedCookies?.[SESSION_COOKIE];
  if (!raw || typeof raw !== "string") return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(raw) as SessionPayload;
  } catch {
    return null;
  }

  if (!payload.keyId) return null;

  const [key] = await db
    .select()
    .from(hostingKeysTable)
    .where(eq(hostingKeysTable.id, payload.keyId));
  if (!key || key.status !== "active" || !key.expiresAt) return null;

  if (key.expiresAt.getTime() <= Date.now()) {
    await db
      .update(hostingKeysTable)
      .set({ status: "expired" })
      .where(eq(hostingKeysTable.id, key.id));
    return null;
  }

  const [ticket] = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.id, key.ticketId));
  if (!ticket) return null;

  // Check timed ban
  const [banRow] = await db
    .select()
    .from(appConfigTable)
    .where(eq(appConfigTable.key, `ban:ticket:${ticket.id}`));
  if (banRow) {
    try {
      const ban = JSON.parse(banRow.value) as { expiresAt: string };
      if (ban.expiresAt === "permanent" || new Date(ban.expiresAt).getTime() > Date.now()) {
        return null; // banned
      }
      // Ban expired — clean it up asynchronously
      db.delete(appConfigTable).where(eq(appConfigTable.key, `ban:ticket:${ticket.id}`)).catch(() => {});
    } catch { /* malformed ban entry — ignore */ }
  }

  return { key, ticket, discord: payload.discord ?? null };
}
