import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import type { Command } from "../types.js";

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Get information about a user")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("The user to look up (defaults to you)")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const member = interaction.guild?.members.cache.get(target.id) as
      | GuildMember
      | undefined;

    const embed = new EmbedBuilder()
      .setTitle(`👤 ${target.displayName}`)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .setColor(member?.displayColor ?? 0x5865f2)
      .addFields(
        { name: "Username", value: target.username, inline: true },
        { name: "ID", value: target.id, inline: true },
        { name: "Bot?", value: target.bot ? "Yes" : "No", inline: true },
        {
          name: "Account Created",
          value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`,
          inline: true,
        }
      );

    if (member) {
      embed.addFields(
        {
          name: "Joined Server",
          value: member.joinedTimestamp
            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
            : "Unknown",
          inline: true,
        },
        {
          name: "Roles",
          value:
            member.roles.cache
              .filter((r) => r.id !== interaction.guild?.id)
              .map((r) => `<@&${r.id}>`)
              .join(", ") || "None",
          inline: false,
        }
      );
    }

    embed.setFooter({ text: `Requested by ${interaction.user.displayName}` });

    await interaction.reply({ embeds: [embed] });
  },
};
