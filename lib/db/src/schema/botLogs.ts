import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Persistent log history per hosted bot.
 * One row per lifecycle event (crash, stop, deploy, start).
 * Survives server restarts unlike the in-memory live log buffer.
 */
export const botLogsTable = pgTable("bot_logs", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  // "crash" | "stop" | "start" | "deploy"
  eventType: text("event_type").notNull(),
  logContent: text("log_content").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BotLog = typeof botLogsTable.$inferSelect;
