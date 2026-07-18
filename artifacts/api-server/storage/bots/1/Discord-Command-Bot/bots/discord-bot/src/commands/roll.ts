import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import type { Command } from "../types.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a dice")
    .addIntegerOption((opt) =>
      opt
        .setName("sides")
        .setDescription("Number of sides on the dice (default: 6)")
        .setMinValue(2)
        .setMaxValue(1000)
        .setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("count")
        .setDescription("How many dice to roll (default: 1)")
        .setMinValue(1)
        .setMaxValue(20)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sides = interaction.options.getInteger("sides") ?? 6;
    const count = interaction.options.getInteger("count") ?? 1;

    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }

    const total = rolls.reduce((a, b) => a + b, 0);
    const rollsStr = rolls.join(", ");

    if (count === 1) {
      await interaction.reply(
        `🎲 You rolled a **d${sides}** and got: **${rolls[0]}**`
      );
    } else {
      await interaction.reply(
        `🎲 You rolled **${count}d${sides}**: [${rollsStr}]\n**Total:** ${total}`
      );
    }
  },
};
