import type { Client } from "discord.js";
import { eq } from "drizzle-orm";
import { db, ticketsTable } from "@workspace/db";
import { logger } from "../lib/logger";

let activeClient: Client | null = null;

export function registerDiscordClient(client: Client): void {
  activeClient = client;
}

/**
 * Send a plain-text message into a ticket's Discord channel. Used so staff
 * stay informed of hosting activity (uploads, restarts, crashes) that
 * originates from the hosting portal website, not just from Discord itself.
 * Never throws -- logs and no-ops if the bot isn't connected or the channel
 * can't be reached.
 */
export async function notifyTicketChannel(
  ticketId: number,
  content: string,
): Promise<void> {
  if (!activeClient) return;

  try {
    const [ticket] = await db
      .select()
      .from(ticketsTable)
      .where(eq(ticketsTable.id, ticketId));
    if (!ticket) return;

    const channel = await activeClient.channels.fetch(ticket.channelId);
    if (channel?.isTextBased() && "send" in channel) {
      await channel.send(content);
    }
  } catch (err) {
    logger.error({ err, ticketId }, "Failed to notify ticket channel");
  }
}
