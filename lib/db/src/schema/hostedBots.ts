import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Status lifecycle: pending -> installing -> starting -> running -> crashed | error
// A user can also stop a running bot -> stopped, then restart -> starting again.
export const hostedBotsTable = pgTable("hosted_bots", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  fileName: text("file_name").notNull(),
  extractPath: text("extract_path").notNull(),
  startCommand: text("start_command").notNull(),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  aiExplanation: text("ai_explanation"),
  restartCount: integer("restart_count").notNull().default(0),
  lastStartedAt: timestamp("last_started_at", { withTimezone: true }),
  // JSON-encoded Record<string,string> of user-supplied environment variables
  // (e.g. DISCORD_TOKEN, MONGODB_URI).  Stored as text to avoid a JSON column
  // migration headache on SQLite/PG compatibility shims.
  envVars: text("env_vars").notNull().default("{}"),
  // Detected runtime for the uploaded project: "node" | "python".
  language: text("language").notNull().default("node"),
  // Rolling tail of the bot's live stdout/stderr while running, so crashes
  // and the dashboard's log viewer have something real to show even when
  // the process dies well after the initial startup probe.
  recentLog: text("recent_log").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertHostedBotSchema = createInsertSchema(hostedBotsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertHostedBot = z.infer<typeof insertHostedBotSchema>;
export type HostedBot = typeof hostedBotsTable.$inferSelect;
