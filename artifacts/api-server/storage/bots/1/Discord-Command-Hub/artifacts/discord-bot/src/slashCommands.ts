import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';

const JOKES = [
  "Why don't scientists trust atoms? Because they make up everything!",
  "Why did the scarecrow win an award? He was outstanding in his field!",
  "Why don't skeletons fight each other? They don't have the guts.",
  "What do you call a fake noodle? An impasta.",
  "Why did the bicycle fall over? It was two-tired!",
  "What do you call cheese that isn't yours? Nacho cheese.",
  "What do you get when you cross a snowman and a vampire? Frostbite.",
  "Why did the golfer bring extra pants? In case he got a hole in one!",
  "What do you call a sleeping dinosaur? A dino-snore!",
  "Why did the math book look so sad? It had too many problems.",
  "What do you call a fish without eyes? A fsh!",
  "I told my wife she was drawing her eyebrows too high. She looked surprised.",
  "Why can't you give Elsa a balloon? She'll let it go.",
  "What do you call a group of cows playing instruments? A moo-sical band!",
  "Why did the computer go to the doctor? It had a virus!",
  "What do you call a bear with no teeth? A gummy bear!",
  "Why don't eggs tell jokes? They'd crack each other up.",
  "What do you call a lazy kangaroo? A pouch potato!",
  "Why did the invisible man turn down a job? He couldn't see himself doing it.",
  "What's a computer's favourite snack? Microchips!",
];

const EIGHTBALL_RESPONSES = [
  "✅ It is certain.",
  "✅ It is decidedly so.",
  "✅ Without a doubt.",
  "✅ Yes, definitely.",
  "✅ You may rely on it.",
  "✅ As I see it, yes.",
  "✅ Most likely.",
  "✅ Outlook good.",
  "✅ Yes.",
  "✅ Signs point to yes.",
  "🔮 Reply hazy, try again.",
  "🔮 Ask again later.",
  "🔮 Better not tell you now.",
  "🔮 Cannot predict now.",
  "🔮 Concentrate and ask again.",
  "❌ Don't count on it.",
  "❌ My reply is no.",
  "❌ My sources say no.",
  "❌ Outlook not so good.",
  "❌ Very doubtful.",
];

