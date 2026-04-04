# Trama Technical Docs

This folder documents the current Phase 1 implementation so future sessions can resume work without relying on chat history.

## Recommended reading order

1. `implementation-overview.md`
2. `file-map.md`
3. `dev-workflow.md`
4. `troubleshooting.md`

## Current scope

The project currently implements the **Phase 1 baseline**:

- Electron + Vite + Preact shell
- Secure-by-default Electron window configuration (with one practical preload tradeoff, documented below)
- Typed IPC contract with runtime validation
- `contextBridge` preload API (`window.tramaApi`)
- Minimal tests for startup config and IPC contract behavior

## Important note

Some settings were adjusted pragmatically to make preload integration reliable on this setup. See `troubleshooting.md` for why and when to revisit them.
