import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { getTicketByChannelId, isStaffOrOwner } from "./tickets";
import { getHostedBotStatus, restartHostedBot, type HostResult } from "./hosting/runner";
import { getRunningProcess } from "./hosting/processManager";
import { formatResultMessage } from "./resultFormat";

export async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  const ticket = await getTicketByChannelId(interaction.channelId);
  if (!ticket) {
    await interaction.reply({ content: "This command can only be used inside a ticket channel.", ephemeral: true });
    return;
  }

  const bot = await getHostedBotStatus(ticket.id);
  if (!bot) {
    await interaction.reply("No bot has been uploaded to this ticket yet.");
    return;
  }

  const lines = [
    `File: ${bot.fileName}`,
    `Status: ${bot.status}`,
    `Start command: ${bot.startCommand || "unknown"}`,
    `Restart count: ${bot.restartCount}`,
  ];

  if (bot.status === "running") {
    const running = getRunningProcess(ticket.id);
    if (running) {
      const uptimeMs = Date.now() - running.startedAt.getTime();
      const uptimeMinutes = Math.floor(uptimeMs / 60000);
      lines.push(`Uptime: ${uptimeMinutes < 1 ? "less than a minute" : `${uptimeMinutes} minute(s)`}`);
    }
  }

  if (bot.errorMessage && bot.status !== "running") {
    lines.push("", "Last error:", "```", bot.errorMessage.slice(0, 1500), "```");
  }

  await interaction.reply(lines.join("\n"));
}

export async function handleRestart(interaction: ChatInputCommandInteraction): Promise<void> {
  const ticket = await getTicketByChannelId(interaction.channelId);
  if (!ticket) {
    await interaction.reply({ content: "This command can only be used inside a ticket channel.", ephemeral: true });
    return;
  }

  const member = interaction.member as GuildMember | null;
  if (!(await isStaffOrOwner(member, ticket, interaction.user.id))) {
    await interaction.reply({ content: "Only the ticket owner or staff can restart this bot.", ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const result: HostResult = await restartHostedBot(ticket.id, (info) => {
    const channel = interaction.channel;
    if (channel && channel.isTextBased() && "send" in channel) {
      channel
        .send(
          `The hosted bot stopped unexpectedly (exit code ${info.exitCode ?? "unknown"}). Use /restart to bring it back up.`,
        )
        .catch(() => undefined);
    }
  });

  await interaction.editReply(formatResultMessage(result));
}
