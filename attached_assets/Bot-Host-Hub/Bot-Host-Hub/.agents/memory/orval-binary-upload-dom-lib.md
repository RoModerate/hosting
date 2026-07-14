---
name: Orval binary upload DOM lib requirement
description: Why a Node-only package's tsconfig needed "dom" added to compilerOptions.lib
---

When an OpenAPI schema declares a multipart file field as `format: binary`, Orval's
codegen emits `Blob` / `File` as the TS type for that field in the generated Zod
schemas/hooks. If the package that holds the generated code (e.g. a shared
`api-zod`/`api-client` lib) only targets `es2022` in `compilerOptions.lib` with no
DOM types, typecheck fails with `TS2304: Cannot find name 'File'/'Blob'` even
though the package has nothing else to do with the browser DOM.

**Why:** Orval doesn't gate DOM-type usage behind a lib check; it assumes the
consuming package can see `Blob`/`File` globals.

**How to apply:** If codegen introduces a `format: binary` field and typecheck
fails on `Blob`/`File` not found, add `"dom"` to `compilerOptions.lib` in the
affected package's `tsconfig.json` (e.g. `["es2022", "dom"]`) rather than
hand-editing the generated file or trying to change the OpenAPI schema.
