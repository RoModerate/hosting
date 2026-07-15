---
name: Auto-restart vs. intentional stop
description: How to safely add auto-restart-on-crash to a supervised child process without it fighting manual stop/restart actions or looping forever.
---

A process supervisor that listens for a child's `exit` event and reacts (mark crashed, notify, maybe restart) cannot tell a real crash apart from a deliberate `SIGTERM` sent by the same code (e.g. before a redeploy or manual restart) unless it tracks intent explicitly.

**Rule:** before deliberately killing a supervised child, set a per-entity "intentional stop" flag; the exit handler consumes (checks-and-clears) that flag to decide whether to auto-restart. Also cap auto-restart attempts (e.g. 5) with increasing backoff, and reset the attempt counter only after the process has stayed alive for a stability window (e.g. 30s) — otherwise a persistently crashing process either restart-loops forever or a healthy long-running process never gets its retry budget back after a single transient blip.

**Why:** without the intent flag, every manual restart/redeploy is misreported as a crash (spurious "stopped unexpectedly" notifications) and can race with a real restart already in flight. Without a stability-reset window, the attempt cap is either too easily exhausted by rare legitimate crashes over a long uptime, or a genuinely crash-looping bot restarts forever and hammers resources.

**How to apply:** anywhere a `child_process` is auto-restarted on exit — check for an intentional-stop flag in the exit handler, and verify the attempt cap actually stops respawning once exceeded (test by killing a process repeatedly).
