import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Generic key-value store for runtime configuration (Discord credentials, etc.)
 * Values stored here override environment variables when the Discord bot connects.
 */
export const appConfigTable = pgTable("app_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type AppConfig = typeof appConfigTable.$inferSelect;
