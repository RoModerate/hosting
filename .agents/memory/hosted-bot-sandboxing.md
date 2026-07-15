---
name: Hosted bot process sandboxing
description: How this project isolates uploaded/hosted third-party bot processes from the host server's own secrets and from each other.
---

When a hosting platform spawns a customer's uploaded process (Node/Python bot) as a child of the host server, the child inherits `process.env` by default — including the host's own Discord token, session secret, DB URL, etc. That is a real leak, not a theoretical one.

**Rule:** build the child env in this order: (1) copy host `process.env`, (2) delete every host-only secret key by name (Discord token, session secret, admin password, DB URL/PG* vars, any other server-only API keys), (3) assign an isolated resource (e.g. a per-tenant `PORT`), (4) merge the *customer's own* stored env vars last, so their own values (e.g. their own `DISCORD_BOT_TOKEN`) win over anything the host set.

**Why:** getting the merge order wrong in either direction breaks things silently: merging user vars before stripping leaks host secrets if a user submits a wildcard/typo var; stripping after assigning isolated resources but before user vars can't be overridden lets the isolation defaults clobber a customer's legitimate override; and clearing a var by *name* rather than by not including it (e.g. explicitly setting `DISCORD_BOT_TOKEN: ""`) is dangerous because that same var name is often the exact one the customer's own bot needs to set for itself.

**How to apply:** when adding or reviewing any "run untrusted uploaded code as a subprocess" feature, verify the env-construction order explicitly and add a test that inspects `/proc/<pid>/environ` (or equivalent) of the spawned child to confirm host secrets are absent and user-supplied vars are present.
