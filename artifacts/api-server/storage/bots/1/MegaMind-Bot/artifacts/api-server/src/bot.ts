import {
  Client,
  GatewayIntentBits,
  Events,
  type Message,
} from "discord.js";
import { logger } from "./lib/logger";

export function startBot(): void {
  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) {
    logger.warn("DISCORD_BOT_TOKEN not set — Discord bot will not start.");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once(Events.ClientReady, (readyClient) => {
    logger.info({ tag: readyClient.user.tag }, "Discord bot is online");
  });

  client.on(Events.MessageCreate, (message: Message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Reply "MEGAMIND" whenever the bot is mentioned
    if (client.user && message.mentions.has(client.user)) {
      message.reply("MEGAMIND").catch((err) => {
        logger.error({ err }, "Failed to send reply");
      });
    }
  });

  client.login(token).catch((err) => {
    logger.error({ err }, "Discord bot failed to login");
  });
}
