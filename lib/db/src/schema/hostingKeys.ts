import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Status lifecycle: unused -> active (set on redeem) -> expired | revoked
export const hostingKeysTable = pgTable("hosting_keys", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  ticketId: integer("ticket_id").notNull(),
  hostingDurationDays: integer("hosting_duration_days").notNull(),
  status: text("status").notNull().default("unused"),
  createdByDiscordId: text("created_by_discord_id").notNull(),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertHostingKeySchema = createInsertSchema(hostingKeysTable).omit({
  id: true,
  createdAt: true,
});
export type InsertHostingKey = z.infer<typeof insertHostingKeySchema>;
export type HostingKey = typeof hostingKeysTable.$inferSelect;
