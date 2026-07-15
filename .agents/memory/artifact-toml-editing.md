---
name: Artifact TOML editing
description: How to change an existing artifact's artifact.toml (ports, env, services) safely.
---

Direct file edits (Edit/WriteFile) to `.replit-artifact/artifact.toml` are rejected by the platform. The workflow generated from it also can't be overridden via `configureWorkflow` — it errors with "is managed by an artifact and cannot be overridden".

**How to apply:** In the CodeExecution sandbox, write the full new TOML content to a sibling temp file (e.g. `artifact.toml.tmp`) in the same `.replit-artifact` directory, then call:

```js
await verifyAndReplaceArtifactToml({
  tempFilePath: "/absolute/path/to/.replit-artifact/artifact.toml.tmp",
  artifactTomlPath: "/absolute/path/to/.replit-artifact/artifact.toml",
});
```

Both paths must be absolute — relative paths fail with `INVALID_ARTIFACT_TOML_PATH`. Delete the temp file afterward and restart the affected workflow.

**Why:** Artifacts are platform-managed services; ports/env for their dev servers come from the `[services.env]` block in artifact.toml, which the platform validates/regenerates workflows from. A `web`/`design` kind artifact using a shared vite config that reads `process.env.BASE_PATH`/`PORT` will fail to start with "BASE_PATH environment variable is required" if that block is missing — compare against a sibling artifact (e.g. mockup-sandbox) that has a working `[services.env]` to see the expected shape.
