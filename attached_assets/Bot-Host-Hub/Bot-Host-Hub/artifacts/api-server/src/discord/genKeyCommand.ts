import crypto from "node:crypto";
import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { db, hostingKeysTable } from "@workspace/db";
import { getTicketByChannelId, isStaffMember } from "./tickets";

const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function generateAccessKey(): string {
  const groups: string[] = [];
  for (let g = 0; g < 4; g++) {
    let group = "";
    for (let i = 0; i < 4; i++) {
      const byte = crypto.randomBytes(1)[0]!;
      group += KEY_ALPHABET[byte % KEY_ALPHABET.length];
    }
    groups.push(group);
  }
  return groups.join("-");
}

export async function handleGenKey(interaction: ChatInputCommandInteraction): Promise<void> {
  const ticket = await getTicketByChannelId(interaction.channelId);
  if (!ticket) {
    await interaction.reply({
      content: "This command can only be used inside a ticket channel.",
      ephemeral: true,
    });
    return;
  }

  const member = interaction.member as GuildMember | null;
  if (!isStaffMember(member)) {
    await interaction.reply({
      content: "Only staff can generate hosting access keys.",
      ephemeral: true,
    });
    return;
  }

  const days = interaction.options.getInteger("days", true);
  if (days <= 0) {
    await interaction.reply({ content: "Days must be at least 1.", ephemeral: true });
    return;
  }

  const key = generateAccessKey();

  await db.insert(hostingKeysTable).values({
    key,
    ticketId: ticket.id,
    hostingDurationDays: days,
    status: "unused",
    createdByDiscordId: interaction.user.id,
  });

  await interaction.reply({
    content: [
      `Access key generated for ${days} day(s) of hosting:`,
      `\`${key}\``,
      "",
      `Give this to <@${ticket.ownerId}>. They can redeem it on the hosting portal to upload their bot.`,
    ].join("\n"),
  });
}
