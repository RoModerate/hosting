import {
  Client,
  GatewayIntentBits,
  Events,
  Collection,
  REST,
  Routes,
} from 'discord.js';
import { getSlashCommands, type SlashCommand } from './slashCommands';
import { getPrefixCommands, type PrefixCommand } from './prefixCommands';

// ─── Configuration ──────────────────────────────────────────────────────────
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const PREFIX = process.env.BOT_PREFIX ?? '!';

if (!TOKEN) {
  console.error('[ERROR] DISCORD_BOT_TOKEN environment variable is not set.');
  process.exit(1);
}

// Extract the Application/Client ID from the bot token (first segment, base64)
const CLIENT_ID = Buffer.from(TOKEN.split('.')[0], 'base64').toString('ascii');

// ─── Client setup ───────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,   // Privileged — enable in Dev Portal
    GatewayIntentBits.GuildMembers,     // Privileged — enable in Dev Portal
    GatewayIntentBits.GuildModeration,
  ],
});

// ─── Load commands ──────────────────────────────────────────────────────────
const slashCommands = getSlashCommands();
const prefixCommands = getPrefixCommands();

const slashMap = new Collection<string, SlashCommand>();
for (const cmd of slashCommands) slashMap.set(cmd.data.name, cmd);

const prefixMap = new Collection<string, PrefixCommand>();
for (const cmd of prefixCommands) prefixMap.set(cmd.name, cmd);

// ─── Ready event — register slash commands ───────────────────────────────────
client.once(Events.ClientReady, async c => {
  console.log(`✅ Logged in as ${c.user.tag} (${c.user.id})`);
  console.log(`📦 Loaded ${slashMap.size} slash commands, ${prefixMap.size} prefix commands`);
  console.log(`🏠 Serving ${c.guilds.cache.size} guild(s)`);

  try {
    const rest = new REST().setToken(TOKEN!);
    const commandData = slashCommands.map(cmd => cmd.data.toJSON());
    const guildId = process.env.DISCORD_GUILD_ID;

    if (guildId) {
      // Guild-scoped commands register instantly — great for development
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), {
        body: commandData,
      });
      console.log(`✅ Registered ${commandData.length} slash commands for guild ${guildId}`);
    } else {
      // Global commands propagate within ~1 hour
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commandData });
      console.log(`✅ Registered ${commandData.length} slash commands globally`);
    }
  } catch (err) {
    console.error('[ERROR] Failed to register slash commands:', err);
  }
});

// ─── Interaction handler (slash commands) ────────────────────────────────────
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = slashMap.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[ERROR] /${interaction.commandName}:`, err);
    const errMsg = { content: '❌ Something went wrong while running that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errMsg).catch(() => null);
    } else {
      await interaction.reply(errMsg).catch(() => null);
    }
  }
});

// ─── Message handler (prefix commands) ───────────────────────────────────────
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  const command = prefixMap.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (err) {
    console.error(`[ERROR] ${PREFIX}${commandName}:`, err);
    await message.reply('❌ Something went wrong running that command.').catch(() => null);
  }
});

// ─── Connect ────────────────────────────────────────────────────────────────
client.login(TOKEN);
