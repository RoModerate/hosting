import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import type { Command } from "../types.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all available commands"),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle("📖 Bot Commands")
      .setColor(0x5865f2)
      .setDescription("Here's everything I can do:")
      .addFields(
        {
          name: "🏓 `/ping`",
          value: "Check the bot's response latency",
          inline: true,
        },
        {
          name: "👋 `/hello`",
          value: "Get a greeting from the bot",
          inline: true,
        },
        {
          name: "❓ `/help`",
          value: "Show this help message",
          inline: true,
        },
        {
          name: "🎲 `/roll`",
          value: "Roll a dice (e.g. `/roll sides:20`)",
          inline: true,
        },
        {
          name: "🎱 `/8ball`",
          value: "Ask the magic 8-ball a question",
          inline: true,
        },
        {
          name: "🖥️ `/serverinfo`",
          value: "Show info about this server",
          inline: true,
        },
        {
          name: "👤 `/userinfo`",
          value: "Show info about a user",
          inline: true,
        },
        {
          name: "💬 Mentions",
          value: "Mention me and I'll respond!",
          inline: true,
        }
      )
      .setFooter({ text: "Tip: You can also just @mention me!" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
