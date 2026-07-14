import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  hostingKeysTable,
  ticketsTable,
  type HostingKey,
  type Ticket,
} from "@workspace/db";

const SESSION_COOKIE = "hosting_session";

interface SessionPayload {
  keyId: number;
}

export interface ResolvedSession {
  key: HostingKey;
  ticket: Ticket;
}

export function issueSessionCookie(res: Response, key: HostingKey): void {
  const payload: SessionPayload = { keyId: key.id };
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

  return { key, ticket };
}
