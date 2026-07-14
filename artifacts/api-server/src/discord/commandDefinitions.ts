import { SlashCommandBuilder } from "discord.js";

export const commandDefinitions = [
  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Open a new hosting support ticket."),
  new SlashCommandBuilder()
    .setName("close")
    .setDescription("Close the current ticket."),
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Check the status of the bot hosted in this ticket."),
  new SlashCommandBuilder()
    .setName("restart")
    .setDescription("Restart the bot hosted in this ticket."),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show available commands."),
  new SlashCommandBuilder()
    .setName("genkey")
    .setDescription("Generate a hosting access key for a customer (staff only).")
    .addIntegerOption((option) =>
      option
        .setName("days")
        .setDescription("Number of days of hosting to grant")
        .setRequired(true)
        .setMinValue(1),
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The customer to generate the key for (required if not inside a ticket channel)")
        .setRequired(false),
    ),
].map((c) => c.toJSON());
