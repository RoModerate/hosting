# Python Discord Bot Errors & Agent Fixes

## Invalid Token
**Error:** `discord.errors.LoginFailure: Improper token has been passed.`
**Agent action:** `mark_done` with `requires_user_action: true`.
Message: "Your Discord bot token is invalid or expired. Go to Discord Developer Portal → Your Application → Bot → Reset Token and update it in the Secrets panel."

## KeyError / Token Not Set
**Error:** `KeyError: 'DISCORD_BOT_TOKEN'` or `KeyError: 'TOKEN'`
**Agent action:**
1. `search_files("os.environ")` and `search_files("getenv")` to find how the token is read
2. If the bot uses a non-standard var name, fix the code to use `os.environ.get("DISCORD_BOT_TOKEN")`
3. If no token is configured by the user → `mark_done` with `requires_user_action: true`

**Correct Python token pattern:**
```python
import os
token = os.environ.get("DISCORD_BOT_TOKEN")
if not token:
    raise ValueError("DISCORD_BOT_TOKEN not set")
bot.run(token)
```

## Privileged Intents Required
**Error:** `discord.errors.PrivilegedIntentsRequired: Shard ID None is requesting privileged intents...`
**Agent action:** `mark_done` with `requires_user_action: true`.
Message: "Your bot is requesting Discord gateway intents that aren't enabled yet. Go to Discord Developer Portal → Your Application → Bot → Privileged Gateway Intents and enable the ones your bot uses."

**Optional code fix — add intents:**
```python
import discord
intents = discord.Intents.default()
intents.message_content = True  # only if bot uses message content
intents.members = True          # only if bot uses member events
bot = discord.Client(intents=intents)
```

## ModuleNotFoundError: No module named 'discord'
**Agent action:** `install_dependencies("discord.py", runtime="python")`
Then check `requirements.txt` — if it's missing, create it with `write_file`:
```
discord.py>=2.3.0
```

## ModuleNotFoundError (any package)
**Agent action:**
1. Read `requirements.txt` — is the package listed?
2. If not: add it to requirements.txt with `write_file`, then `install_dependencies("package_name", runtime="python")`
3. If listed: `install_dependencies("package_name", runtime="python")`

## Missing requirements.txt
**Agent action:** Create it with `write_file("requirements.txt", "discord.py>=2.3.0\n")`.
If you can see other imports in the code, include those packages too.

## No Entry File Found
**Symptom:** Lumora can't find bot.py, main.py, app.py, or run.py.
**Agent action:**
1. `list_files` to see all .py files
2. Find the main file (contains `bot.run(`, `client.run(`, or `asyncio.run(`)
3. `set_start_command("python3 <filename>.py")`

## SyntaxError in Python File
**Error:** `SyntaxError: invalid syntax` at a specific file and line
**Agent action:**
1. `read_file` the file referenced in the error
2. Find the syntax error on the reported line
3. Fix it with `write_file`

Common Python syntax errors:
- Missing `:` after `if`, `for`, `def`, `class`
- Mismatched quotes
- Python 2 `print "..."` style (needs `print("...")` in Python 3)
- Missing `await` keyword in async function

## IndentationError
**Error:** `IndentationError: unexpected indent` or `expected an indented block`
**Agent action:** Read the file, fix the indentation, write the corrected version.

## asyncio / Event Loop Errors
**Error:** `RuntimeError: Event loop is closed` or `RuntimeError: This event loop is already running`
**Cause:** Mixing sync and async code incorrectly.
**Fix:** Ensure the entry point uses:
```python
if __name__ == "__main__":
    asyncio.run(main())
```
Or for discord.py bots:
```python
bot.run(token)  # discord.py manages its own event loop
```

## aiohttp Version Conflict
**Error:** `ImportError: aiohttp X.X.X is not compatible...`
**Fix:** Pin a compatible aiohttp version in requirements.txt:
```
aiohttp>=3.8.0,<4.0.0
discord.py>=2.3.0
```

## AttributeError on commands.Bot
**Error:** `AttributeError: 'Bot' object has no attribute 'X'`
**Cause:** Using discord.py v1 API with v2 installed (or vice versa).
**Fix:** Check discord.py version. Most modern bots need v2+. Common v2 changes:
- `bot.command()` decorator → same
- `discord.Intents` must be passed explicitly
- `ctx.message.author` → `ctx.author`

## Python Version
Lumora runs `python3`. Ensure your bot is compatible with Python 3.8 or newer.
Avoid Python 3.12+ deprecations if using older libraries.

## Common Entry Files for Python Bots
- `bot.py` — most common
- `main.py` — also very common
- `app.py`, `run.py` — valid alternatives
- `src/bot.py`, `src/main.py` — nested src layout
