# Lumora Portal — Full Feature Explanation

> Use this as context when chatting with ChatGPT about the project.

---

## What is Lumora?

Lumora is a **Discord bot hosting platform**. Users pay (or are given free access) to host their Discord bot 24/7 on Lumora's server. They upload their bot's code, and Lumora keeps it running, restarts it if it crashes, and even uses AI to automatically fix errors.

---

## How the system is structured

There are two main parts:

### 1. The Web Portal (`/web`)
A React single-page app. Users log in here to manage their bot.

### 2. The API Server (`/api-server`)
An Express backend that handles auth, running bots, file management, and AI.

---

## Authentication — How users get in

### Discord OAuth ("Continue with Discord" button)
- Clicking the button redirects the user to Discord's login page.
- Discord sends them back with a temporary code.
- The server exchanges that code for the user's Discord ID.
- It then looks up whether that Discord ID has an active **hosting key** in the database.
- If yes → they're logged in and sent to the dashboard.
- If no → they see an error ("not linked to any hosting plan").

**What this means practically:** You as the admin must issue every user a key *before* they can log in with Discord. The key is tied to their Discord ID.

### Access Key ("Enter access key manually" button)
- Instead of Discord, the user types in a key like `XXXX-XXXX-XXXX-XXXX`.
- The server validates the key and logs them in.
- This is useful if they don't have a Discord account linked yet, or if you just want to send someone a key and have them figure it out.

### Admin Panel (`/admin`)
- Completely separate from the user login.
- Protected by a password you set in the admin config.
- This is where YOU (the platform owner) manage everything.

---

## Admin Panel — Every Section

### Config Settings
Set up the platform's core secrets and integrations:
- **Admin Password** — The password to access this admin panel.
- **Discord Bot Token** — Your Discord bot's token (from Discord Developer Portal). Required for the bot to join servers and send messages.
- **Discord Guild ID** — Your main Discord server's ID. Used for staff roles and ticket channels.
- **Staff Role ID** — If set, only users with this role in your Discord can interact with certain bot commands.
- **Ticket Category Name** — The name of the Discord channel category where ticket threads are created.
- **OpenRouter API Key** — An API key for OpenRouter (an AI gateway). Required for the AI repair and AI chat features. If not set, those features won't work.
- **OpenRouter Model** — Which AI model to use (e.g., `anthropic/claude-3-haiku`). Defaults to a fast, cheap model if left blank.

### Generate Access Key (standalone)
- Creates a key with no Discord ID attached yet.
- Useful if you want to send someone a key before knowing their Discord ID.
- They can use the "Enter access key manually" option on login.
- You can link a Discord ID to this key later in the Ticket Manager.

### Issue Key to Discord User
- Creates a key *and* immediately links it to a specific Discord ID.
- Fill in:
  - **Discord User ID** — Their 18-digit Discord ID (right-click → Copy User ID in Discord).
  - **Discord Username** — Optional display name so you recognize them in the list.
  - **Duration** — How many days the key is valid.
- After you click Generate, the key is auto-copied to your clipboard. Give it to the user or have them log in via Discord directly.

### Ticket Manager
- Shows all existing tickets (one per user) with their linked keys.
- Each ticket shows: Discord ID, username, key status (active/expired), expiry date.
- **Link Discord ID** — If a ticket was created without a Discord ID (standalone key), you can link it here later.
- **Revoke / Delete** — Remove a user's access.

---

## Dashboard — What users see after logging in

### Header
- **← Home** — Goes back to the landing page.
- **Profile Dropdown** (top-right) — Shows the user's Discord avatar/username and when their hosting expires. Clicking it opens options including Log Out.

### Overview Tab
Shows the current status of the user's hosted bot:
- **Status badge** — Online / Offline / Error / Crashed.
- **File name** — The main bot file that was uploaded.
- **Start command** — The command used to run it (e.g., `node index.js`).
- **Restart count** — How many times the bot has been restarted automatically.
- **Repair attempts** — How many times AI has tried to fix it.
- **Last error** — The last crash message, if any.
- **AI explanation** — If AI ran a repair, it shows what it found and changed.
- **Last started** — Timestamp of the last start.

### Files Tab
Manage the bot's uploaded files:

**Upload area (top)**
- Drag and drop files onto the large upload zone, or click to open a file picker.
- Supports any file type (`.js`, `.py`, `.json`, `.env`, etc.).
- Files are uploaded to a sandboxed folder on the server — only this user's files, completely isolated.

