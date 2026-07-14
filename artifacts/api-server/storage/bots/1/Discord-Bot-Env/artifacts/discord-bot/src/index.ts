import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Events,
  Message,
  ActivityType,
} from "discord.js";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("Missing DISCORD_BOT_TOKEN environment variable. Check your .env file.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = "!";

const commands: Record<string, (msg: Message) => void> = {
  ping(msg) {
    msg.reply("🏓 Pong!");
  },

  hello(msg) {
    msg.reply(`👋 Hello, ${msg.author.username}!`);
  },

  joke(msg) {
    const jokes = [
      "Why don't scientists trust atoms? Because they make up everything.",
      "I told my computer I needed a break. Now it won't stop sending me Kit-Kat ads.",
      "Why do programmers prefer dark mode? Because light attracts bugs.",
      "How many programmers does it take to change a light bulb? None — it's a hardware problem.",
      "Why did the developer go broke? Because he used up all his cache.",
    ];
    const pick = jokes[Math.floor(Math.random() * jokes.length)];
    msg.reply(`😂 ${pick}`);
  },

  roll(msg) {
    const result = Math.floor(Math.random() * 6) + 1;
    msg.reply(`🎲 You rolled a **${result}**!`);
  },

  flip(msg) {
    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    msg.reply(`🪙 **${result}!**`);
  },

  help(msg) {
    msg.reply(
      `📖 **Available commands:**\n` +
        `\`${PREFIX}ping\` — Check if the bot is alive\n` +
        `\`${PREFIX}hello\` — Get a greeting\n` +
        `\`${PREFIX}joke\` — Hear a random joke\n` +
        `\`${PREFIX}roll\` — Roll a 6-sided die\n` +
        `\`${PREFIX}flip\` — Flip a coin\n` +
        `\`${PREFIX}help\` — Show this help message`
    );
  },
};

client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ Logged in as ${readyClient.user.tag}`);
  readyClient.user.setActivity("!help for commands", { type: ActivityType.Listening });
});

client.on(Events.MessageCreate, (msg) => {
  if (msg.author.bot) return;
  if (!msg.content.startsWith(PREFIX)) return;

  const [rawCommand, ...args] = msg.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = rawCommand.toLowerCase();

  const handler = commands[command];
  if (handler) {
    handler(msg);
  } else {
    msg.reply(`❓ Unknown command \`${PREFIX}${command}\`. Try \`${PREFIX}help\`.`);
  }
});

client.login(token);
