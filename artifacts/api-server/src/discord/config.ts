export const discordConfig = {
  token: process.env["DISCORD_BOT_TOKEN"] ?? "",
  guildId: process.env["DISCORD_GUILD_ID"] ?? "",
  // Strip accidental "staff-" prefix that may be stored in the env var
  staffRoleId: (process.env["DISCORD_STAFF_ROLE_ID"] ?? "").replace(/^staff-/, ""),
  ticketCategoryName: process.env["DISCORD_TICKET_CATEGORY_NAME"] || "Tickets",
};

export function hasDiscordConfig(): boolean {
  return Boolean(
    discordConfig.token && discordConfig.guildId && discordConfig.staffRoleId,
  );
}
