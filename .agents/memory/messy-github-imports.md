---
name: Messy GitHub imports
description: Imported repos can contain accidental nested duplicates of the whole project (self-zips, extracted archives) that confuse artifact/workflow auto-detection.
---

When setting up a freshly imported project, check for accidental full-project duplicates before trusting auto-detected artifacts/workflows: a root-level zip of the entire repo (including its own `.git`), or an extracted copy nested under `attached_assets/<name>/<name>/...` that mirrors the real project structure.

**Why:** The platform scans for `artifact.toml` files anywhere in the tree, so a duplicated nested copy causes duplicate artifacts and duplicate workflows (same names, pointing at the stale nested path) to be auto-created, which is confusing and wastes container space (seen: a 330MB self-zip + 110MB nested extracted duplicate in one import).

**How to apply:** During "set up the imported project", `find`/`du` the top-level dirs for oversized zips or nested directories that duplicate the root's own folder name before proceeding; delete the duplicates and let the platform remove the resulting duplicate workflows/artifacts on its own.
