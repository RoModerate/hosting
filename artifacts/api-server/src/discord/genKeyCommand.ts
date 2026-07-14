import crypto from "node:crypto";
import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { db, hostingKeysTable, ticketsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
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

  await interaction.deferReply({ ephemeral: false });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("This command can only be used in a server.");
    return;
  }

  // Try to find an existing ticket for this channel
  let ticket = await getTicketByChannelId(interaction.channelId);

  if (!ticket) {
    // Not a ticket channel — require a user mention to create one on the fly
    const targetUser = interaction.options.getUser("user");
    if (!targetUser) {
      await interaction.editReply(
        "You're not in a ticket channel. Use `/genkey days:<n> user:@customer` to specify who the key is for.",
      );
      return;
    }

    // Check if this user already has an open ticket in this guild
    const [existing] = await db
      .select()
      .from(ticketsTable)
      .where(
        and(
          eq(ticketsTable.guildId, guild.id),
          eq(ticketsTable.ownerId, targetUser.id),
          eq(ticketsTable.status, "open"),
        ),
      );

    if (existing) {
      // Reuse the existing ticket
      ticket = existing;
    } else {
      // Auto-create a ticket for this user in the current channel
      const [inserted] = await db
        .insert(ticketsTable)
        .values({
          guildId: guild.id,
          channelId: interaction.channelId,
          ownerId: targetUser.id,
          ownerUsername: targetUser.username,
          status: "open",
        })
        .onConflictDoNothing()
        .returning();

      if (!inserted) {
        // Channel already registered under a different ticket — fetch it
        const [refetched] = await db
          .select()
          .from(ticketsTable)
          .where(eq(ticketsTable.channelId, interaction.channelId));
        if (!refetched) {
          await interaction.editReply("Failed to create a ticket entry. Please try again.");
          return;
        }
        ticket = refetched;
      } else {
        ticket = inserted;
      }
    }
  }

  const targetUserId = ticket.ownerId;
  const key = generateAccessKey();

  await db.insert(hostingKeysTable).values({
    key,
    ticketId: ticket.id,
    hostingDurationDays: days,
    status: "unused",
    createdByDiscordId: interaction.user.id,
  });

  await interaction.editReply(
    [
      `Access key generated for ${days} day(s) of hosting:`,
      `\`${key}\``,
      "",
      `Give this to <@${targetUserId}>. They can redeem it on the hosting portal to upload their bot.`,
    ].join("\n"),
  );
}
