import {
  Client,
  GatewayIntentBits,
  Events,
  Message,
  ActivityType,
} from "discord.js";

const token = process.env["DISCORD_TOKEN"];

if (!token) {
  console.error("❌ DISCORD_TOKEN environment variable is not set.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

const PREFIX = "!";

const commands: Record<string, (msg: Message) => void> = {
  ping: (msg) => {
    const latency = Date.now() - msg.createdTimestamp;
    msg.reply(`🏓 Pong! Latency: **${latency}ms** | API: **${Math.round(client.ws.ping)}ms**`);
  },

  hello: (msg) => {
    msg.reply(`👋 Hello, **${msg.author.username}**! Nice to meet you.`);
  },

  help: (msg) => {
    const list = Object.keys(commands)
      .map((cmd) => `\`${PREFIX}${cmd}\``)
      .join(" · ");
    msg.reply(`📋 **Available commands:** ${list}`);
  },

  say: (msg) => {
    const text = msg.content.slice(`${PREFIX}say`.length).trim();
    if (!text) {
      msg.reply("Please provide some text after `!say`.");
      return;
    }
    msg.channel.send(text);
  },

  server: (msg) => {
    if (!msg.guild) {
      msg.reply("This command only works in a server.");
      return;
    }
    msg.reply(
      `🏠 **${msg.guild.name}** — **${msg.guild.memberCount}** members`
    );
  },
};

client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ Logged in as ${readyClient.user.tag}`);
  readyClient.user.setActivity("your commands", { type: ActivityType.Listening });
});

client.on(Events.MessageCreate, (msg) => {
  if (msg.author.bot) return;
  if (!msg.content.startsWith(PREFIX)) return;

  const args = msg.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args[0]?.toLowerCase();

  if (!commandName) return;

  const handler = commands[commandName];
  if (!handler) {
    msg.reply(`❓ Unknown command \`${PREFIX}${commandName}\`. Try \`${PREFIX}help\`.`);
    return;
  }

  try {
    handler(msg);
  } catch (err) {
    console.error(`Error running command "${commandName}":`, err);
    msg.reply("⚠️ Something went wrong running that command.");
  }
});

client.on(Events.Error, (err) => {
  console.error("Discord client error:", err);
});

client.login(token);
