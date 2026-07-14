import { type Interaction } from "discord.js";
import { logger } from "../lib/logger";
import { createTicket, closeTicket } from "./tickets";
import { handleHelp } from "./helpCommand";
import { handleStatus, handleRestart } from "./statusCommands";
import { handleGenKey } from "./genKeyCommand";

export async function handleInteraction(interaction: Interaction): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  try {
    switch (interaction.commandName) {
      case "ticket":
        await createTicket(interaction);
        break;
      case "close":
        await closeTicket(interaction);
        break;
      case "status":
        await handleStatus(interaction);
        break;
      case "restart":
        await handleRestart(interaction);
        break;
      case "help":
        await handleHelp(interaction);
        break;
      case "genkey":
        await handleGenKey(interaction);
        break;
      default:
        await interaction.reply({ content: "Unknown command.", ephemeral: true });
    }
  } catch (err) {
    logger.error({ err, command: interaction.commandName }, "Command handler failed");
    const errorMessage = "Something went wrong handling that command.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorMessage).catch(() => undefined);
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => undefined);
    }
  }
}
