/**
 * Manages the live Discord client reference so it can be replaced when config
 * is updated at runtime via the admin panel without restarting the process.
 */
import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
} from "discord.js";
import { eq } from "drizzle-orm";
import { db, ticketsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { commandDefinitions } from "./commandDefinitions";
import { handleInteraction } from "./interactionHandler";
import { handleAttachmentMessage } from "./attachmentHandler";
import { resumeHostedBotsOnBoot } from "./hosting/runner";
import { formatResultMessage } from "./resultFormat";
import { registerDiscordClient } from "./notify";

export interface BotConfig {
  token: string;
  guildId: string;
  staffRoleId: string;
  ticketCategoryName?: string;
}

let activeClient: Client | null = null;
let isConnected = false;
let connectedTag: string | null = null;

export function getBotStatus(): { connected: boolean; tag: string | null } {
  return { connected: isConnected, tag: connectedTag };
}

export async function connectBot(config: BotConfig): Promise<void> {
  // Destroy previous client cleanly
  if (activeClient) {
    try {
      await activeClient.destroy();
    } catch {
      // ignore
    }
    activeClient = null;
    isConnected = false;
    connectedTag = null;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  activeClient = client;
  registerDiscordClient(client);

  client.once(Events.ClientReady, async (readyClient) => {
    isConnected = true;
    connectedTag = readyClient.user.tag;
    logger.info({ user: readyClient.user.tag }, "Discord bot logged in");

    try {
      const rest = new REST().setToken(config.token);
      await rest.put(
        Routes.applicationGuildCommands(readyClient.application.id, config.guildId),
        { body: commandDefinitions },
      );
      logger.info("Registered guild slash commands");
    } catch (err) {
      logger.error({ err }, "Failed to register slash commands");
    }

    try {
      await resumeHostedBotsOnBoot(async (ticketId, result) => {
        try {
          const [ticket] = await db
            .select()
            .from(ticketsTable)
            .where(eq(ticketsTable.id, ticketId));
          if (!ticket) return;
          const channel = await readyClient.channels.fetch(ticket.channelId);
          if (channel?.isTextBased() && "send" in channel) {
            await channel.send(formatResultMessage(result, "Service restarted"));
          }
        } catch (err) {
          logger.error({ err, ticketId }, "Failed to notify ticket after resume");
        }
      });
    } catch (err) {
      logger.error({ err }, "Failed to resume hosted bots on boot");
    }
  });

  client.on(Events.ClientReady, () => {
    isConnected = true;
  });

  // Handle disconnects
  client.on("shardDisconnect" as never, () => {
    isConnected = false;
  });

  client.on(Events.InteractionCreate, (interaction) => {
    handleInteraction(interaction).catch((err) => {
      logger.error({ err }, "Unhandled error in interaction handler");
    });
  });

  client.on(Events.MessageCreate, (message) => {
    handleAttachmentMessage(message).catch((err) => {
      logger.error({ err }, "Unhandled error in message handler");
    });
  });

  await client.login(config.token);
}
