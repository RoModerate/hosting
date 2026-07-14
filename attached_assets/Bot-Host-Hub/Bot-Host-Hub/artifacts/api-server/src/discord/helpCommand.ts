import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";

export async function handleHelp(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle("Bot Hosting Support")
    .setDescription(
      [
        "/ticket - Open a new support ticket for hosting your bot",
        "/status - Check the status of the bot hosted in the current ticket",
        "/restart - Restart the bot hosted in the current ticket",
        "/close - Close the current ticket",
        "/genkey - (Staff) Generate a hosting access key for this ticket",
        "/help - Show this message",
        "",
        "To get your bot hosted: open a ticket with /ticket, then ask staff for an access key. Redeem the key on the hosting portal website and upload your bot's ZIP file there.",
      ].join("\n"),
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
