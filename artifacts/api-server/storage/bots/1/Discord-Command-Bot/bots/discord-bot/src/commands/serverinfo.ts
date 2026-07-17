import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Guild,
} from "discord.js";
import type { Command } from "../types.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Get information about this server"),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild as Guild;

    const embed = new EmbedBuilder()
      .setTitle(`🖥️ ${guild.name}`)
      .setThumbnail(guild.iconURL())
      .setColor(0x5865f2)
      .addFields(
        { name: "Owner", value: `<@${guild.ownerId}>`, inline: true },
        { name: "Members", value: `${guild.memberCount}`, inline: true },
        {
          name: "Channels",
          value: `${guild.channels.cache.size}`,
          inline: true,
        },
        { name: "Roles", value: `${guild.roles.cache.size}`, inline: true },
        {
          name: "Boost Level",
          value: `Level ${guild.premiumTier}`,
          inline: true,
        },
        {
          name: "Created",
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
          inline: true,
        }
      )
      .setFooter({ text: `Server ID: ${guild.id}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