**Search bar**
- Type to search files by name.
- Has a small spinner while searching, a clear (×) button, and shows the parent folder of each result.
- Debounced — it doesn't spam the server on every keystroke.

**File tree**
- Lists all uploaded files in a folder structure.
- Click a file to open it in the editor on the right.
- Files can be renamed or deleted.

**Code editor (right panel)**
- A full in-browser code editor (CodeMirror) with syntax highlighting.
- Edit files directly in the browser and save.
- Supports all common languages.

### Files → AI Settings sub-tab
- **OpenRouter API Key field** — Users can enter their *own* OpenRouter API key here.
- This key is stored as an environment variable for their bot (`OPENROUTER_API_KEY`).
- If set, it's used instead of the system-level key for their AI repairs and AI chat.
- The field is masked (shows as ••••••) and is never pre-filled for security.
- Useful so users can pay for their own AI usage rather than the platform covering it.

### AI Chat (if available)
- A chat interface where the user can talk to an AI about their bot.
- The AI has tools: it can read files, write/edit files, check logs, and see the bot's current status.
- It can make targeted edits to fix bugs, add features, or answer questions.
- Has an undo button — if the AI makes a change you don't like, one click reverts it.
- Uses the OpenRouter key (user's own key if set, otherwise system key).

---

## Bot Hosting — How it actually works

### Uploading a bot
1. User uploads their bot's files via the Files tab.
2. They set a **start command** (e.g., `python bot.py` or `node index.js`).
3. They click **Start Bot**.

### Running the bot
- The server spawns the bot as a separate child process.
- It captures stdout/stderr (the bot's console output) and stores it as a live log.
- The log streams in real-time on the Dashboard.

### Auto-restart
- If the bot crashes, the server automatically restarts it after a short delay.
- It tracks restart count. If it keeps crashing in a loop, it triggers AI repair before trying again.

### AI Repair (auto)
When the bot crashes repeatedly:
1. The AI reads the crash error from the logs.
2. It reads the bot's source files.
3. It generates a fix and writes it to the file.
4. The bot is restarted with the fixed code.
5. This happens up to 3 times before giving up.
6. The user sees the AI's explanation in the Overview tab.

### Pre-launch AI scan
Before the bot is started for the first time (or after a new upload), the AI does a quick scan of the code to catch obvious issues before they cause a crash.

---

## Environment Variables
- Each bot runs with its own environment variables, sandboxed per user.
- Users can set variables (like `DISCORD_TOKEN`, `PREFIX`, etc.) through the Files tab or AI Settings.
- The system never lets user bots access the host server's secrets.

---

## Landing Page
- The public homepage at `/`.
- Has a hero section, feature list, and call-to-action buttons.
- Fully static — no login required.
- Links to the Discord server for support and onboarding.

---

## Login Page (`/login`)
- **Continue with Discord** — Main login method. Redirects to Discord OAuth.
- **Enter access key manually** — Fallback for key-only login.
- **Admin Panel** link at the bottom — For the platform owner to access `/admin`.

---

## Key Concepts Summary

| Term | What it means |
|------|--------------|
| Ticket | A record in the database representing one user's hosting slot |
| Hosting Key | A one-time code that activates a ticket; linked to a Discord ID |
| OpenRouter | An AI API gateway — provides access to models like Claude, GPT-4, etc. |
| Sandboxed | Each user's bot files and processes are isolated from each other |
| AI Repair | Automated code-fixing using an LLM when the bot crashes |
| Start Command | The shell command used to run the bot (e.g., `node index.js`) |

---

## Common Admin Workflows

### Give a new user access
1. Go to `/admin`, enter your password.
2. Under "Issue Key to Discord User", enter their Discord ID + username.
3. Set duration (e.g., 30 days).
4. Click Generate — key is auto-copied.
5. Send them the key OR tell them to log in with Discord directly (if you used their Discord ID, it's already linked).

### Give yourself access (as the platform owner)
1. Go to `/admin`, enter your password.
2. Under "Issue Key to Discord User", enter YOUR Discord ID.
3. Generate a key with any duration.
4. Go to `/login` and click "Continue with Discord".
5. It will now find your ticket and log you in.

### Revoke someone's access
1. Go to `/admin` → Ticket Manager.
2. Find their ticket and delete/revoke their key.

### Enable AI features
1. Go to `/admin` → Config Settings.
2. Paste your OpenRouter API key (get one free at openrouter.ai).
3. Optionally set a model (leave blank for the default).
4. Save.
