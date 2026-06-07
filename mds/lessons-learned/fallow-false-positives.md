# Fallow false positives — 4 patterns to triage fast

`npx fallow dead-code` cannot see runtime wiring. The 4 recurring false-positive categories in Trama and how to spot each.

## Pattern 1 — "Unused file" loaded outside the import graph

Fallow only follows `import`/`require` edges. Files loaded by Electron (`path.join(__dirname, 'preload.cjs')`), HTML `<script>`/`<link>` tags, or assets scripts that copy files to `dist-electron` are invisible.

**Quick check:** `git grep` the filename against `electron/main.ts`, `electron/main-process/help-window.ts`, `scripts/copy-electron-assets.mjs`, and `help/**/*.html`. One hit = live.

## Pattern 2 — "Unused class member" dispatched via `ref.current`

Methods called as `ref.current.methodName()` or through dependency-injected plain objects have no static call site. Fallow sees zero callers.

**Quick check:** `git grep` the method name everywhere. If it appears in a caller that holds a reference to the class instance, it's live.

## Pattern 3 — "Unlisted dependency" that's already transitive

A package imported directly in code but not declared in `package.json` resolves through a parent dependency in `node_modules`.

**Quick check:** `npm ls THE_PACKAGE --depth=0` to see the resolution chain. Add to `dependencies` or `devDependencies` depending on whether production or test code imports it.

## Pattern 4 — "Unused export" used only internally or in tests

A symbol is `export`ed but only called within its own module or only in test files.

**Quick check:** `git grep` the symbol. If the only external hit is `tests/`, it can be unexported (tests import from source directly, not a barrel).
