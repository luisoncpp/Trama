# Help preload must unwrap IPC envelopes before HTML scripts

Trama IPC handlers return `{ ok: true, data } | { ok: false, error }` envelopes. The main renderer preload exposes those envelopes directly and callers check `.ok` / `.data`.

The Help window preload (`electron/help-preload.cts`) is different: its TypeScript contract and the inline scripts in `help/en/*.html` expect **plain values** — e.g. `getGettingStartedDismissed(): Promise<boolean>`, then `checkbox.checked = Boolean(dismissed)`.

If the preload forwards the raw envelope, `Boolean({ ok: true, data: { dismissed: false } })` is always `true`. The Getting Started checkbox then appears checked on every load even when `localStorage` has no dismissal key. The user thinks the preference saved; the next project open auto-opens Help again. Toggling uncheck → check is the first time `setGettingStartedDismissed(true)` actually runs from a user `change` event.

Rule for any dedicated child-window preload: either unwrap envelopes in the preload (preferred when HTML/inline scripts consume the API) or teach every consumer to read `.data`. Do not mix envelope returns with boolean-typed bridge methods.

Unwrapping lives in `src/shared/help-getting-started-ipc-bridge.ts`; tests in `tests/help-getting-started-bridge.test.ts`.

Related: sandboxed preloads (`sandbox: true`) cannot `require` local helper modules — only `electron` and a small Node subset. If the help preload imports `./help-getting-started-bridge.js`, the script fails to load, `window.tramaHelpApi` is never exposed, and the checkbox cannot read or write dismissal state. See `docs/lessons-learned/help-preload-sandbox-local-imports.md`.
