# Python Discord Bot Common Errors & Fixes

## Invalid Token
**Error:** `discord.errors.LoginFailure: Improper token has been passed.`
**Cause:** Wrong token, using Client ID instead of Bot Token, or expired token
**Fix:**
1. Discord Developer Portal → Bot → Reset Token
2. Set `DISCORD_BOT_TOKEN` in your environment
3. Use: `bot.run(os.environ["DISCORD_BOT_TOKEN"])`

## Missing Token / KeyError
**Error:** `KeyError: 'DISCORD_BOT_TOKEN'`
**Fix:**
```python
import os
token = os.environ.get("DISCORD_BOT_TOKEN")
if not token:
    raise ValueError("DISCORD_BOT_TOKEN environment variable is not set")
bot.run(token)
```

## Privileged Intents
**Error:** `discord.errors.PrivilegedIntentsRequired: Shard ID None is requesting privileged intents...`
**Fix:**
1. Discord Developer Portal → Bot → Privileged Gateway Intents
2. Enable Server Members Intent and/or Message Content Intent
3. In your code:
```python
intents = discord.Intents.default()
intents.members = True
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)
```

## Module Not Found
**Error:** `ModuleNotFoundError: No module named 'discord'`
**Cause:** `discord.py` (or `py-cord`, `nextcord`, etc.) not installed
**Fix:** Add to `requirements.txt`:
```
discord.py>=2.0
```
Common package names: `discord.py`, `py-cord`, `nextcord`, `disnake`

## aiohttp / asyncio Errors
**Error:** `RuntimeError: Event loop is closed` or aiohttp connector errors
**Cause:** Running async code incorrectly, or Python version mismatch
**Fix:** Use `asyncio.run(main())` pattern or ensure Python 3.8+

## requirements.txt Issues
- One package per line
- No extra whitespace
- Use `>=` for minimum version: `discord.py>=2.3.0`
- Avoid `git+` URLs unless necessary

## Common Entry Files for Python Bots
- `bot.py` — most common
- `main.py` — also common
- `app.py`, `run.py` — valid alternatives

## Python Version
Lumora runs `python3`. Ensure your bot is compatible with Python 3.8 or newer.
