# Common Bot Deployment Patterns & Quick Fixes

This file contains patterns the agent encounters frequently, with proven fixes.

## Quick Diagnostic Workflow

1. `list_files` — understand the structure
2. If Node.js: `read_file("package.json")` — check scripts, dependencies, main field
3. If Python: `read_file("requirements.txt")` and `list_files` for .py files
4. `search_files("login(")` or `search_files("bot.run(")` — find the entry point
5. Apply fix with `write_file` or `install_dependencies`
6. `mark_done`

## Pattern: Correct package.json for a discord.js v14 Bot

```json
{
  "name": "my-discord-bot",
  "version": "1.0.0",
  "description": "Discord bot",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "discord.js": "^14.14.1",
    "dotenv": "^16.0.0"
  }
}
```

## Pattern: Minimal index.js Discord.js v14 Bot

```js
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_BOT_TOKEN);
```

## Pattern: Correct requirements.txt for discord.py Bot

```
discord.py>=2.3.0
python-dotenv>=1.0.0
```

## Pattern: Minimal Python Discord Bot

```python
import discord
import os

intents = discord.Intents.default()
client = discord.Client(intents=intents)

@client.event
async def on_ready():
    print(f'Logged in as {client.user}')

client.run(os.environ.get('DISCORD_BOT_TOKEN'))
```

## Pattern: TypeScript Bot with Build

**package.json:**
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "discord.js": "^14.14.1"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Fixing workspace:* in package.json

**Before (broken):**
```json
{
  "dependencies": {
    "discord.js": "workspace:*",
    "shared-utils": "workspace:^1.0.0"
  }
}
```

**After (fixed):**
```json
{
  "dependencies": {
    "discord.js": "^14.14.1",
    "shared-utils": "*"
  }
}
```

## When to mark_done with requires_user_action: true

- Invalid Discord token (wrong token, expired)
- Privileged intents not enabled in Discord Developer Portal
- Bot token environment variable not configured at all
- Bot has logic errors the agent cannot safely fix
- Database connection string not configured (user needs to add it)
- External API keys missing (OpenAI, etc.)

## When to mark_done with success: true (even without fixes)

- Project structure looks correct and healthy
- All dependencies are listed in package.json/requirements.txt
- Start script is valid and points to an existing file
- No obvious errors in the code (let the probe determine if it actually runs)

## Dangerous Things the Agent Must NEVER Do

- Hardcode Discord bot tokens or any secrets into code
- Install unknown/suspicious packages
- Delete the main entry file
- Rewrite the entire bot from scratch
- Expose env var values in mark_done messages
- Mention internal file paths like `/tmp/` or `storage/` in customer messages
