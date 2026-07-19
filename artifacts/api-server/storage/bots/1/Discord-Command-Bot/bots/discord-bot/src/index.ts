import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  Events,
  ChatInputCommandInteraction,
  REST,
  Routes,
} from "discord.js";
import type { Command } from "./types.js";

// Import all commands
import { command as pingCommand } from "./commands/ping.js";
import hailCommand from './commands/hail.js';
import { command as helloCommand } from "./commands/hello.js";
import { command as helpCommand } from "./commands/help.js";
import { command as rollCommand } from "./commands/roll.js";
import { command as eightBallCommand } from "./commands/eightball.js";
import { command as serverInfoCommand } from "./commands/serverinfo.js";
import { command as userInfoCommand } from "./commands/userinfo.js";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) {
  console.error("❌ DISCORD_BOT_TOKEN is not set. Exiting.");
  process.exit(1);
}

// Extend the Client type to include commands
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

// Build the commands collection
const commands = new Collection<string, Command>();
const allCommands: Command[] = [
  pingCommand,
  helloCommand,
  helpCommand,
  rollCommand,
  eightBallCommand,
  serverInfoCommand,
  userInfoCommand,
];

for (const cmd of allCommands) {
  commands.set(cmd.data.name, cmd);
}

// ─── Register slash commands on startup ──────────────────────────────────────
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Logged in as ${readyClient.user.tag}`);
  console.log(`📡 Serving ${readyClient.guilds.cache.size} guild(s)`);

  // Register slash commands globally
  const rest = new REST().setToken(TOKEN!);
  const commandData = allCommands.map((cmd) => cmd.data.toJSON());

  try {
    console.log("🔄 Registering slash commands...");
    await rest.put(Routes.applicationCommands(readyClient.user.id), {
      body: commandData,
    });
    console.log(`✅ Registered ${commandData.length} slash command(s)`);
  } catch (err) {
    console.error("❌ Failed to register slash commands:", err);
  }
});

// ─── Handle slash command interactions ───────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) {
    console.warn(`Unknown command: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction as ChatInputCommandInteraction);
  } catch (err) {
    console.error(`Error executing /${interaction.commandName}:`, err);
    const msg = { content: "❌ Something went wrong running that command.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

// ─── Respond when mentioned ───────────────────────────────────────────────────
client.on(Events.MessageCreate, async (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  const isMentioned =
    message.mentions.has(client.user!) ||
    message.content.includes(`<@${client.user!.id}>`);

  if (!isMentioned) return;

  // Strip the mention from the message to get just the text
  const content = message.content
    .replace(/<@!?[\d]+>/g, "")
    .trim()
    .toLowerCase();

  if (!content || content === "") {
    await message.reply(
      `Hey ${message.author.displayName}! 👋 Need something? Try \`/help\` to see what I can do!`
    );
    return;
  }

  // Simple keyword responses
  if (content.includes("hello") || content.includes("hi") || content.includes("hey")) {
    await message.reply(`Hey ${message.author.displayName}! 👋`);
  } else if (content.includes("ping")) {
    await message.reply(`🏓 Pong! Use \`/ping\` for the proper latency check.`);
  } else if (content.includes("help")) {
    await message.reply(`Use \`/help\` to see all my commands! 📖`);
  } else if (content.includes("thanks") || content.includes("thank you") || content.includes("ty")) {
    await message.reply(`You're welcome, ${message.author.displayName}! 😊`);
  } else if (content.includes("how are you") || content.includes("how r u")) {
    await message.reply(`I'm doing great, thanks for asking! 🤖✨`);
  } else {
    await message.reply(
      `Not sure what you mean, but I'm here! Try \`/help\` to see what I can do. 😄`
    );
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────
client.login(TOKEN);
