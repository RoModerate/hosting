import { Message, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export interface PrefixCommand {
  name: string;
  description: string;
  usage: string;
  execute: (message: Message, args: string[]) => Promise<void>;
}

/** Convert a duration string like "10m", "1h", "30s" to milliseconds. */
function parseDuration(str: string): number {
  const match = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return 0;
  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const map: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return val * (map[unit] ?? 0);
}

function missingPerm(message: Message, text: string): Promise<Message> {
  return message.reply(`❌ ${text}`);
}

export function getPrefixCommands(): PrefixCommand[] {
  return [
    // ─── 1. !kick ──────────────────────────────────────────────────────────
    {
      name: 'kick',
      description: 'Kick a member from the server',
      usage: '!kick @user [reason]',
      async execute(message, args) {
        if (!message.member?.permissions.has(PermissionFlagsBits.KickMembers))
          return void (await missingPerm(message, 'You need the **Kick Members** permission.'));
        const target = message.mentions.members?.first();
        if (!target) return void (await message.reply('❌ Mention a member to kick.'));
        if (!target.kickable) return void (await message.reply('❌ I cannot kick that member.'));
        const reason = args.slice(1).join(' ') || 'No reason provided';
        await target.kick(reason);
        const embed = new EmbedBuilder()
          .setColor(0xff6b6b)
          .setTitle('👢 Member Kicked')
          .addFields(
            { name: 'User', value: `${target.user.username} (${target.id})`, inline: true },
            { name: 'Reason', value: reason, inline: true },
          )
          .setFooter({ text: `Actioned by ${message.author.username}` })
          .setTimestamp();
        await message.reply({ embeds: [embed] });
      },
    },

    // ─── 2. !ban ───────────────────────────────────────────────────────────
    {
      name: 'ban',
      description: 'Ban a member from the server',
      usage: '!ban @user [reason]',
      async execute(message, args) {
        if (!message.member?.permissions.has(PermissionFlagsBits.BanMembers))
          return void (await missingPerm(message, 'You need the **Ban Members** permission.'));
        const target = message.mentions.members?.first();
        if (!target) return void (await message.reply('❌ Mention a member to ban.'));
        if (!target.bannable) return void (await message.reply('❌ I cannot ban that member.'));
        const reason = args.slice(1).join(' ') || 'No reason provided';
        await target.ban({ reason });
        const embed = new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle('🔨 Member Banned')
          .addFields(
            { name: 'User', value: `${target.user.username} (${target.id})`, inline: true },
            { name: 'Reason', value: reason, inline: true },
          )
          .setFooter({ text: `Actioned by ${message.author.username}` })
          .setTimestamp();
        await message.reply({ embeds: [embed] });
      },
    },

    // ─── 3. !mute (timeout) ────────────────────────────────────────────────
    {
      name: 'mute',
      description: 'Timeout a member (e.g. !mute @user 10m spamming)',
      usage: '!mute @user <duration> [reason]',
      async execute(message, args) {
        if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers))
          return void (await missingPerm(message, 'You need the **Moderate Members** permission.'));
        const target = message.mentions.members?.first();
        if (!target) return void (await message.reply('❌ Mention a member to mute.'));
        const durationStr = args[1];
        if (!durationStr)
          return void (await message.reply('❌ Provide a duration: `10m`, `1h`, `30s`, `1d`…'));
        const duration = parseDuration(durationStr);
        if (!duration)
          return void (await message.reply('❌ Invalid duration. Use `10s`, `5m`, `2h`, `1d`.'));
        if (duration > 28 * 24 * 3_600_000)
          return void (await message.reply('❌ Maximum timeout is 28 days.'));
        const reason = args.slice(2).join(' ') || 'No reason provided';
        await target.timeout(duration, reason);
        const embed = new EmbedBuilder()
          .setColor(0xffa500)
          .setTitle('🔇 Member Muted')
          .addFields(
            { name: 'User', value: `${target.user.username} (${target.id})`, inline: true },
            { name: 'Duration', value: durationStr, inline: true },
            { name: 'Reason', value: reason, inline: true },
          )
          .setFooter({ text: `Actioned by ${message.author.username}` })
          .setTimestamp();
        await message.reply({ embeds: [embed] });
      },
    },

    // ─── 4. !warn ──────────────────────────────────────────────────────────
    {
      name: 'warn',
      description: 'Warn a member and DM them the reason',
      usage: '!warn @user [reason]',
      async execute(message, args) {
        if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers))
          return void (await missingPerm(message, 'You need the **Moderate Members** permission.'));
        const target = message.mentions.members?.first();
        if (!target) return void (await message.reply('❌ Mention a member to warn.'));
        const reason = args.slice(1).join(' ') || 'No reason provided';
        await target.user
          .send(`⚠️ You were warned in **${message.guild?.name}**\n**Reason:** ${reason}`)
          .catch(() => null);
        const embed = new EmbedBuilder()
          .setColor(0xffff00)
          .setTitle('⚠️ Member Warned')
          .setDescription(`${target.user.username} has been warned and notified via DM.`)
          .addFields({ name: 'Reason', value: reason })
          .setFooter({ text: `Actioned by ${message.author.username}` })
          .setTimestamp();
        await message.reply({ embeds: [embed] });
      },
    },

    // ─── 5. !clear ─────────────────────────────────────────────────────────
    {
      name: 'clear',
      description: 'Bulk delete messages (1-100)',
      usage: '!clear <amount>',
      async execute(message, args) {
        if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages))
          return void (await missingPerm(message, 'You need the **Manage Messages** permission.'));
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 100)
          return void (await message.reply('❌ Please provide a number between 1 and 100.'));
        if (!('bulkDelete' in message.channel))
          return void (await message.reply('❌ Cannot delete messages here.'));
        const deleted = await message.channel.bulkDelete(amount + 1, true).catch(() => null);
        const count = Math.max(0, (deleted?.size ?? 1) - 1);
        const reply = await message.channel.send(`✅ Deleted **${count}** messages.`);
        setTimeout(() => reply.delete().catch(() => null), 4000);
      },
    },

    // ─── 6. !say ───────────────────────────────────────────────────────────
    {
      name: 'say',
      description: 'Make the bot repeat a message',
      usage: '!say <message>',
      async execute(message, args) {
        if (!args.length) return void (await message.reply('❌ Provide a message to say.'));
        await message.delete().catch(() => null);
        await message.channel.send(args.join(' '));
      },
    },

    // ─── 7. !embed ─────────────────────────────────────────────────────────
    {
      name: 'embed',
      description: 'Post a custom embed  (title | description)',
      usage: '!embed <title> | <description>',
      async execute(message, args) {
        const text = args.join(' ');
        const sep = text.indexOf('|');
        if (sep === -1)
          return void (await message.reply('❌ Usage: `!embed <title> | <description>`'));
        const title = text.slice(0, sep).trim();
        const desc = text.slice(sep + 1).trim();
        if (!title || !desc)
          return void (await message.reply('❌ Both title and description are required.'));
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(title)
          .setDescription(desc)
          .setFooter({ text: `Posted by ${message.author.username}` })
          .setTimestamp();
        await message.delete().catch(() => null);
        await message.channel.send({ embeds: [embed] });
      },
    },

    // ─── 8. !remindme ──────────────────────────────────────────────────────
    {
      name: 'remindme',
      description: 'Set a reminder (DMs you after the duration)',
      usage: '!remindme <duration> <reminder text>',
      async execute(message, args) {
        if (args.length < 2)
          return void (await message.reply('❌ Usage: `!remindme <10m> <message>`'));
        const duration = parseDuration(args[0]);
        if (!duration)
          return void (await message.reply('❌ Invalid duration. Use `10s`, `5m`, `2h`, `1d`.'));
        if (duration > 86_400_000)
          return void (await message.reply('❌ Maximum reminder duration is 24 hours.'));
        const reminder = args.slice(1).join(' ');
        await message.reply(
          `✅ Reminder set! I'll DM you about "**${reminder}**" in **${args[0]}**.`,
        );
        setTimeout(async () => {
          const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('⏰ Reminder!')
            .setDescription(reminder)
            .setTimestamp();
          const dmSent = await message.author.send({ embeds: [embed] }).catch(() => null);
          if (!dmSent) {
            await message.channel
              .send({ content: `<@${message.author.id}>`, embeds: [embed] })
              .catch(() => null);
          }
        }, duration);
      },
    },

    // ─── 9. !color ─────────────────────────────────────────────────────────
    {
      name: 'color',
      description: 'Preview and inspect a hex colour',
      usage: '!color <hex>',
      async execute(message, args) {
        if (!args[0])
          return void (await message.reply('❌ Usage: `!color <hex>` (e.g. `!color FF5733`)'));
        const hex = args[0].replace('#', '');
        if (!/^[0-9a-fA-F]{6}$/.test(hex))
          return void (await message.reply('❌ Invalid hex colour. Use 6 hex digits, e.g. `FF5733`.'));
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const hslStr = (() => {
          const rn = r / 255, gn = g / 255, bn = b / 255;
          const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
          const l = (max + min) / 2;
          const d = max - min;
          const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
          let h = 0;
          if (d !== 0) {
            if (max === rn) h = ((gn - bn) / d) % 6;
            else if (max === gn) h = (bn - rn) / d + 2;
            else h = (rn - gn) / d + 4;
            h = Math.round(h * 60);
            if (h < 0) h += 360;
          }
          return `hsl(${h}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
        })();
        const embed = new EmbedBuilder()
          .setColor(parseInt(hex, 16))
          .setTitle(`🎨 Colour #${hex.toUpperCase()}`)
          .setThumbnail(`https://singlecolorimage.com/get/${hex}/100x100`)
          .addFields(
            { name: 'Hex', value: `#${hex.toUpperCase()}`, inline: true },
            { name: 'RGB', value: `rgb(${r}, ${g}, ${b})`, inline: true },
            { name: 'HSL', value: hslStr, inline: true },
          )
          .setTimestamp();
        await message.reply({ embeds: [embed] });
      },
    },

    // ─── 10. !botinfo ──────────────────────────────────────────────────────
    {
      name: 'botinfo',
      description: 'Display bot statistics',
      usage: '!botinfo',
      async execute(message) {
        const client = message.client;
        const up = process.uptime();
        const d = Math.floor(up / 86400);
        const h = Math.floor((up % 86400) / 3600);
        const m = Math.floor((up % 3600) / 60);
        const s = Math.floor(up % 60);
        const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🤖 Bot Information')
          .setThumbnail(client.user?.displayAvatarURL() ?? null)
          .addFields(
            { name: 'Bot Name', value: client.user?.username ?? 'Unknown', inline: true },
            { name: 'Bot ID', value: client.user?.id ?? 'Unknown', inline: true },
            { name: 'Servers', value: client.guilds.cache.size.toString(), inline: true },
            { name: 'Cached Users', value: client.users.cache.size.toString(), inline: true },
            { name: 'API Ping', value: `${client.ws.ping}ms`, inline: true },
            { name: 'Memory', value: `${mem} MB`, inline: true },
            { name: 'Uptime', value: `${d}d ${h}h ${m}m ${s}s`, inline: true },
            { name: 'Node.js', value: process.version, inline: true },
            { name: 'discord.js', value: 'v14', inline: true },
          )
          .setTimestamp();
        await message.reply({ embeds: [embed] });
      },
    },
  ];
}
