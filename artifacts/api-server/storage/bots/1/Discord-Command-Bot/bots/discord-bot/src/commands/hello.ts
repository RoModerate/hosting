import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import type { Command } from "../types.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("hello")
    .setDescription("Say hello to the bot"),

  async execute(interaction: ChatInputCommandInteraction) {
    const greetings = [
      `Hey there, ${interaction.user.displayName}! 👋`,
      `Howdy, ${interaction.user.displayName}! 🤠`,
      `Yo ${interaction.user.displayName}, what's up! 😄`,
      `Hello, ${interaction.user.displayName}! Hope you're having a great day! 🌟`,
      `Sup ${interaction.user.displayName}! 🙌`,
    ];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    await interaction.reply(greeting);
  },
};
