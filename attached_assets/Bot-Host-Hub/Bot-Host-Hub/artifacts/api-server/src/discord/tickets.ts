import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";
import { and, eq } from "drizzle-orm";
import { db, ticketsTable, type Ticket } from "@workspace/db";
import { discordConfig } from "./config";
import { stopProcess } from "./hosting/processManager";

const EMBED_COLOR = 0x2b2d31;

function sanitizeChannelName(name: string): string {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-");
  const trimmed = cleaned.replace(/^-+|-+$/g, "");
  return (trimmed || "customer").slice(0, 80);
}

export function isStaffMember(member: GuildMember | null): boolean {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return member.roles.cache.has(discordConfig.staffRoleId);
}

export async function isStaffOrOwner(
  member: GuildMember | null,
  ticket: Ticket,
  userId: string,
): Promise<boolean> {
  if (userId === ticket.ownerId) return true;
  return isStaffMember(member);
}

export async function getTicketByChannelId(channelId: string): Promise<Ticket | null> {
  const [ticket] = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.channelId, channelId));
  return ticket ?? null;
}

export async function createTicket(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  const [existing] = await db
    .select()
    .from(ticketsTable)
    .where(
      and(
        eq(ticketsTable.guildId, guild.id),
        eq(ticketsTable.ownerId, interaction.user.id),
        eq(ticketsTable.status, "open"),
      ),
    );

  if (existing) {
    await interaction.reply({
      content: `You already have an open ticket: <#${existing.channelId}>`,
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  let category = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === discordConfig.ticketCategoryName,
  );
  if (!category) {
    category = await guild.channels.create({
      name: discordConfig.ticketCategoryName,
      type: ChannelType.GuildCategory,
    });
  }

  const channelName = `ticket-${sanitizeChannelName(interaction.user.username)}`;
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: discordConfig.staffRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ],
  });

  await db.insert(ticketsTable).values({
    guildId: guild.id,
    channelId: channel.id,
    ownerId: interaction.user.id,
    ownerUsername: interaction.user.username,
  });

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle("Hosting Support Ticket")
    .setDescription(
      [
        "Describe your issue below, or upload your bot's ZIP file to have it hosted.",
        "",
        "Requirements for the ZIP file:",
        "- A package.json file at the root, or inside a single top-level folder",
        '- Either a "start" script, a "main" entry file, or an index.js file',
        "- Include a .env file in the ZIP if your bot needs a token or other secrets",
        "",
        "Once uploaded, the bot will be installed and started automatically. If anything fails, the exact error will be posted here.",
        "",
        "Commands: /status, /restart, /close, /help",
      ].join("\n"),
    );

  await channel.send({
    content: `<@${interaction.user.id}> <@&${discordConfig.staffRoleId}>`,
    embeds: [embed],
  });

  await interaction.editReply({ content: `Ticket created: <#${channel.id}>` });
}

export async function closeTicket(interaction: ChatInputCommandInteraction): Promise<void> {
  const ticket = await getTicketByChannelId(interaction.channelId);
  if (!ticket) {
    await interaction.reply({ content: "This command can only be used inside a ticket channel.", ephemeral: true });
    return;
  }

  const member = interaction.member as GuildMember | null;
  if (!(await isStaffOrOwner(member, ticket, interaction.user.id))) {
    await interaction.reply({ content: "Only the ticket owner or staff can close this ticket.", ephemeral: true });
    return;
  }

  if (ticket.status === "closed") {
    await interaction.reply({ content: "This ticket is already closed.", ephemeral: true });
    return;
  }

  stopProcess(ticket.id);

  await db
    .update(ticketsTable)
    .set({ status: "closed", closedAt: new Date() })
    .where(eq(ticketsTable.id, ticket.id));

  await interaction.reply("Closing this ticket. The channel will be deleted shortly.");

  const channel = interaction.channel;
  setTimeout(() => {
    if (channel && "delete" in channel) {
      channel.delete().catch(() => undefined);
    }
  }, 5000);
}