export interface SlashCommand {
  data: ReturnType<SlashCommandBuilder['toJSON']> extends object
    ? SlashCommandBuilder
    : SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export function getSlashCommands(): SlashCommand[] {
  return [
    // ─── 1. /ping ────────────────────────────────────────────────────────────
    {
      data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot latency'),
      async execute(interaction) {
        const sent = await interaction.reply({ content: 'Pinging…', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🏓 Pong!')
          .addFields(
            { name: 'Bot Latency', value: `\`${latency}ms\``, inline: true },
            { name: 'API Latency', value: `\`${interaction.client.ws.ping}ms\``, inline: true },
          )
          .setTimestamp();
        await interaction.editReply({ content: '', embeds: [embed] });
      },
    },

    // ─── 2. /help ────────────────────────────────────────────────────────────
    {
      data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands'),
      async execute(interaction) {
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('📖 Command List')
          .setDescription('Here are all available commands:')
          .addFields(
            {
              name: '🔷 Slash Commands (/)',
              value: [
                '`/ping` — Check bot latency',
                '`/help` — Show this menu',
                '`/userinfo [user]` — Get user info',
                '`/serverinfo` — Get server info',
                '`/avatar [user]` — Display avatar',
                '`/roll [dice]` — Roll dice (e.g. 2d6)',
                '`/coinflip` — Flip a coin',
                '`/eightball <question>` — Ask the magic 8-ball',
                '`/poll <question> <opt1> <opt2>` — Create a poll',
                '`/joke` — Get a random joke',
              ].join('\n'),
            },
            {
              name: '❗ Prefix Commands (!)',
              value: [
                '`!kick @user [reason]` — Kick a member',
                '`!ban @user [reason]` — Ban a member',
                '`!mute @user <time> [reason]` — Timeout a member',
                '`!warn @user [reason]` — Warn a member',
                '`!clear <1-100>` — Bulk delete messages',
                '`!say <message>` — Make the bot speak',
                '`!embed <title> | <desc>` — Post an embed',
                '`!remindme <time> <msg>` — Set a reminder',
                '`!color <hex>` — Preview a hex colour',
                '`!botinfo` — Show bot statistics',
              ].join('\n'),
            },
          )
          .setFooter({ text: 'Prefix: !  •  Need help? Use /help' })
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
      },
    },

    // ─── 3. /userinfo ────────────────────────────────────────────────────────
    {
      data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Get information about a user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('The user to look up').setRequired(false),
        ),
      async execute(interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;
        const member = await interaction.guild?.members.fetch(target.id).catch(() => null);
        const roles =
          member?.roles.cache
            .filter(r => r.id !== interaction.guildId)
            .map(r => r.toString())
            .join(', ') ?? 'None';
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`👤 ${target.username}`)
          .setThumbnail(target.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: 'Display Name', value: target.displayName, inline: true },
            { name: 'ID', value: target.id, inline: true },
            { name: 'Bot', value: target.bot ? 'Yes' : 'No', inline: true },
            {
              name: 'Account Created',
              value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`,
              inline: true,
            },
            ...(member
              ? [
                  {
                    name: 'Joined Server',
                    value: `<t:${Math.floor((member.joinedTimestamp ?? 0) / 1000)}:R>`,
                    inline: true,
                  },
                  { name: 'Roles', value: roles || 'None', inline: false },
                ]
              : []),
          )
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
      },
    },

    // ─── 4. /serverinfo ──────────────────────────────────────────────────────
    {
      data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Get information about this server'),
      async execute(interaction) {
        const guild = interaction.guild;
        if (!guild)
          return void (await interaction.reply({
            content: '❌ This command must be used inside a server.',
            ephemeral: true,
          }));
        const owner = await guild.fetchOwner().catch(() => null);
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`🏠 ${guild.name}`)
          .setThumbnail(guild.iconURL() ?? null)
          .addFields(
            { name: 'Server ID', value: guild.id, inline: true },
            { name: 'Owner', value: owner?.user.username ?? 'Unknown', inline: true },
            { name: 'Members', value: guild.memberCount.toString(), inline: true },
            { name: 'Channels', value: guild.channels.cache.size.toString(), inline: true },
            { name: 'Roles', value: guild.roles.cache.size.toString(), inline: true },
            {
              name: 'Boosts',
              value: (guild.premiumSubscriptionCount ?? 0).toString(),
              inline: true,
            },
            {
              name: 'Created',
              value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
              inline: true,
            },
            {
              name: 'Verification Level',
              value: ['None', 'Low', 'Medium', 'High', 'Highest'][guild.verificationLevel] ?? 'Unknown',
              inline: true,
            },
          )
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
      },
    },

    // ─── 5. /avatar ──────────────────────────────────────────────────────────
    {
      data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription("Get a user's avatar")
        .addUserOption(opt =>
          opt.setName('user').setDescription('The user').setRequired(false),
        ),
      async execute(interaction) {
        const target = interaction.options.getUser('user') ?? interaction.user;
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`🖼️ ${target.username}'s Avatar`)
          .setDescription(
            [`[PNG](${target.displayAvatarURL({ extension: 'png', size: 512 })})`,
             `[JPG](${target.displayAvatarURL({ extension: 'jpg', size: 512 })})`,
             `[WEBP](${target.displayAvatarURL({ extension: 'webp', size: 512 })})`].join(' | '),
          )
          .setImage(target.displayAvatarURL({ size: 512 }))
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
      },
    },

    // ─── 6. /roll ────────────────────────────────────────────────────────────
    {
      data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Roll dice (e.g. 2d6, 1d20)')
        .addStringOption(opt =>
          opt
            .setName('dice')
            .setDescription('Dice notation like 2d6 or 1d20 (default: 1d6)')
            .setRequired(false),
        ),
      async execute(interaction) {
        const input = interaction.options.getString('dice') ?? '1d6';
        const match = input.match(/^(\d+)d(\d+)$/i);
        if (!match)
          return void (await interaction.reply({
            content: '❌ Invalid format. Use e.g. `2d6` or `1d20`.',
            ephemeral: true,
          }));
        const count = Math.min(parseInt(match[1]), 20);
        const sides = Math.min(parseInt(match[2]), 1000);
        if (count < 1 || sides < 2)
          return void (await interaction.reply({
            content: '❌ Invalid dice values.',
            ephemeral: true,
          }));
        const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
        const total = rolls.reduce((a, b) => a + b, 0);
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`🎲 Rolling ${count}d${sides}`)
          .addFields(
            { name: 'Rolls', value: `\`${rolls.join(', ')}\``, inline: true },
            { name: 'Total', value: `**${total}**`, inline: true },
            { name: 'Average', value: (sides / 2 + 0.5).toFixed(1) + ' per die', inline: true },
          )
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
      },
    },

    // ─── 7. /coinflip ────────────────────────────────────────────────────────
    {
      data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin'),
      async execute(interaction) {
        const heads = Math.random() < 0.5;
        const embed = new EmbedBuilder()
          .setColor(heads ? 0xf1c40f : 0x95a5a6)
          .setTitle('🪙 Coin Flip!')
          .setDescription(`The coin landed on **${heads ? 'Heads' : 'Tails'}**!`)
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
      },
    },

    // ─── 8. /eightball ───────────────────────────────────────────────────────
    {
      data: new SlashCommandBuilder()
        .setName('eightball')
        .setDescription('Ask the magic 8-ball a question')
        .addStringOption(opt =>
          opt.setName('question').setDescription('Your yes/no question').setRequired(true),
        ),
      async execute(interaction) {
        const question = interaction.options.getString('question', true);
        const response =
          EIGHTBALL_RESPONSES[Math.floor(Math.random() * EIGHTBALL_RESPONSES.length)];
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('🎱 Magic 8-Ball')
          .addFields(
            { name: '❓ Question', value: question },
            { name: '🎱 Answer', value: response },
          )
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
      },
    },

    // ─── 9. /poll ────────────────────────────────────────────────────────────
    {
      data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a poll with up to 4 options')
        .addStringOption(opt =>
          opt.setName('question').setDescription('The poll question').setRequired(true),
        )
        .addStringOption(opt =>
          opt.setName('option1').setDescription('First option').setRequired(true),
        )
        .addStringOption(opt =>
          opt.setName('option2').setDescription('Second option').setRequired(true),
        )
        .addStringOption(opt =>
          opt.setName('option3').setDescription('Third option (optional)').setRequired(false),
        )
        .addStringOption(opt =>
          opt.setName('option4').setDescription('Fourth option (optional)').setRequired(false),
        ),
      async execute(interaction) {
        const question = interaction.options.getString('question', true);
        const options = [
          interaction.options.getString('option1', true),
          interaction.options.getString('option2', true),
          interaction.options.getString('option3'),
          interaction.options.getString('option4'),
        ].filter((o): o is string => o !== null);
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`📊 ${question}`)
          .setDescription(options.map((o, i) => `${emojis[i]} **${o}**`).join('\n\n'))
          .setFooter({ text: `Poll by ${interaction.user.username} • React to vote!` })
          .setTimestamp();
        const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
        for (let i = 0; i < options.length; i++) {
          await msg.react(emojis[i]);
        }
      },
    },

    // ─── 10. /joke ───────────────────────────────────────────────────────────
    {
      data: new SlashCommandBuilder()
        .setName('joke')
        .setDescription('Get a random joke'),
      async execute(interaction) {
        const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle('😄 Random Joke')
          .setDescription(joke)
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
      },
    },
  ];
}
