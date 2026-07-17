import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import type { Command } from "../types.js";

const responses = [
  // Positive
  { text: "It is certain.", emoji: "✅" },
  { text: "It is decidedly so.", emoji: "✅" },
  { text: "Without a doubt.", emoji: "✅" },
  { text: "Yes, definitely.", emoji: "✅" },
  { text: "You may rely on it.", emoji: "✅" },
  { text: "As I see it, yes.", emoji: "✅" },
  { text: "Most likely.", emoji: "✅" },
  { text: "Outlook good.", emoji: "✅" },
  { text: "Yes.", emoji: "✅" },
  { text: "Signs point to yes.", emoji: "✅" },
  // Neutral
  { text: "Reply hazy, try again.", emoji: "🔄" },
  { text: "Ask again later.", emoji: "🔄" },
  { text: "Better not tell you now.", emoji: "🔄" },
  { text: "Cannot predict now.", emoji: "🔄" },
  { text: "Concentrate and ask again.", emoji: "🔄" },
  // Negative
  { text: "Don't count on it.", emoji: "❌" },
  { text: "My reply is no.", emoji: "❌" },
  { text: "My sources say no.", emoji: "❌" },
  { text: "Outlook not so good.", emoji: "❌" },
  { text: "Very doubtful.", emoji: "❌" },
];

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8-ball a question")
    .addStringOption((opt) =>
      opt
        .setName("question")
        .setDescription("Your yes/no question")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const question = interaction.options.getString("question", true);
    const response = responses[Math.floor(Math.random() * responses.length)];

    const embed = new EmbedBuilder()
      .setTitle("🎱 Magic 8-Ball")
      .setColor(0x000000)
      .addFields(
        { name: "Question", value: question },
        { name: "Answer", value: `${response.emoji} ${response.text}` }
      )
      .setFooter({ text: `Asked by ${interaction.user.displayName}` });

    await interaction.reply({ embeds: [embed] });
  },
};
