const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) { console.error("DISCORD_BOT_TOKEN not set"); process.exit(1); }
client.login(token);