# Vite Reload On Export Artifacts

Date: 2026-04-14

## Symptom

After exporting the book to HTML while running `npm run dev`, the project appeared to close/reset immediately.

Observed terminal line:

- `[vite] (client) page reload example-fantasia/exports/book.html`

## Root cause

Vite dev server watches workspace files. Exporting `book.html` into an in-workspace `exports/` folder changed a watched file and triggered a full page reload.

Because Trama is a desktop app mounted in a renderer process, this reload resets renderer state and feels like the project was closed.

## Fix

Ignore generated export artifacts in Vite watch config:

- File: `vite.config.ts`
- Setting: `server.watch.ignored = ['**/exports/**']`

## Guardrail

If a generated artifact can be emitted inside the workspace during development, ensure it is either:

1. Written outside watched paths, or
2. Explicitly ignored by dev watchers (Vite/chokidar) to prevent app reset loops.
