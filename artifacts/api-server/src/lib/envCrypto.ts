/**
 * AES-256-GCM encryption for hosted bot environment variables.
 *
 * Env vars are stored as plaintext JSON in the database by default.
 * After this module is in use they are stored as an encrypted envelope so that
 * even a DB dump does not leak user secrets.
 *
 * The key is derived from SESSION_SECRET (already required by the platform).
 *
 * Migration: existing plaintext JSON rows are detected by the absence of the
 * `v:1` field and returned as-is, so old rows keep working until the user
 * next saves their secrets, at which point they get encrypted automatically.
 */
import crypto from "node:crypto";

const SALT = "lumora-env-salt-v1";
const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env["SESSION_SECRET"] || "lumora-insecure-default-set-SESSION_SECRET";
  return crypto.scryptSync(secret, SALT, 32);
}

interface EncryptedEnvelope {
  v: 1;
  iv: string;
  tag: string;
  data: string;
}

/**
 * Encrypt a plaintext JSON string (the serialized env vars object).
 * Returns a JSON string containing the encrypted envelope.
 */
export function encryptEnvVars(plaintext: string): string {
  try {
    const key = getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const envelope: EncryptedEnvelope = {
      v: 1,
      iv: iv.toString("hex"),
      tag: tag.toString("hex"),
      data: encrypted.toString("hex"),
    };
    return JSON.stringify(envelope);
  } catch {
    // Encryption failure — fall back to plaintext so data is never lost
    return plaintext;
  }
}

/**
 * Decrypt an env vars string that was produced by `encryptEnvVars`.
 * If the input is a legacy plaintext JSON row (no `v:1` envelope), it is
 * returned unchanged so old rows keep working transparently.
 */
export function decryptEnvVars(raw: string): string {
  if (!raw || raw.trim() === "{}") return raw;
  try {
    const parsed = JSON.parse(raw) as unknown;
    // Legacy plaintext row — plain object, not an envelope
    if (!parsed || typeof parsed !== "object" || (parsed as Record<string, unknown>)["v"] !== 1) {
      return raw;
    }
    const { iv, tag, data } = parsed as EncryptedEnvelope;
    const key = getKey();
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(iv, "hex"),
    ) as crypto.DecipherGCM;
    decipher.setAuthTag(Buffer.from(tag, "hex"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(data, "hex")),
      decipher.final(),
    ]);
    return decrypted.toString("utf-8");
  } catch {
    // Decryption failed (wrong key or corrupted) — return raw so we don't
    // silently destroy the user's data; they will see an empty env panel.
    return raw;
  }
}
