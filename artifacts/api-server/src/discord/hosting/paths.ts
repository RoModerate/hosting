import path from "node:path";

const storageRoot = path.resolve(process.cwd(), "storage");

export const uploadsDir = path.join(storageRoot, "uploads");
export const botsDir = path.join(storageRoot, "bots");

export function ticketUploadDir(ticketId: number): string {
  return path.join(uploadsDir, String(ticketId));
}

export function ticketBotDir(ticketId: number): string {
  return path.join(botsDir, String(ticketId));
}
