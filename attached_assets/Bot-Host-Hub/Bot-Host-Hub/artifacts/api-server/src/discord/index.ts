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
import { discordConfig, hasDiscordConfig } from "./config";
import { commandDefinitions } from "./commandDefinitions";
import { handleInteraction } from "./interactionHandler";
import { handleAttachmentMessage } from "./attachmentHandler";
import { resumeHostedBotsOnBoot } from "./hosting/runner";
import { formatResultMessage } from "./resultFormat";
import { registerDiscordClient } from "./notify";

export function startDiscordBot(): void {
  if (!hasDiscordConfig()) {
    logger.warn(
      "Discord bot not started: DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, or DISCORD_STAFF_ROLE_ID is missing.",
    );
    return;
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

  registerDiscordClient(client);

  client.once(Events.ClientReady, async (readyClient) => {
    logger.info({ user: readyClient.user.tag }, "Discord bot logged in");

    try {
      const rest = new REST().setToken(discordConfig.token);
      const applicationId = readyClient.application.id;
      await rest.put(
        Routes.applicationGuildCommands(applicationId, discordConfig.guildId),
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

  client.login(discordConfig.token).catch((err) => {
    logger.error({ err }, "Failed to log in to Discord");
  });
}
