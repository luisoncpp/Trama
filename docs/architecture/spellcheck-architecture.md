# Spellcheck Architecture

## Purpose

Spellcheck is a discrete subsystem spanning main-process Electron session API, renderer-side state management, and Quill editor integration. The user-facing controls live in the sidebar Settings tab. Preference is persisted locally and synced against the native spellchecker on startup.

---

## Overview

```
User toggles spellcheck in sidebar
         │
         ▼
SpellcheckSetting (sidebar)
  └─ SpellcheckControls
         │
         ▼
onSpellcheckEnabledChange(enabled)
         │
         ▼
useSpellcheckSettings.setEnabled(enabled)
  • Optimistic UI update immediately
  • IPC call to main process
         │
         ▼
window.tramaApi.setSpellcheckSettings({ enabled, language })
         │
         ▼
IPC: trama:window:set-spellcheck-settings
  → electron/ipc/spellcheck.ts handler
    → session.setSpellCheckerEnabled(enabled)
    → session.setSpellCheckerLanguages([language])
    → returns normalized state
         │
         ▼
Quill sync: syncEditorSpellcheck(editor, enabled)
  → editor.root.spellcheck = enabled
  → editor.root.setAttribute('spellcheck', ...)
```

---

## Components

### Main Process — `electron/ipc/spellcheck.ts`

Exposes two IPC handlers. Registered in `electron/ipc.ts:158` via `registerSpellcheckHandler(ipcMain, getMainWindow)`.

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `trama:window:get-spellcheck-settings` | Renderer → Main | Read current Electron session spellcheck state |
| `trama:window:set-spellcheck-settings` | Renderer → Main | Apply enable/disable and language |

Response shape (`SpellcheckSettingsResponse`):

```typescript
{
  enabled: boolean
  selectedLanguage: string | null
  availableLanguages: string[]
  supportsLanguageSelection: boolean  // false on macOS
}
```

Platform behavior:
- **Windows/Linux**: `session.setSpellCheckerEnabled()` and `session.setSpellCheckerLanguages()` are both available.
- **macOS**: Language selection is managed by the OS spellchecker. `setSpellCheckerLanguages()` is a no-op; `supportsLanguageSelection` is `false`.

### Renderer Hook — `src/spellcheck/use-spellcheck-settings.ts`

Manages local state, persistence, and optimistic updates:

- Boot-time sync against Electron session via `loadInitialSpellcheckSettings()`
- Persists settings to `localStorage` under `trama.spellcheck.settings`
- `setEnabled()`: applies optimistic UI update, then IPC call, then rollbacks on failure
- `setLanguage()`: same optimistic-then-confirm pattern
- Merges stored preferences with available native languages on startup

### Sidebar UI — `src/features/project-editor/components/sidebar/spellcheck-setting.tsx`

Wrapper component. Renders `SpellcheckControls` which contains the actual toggle and language dropdown.

### Quill Integration — `src/features/project-editor/components/rich-markdown-editor-quill.ts`

```typescript
export function syncEditorSpellcheck(editor: Quill, spellcheckEnabled: boolean): void {
  editor.root.spellcheck = spellcheckEnabled
  editor.root.setAttribute('spellcheck', spellcheckEnabled ? 'true' : 'false')
}
```

`syncEditorSpellcheck` is called in two places:

1. **Editor initialization** (`useInitializeEditor` in `rich-markdown-editor-core.ts:64`): applies spellcheck state immediately after `createQuillEditor()` creates the instance. `spellcheckEnabled` is passed as a parameter but is **not in the effect dependency array** — it is captured in the closure at mount time. This ensures toggling spellcheck never triggers Quill re-initialization.

2. **Dedicated sync effect** (`useSyncSpellcheckEnabled:133`): re-applies spellcheck state whenever `spellcheckEnabled` or `documentId` change after mount. This handles runtime toggles without touching the editor lifecycle.

Running both calls at init is by design and idempotent — the editor receives the correct spellcheck value with no redundant DOM operations.

---

## Key Design Decisions

### Optimistic UI with Rollback

Toggle state updates the renderer immediately before the IPC call returns. If the IPC call fails, state is rolled back to the previous value. This avoids the native spellchecker reread lag making the UI feel unresponsive.

See: `docs/lessons-learned/spellcheck-optimistic-toggle-sync.md`

### Quill Effect Isolation

`spellcheckEnabled` is passed to `useInitializeEditor` as a parameter but is **not included in its dependency array**. This means the closure inside the init effect captures the value at mount time. Toggling spellcheck does not re-run the init effect — it is handled entirely by `useSyncSpellcheckEnabled`.

This distinction is critical: passing a value to an effect ≠ including it in deps. Including it in deps would trigger editor re-initialization on every toggle, which is the exact regression this pattern prevents.

See: `docs/lessons-learned/rich-editor-effect-deps-remount.md`

### Platform Language Selection

Renderer settings should expose language selection only when `supportsLanguageSelection` is `true`. On macOS, the OS controls language selection independently.

See: `docs/lessons-learned/electron-spellcheck-settings.md`

---

## Key Files

| File | Responsibility |
|------|-----------------|
| `electron/ipc/spellcheck.ts` | Main-process IPC handlers, Electron session API calls |
| `src/shared/ipc.ts` | Channel names and Zod schemas for spellcheck IPC |
| `src/spellcheck/use-spellcheck-settings.ts` | Renderer state, persistence, optimistic updates |
| `src/features/project-editor/components/sidebar/spellcheck-setting.tsx` | Sidebar settings wrapper |
| `src/features/project-editor/components/sidebar/spellcheck-controls.tsx` | Actual toggle and language select UI |
| `src/features/project-editor/components/rich-markdown-editor-quill.ts` | `syncEditorSpellcheck()` |
| `src/features/project-editor/components/rich-markdown-editor-core.ts` | `useSyncSpellcheckEnabled` effect |

---

## Debugging Notes

### Toggle has no effect
- Verify `session.isSpellCheckerEnabled()` returns expected value in DevTools main process
- Check that `spellcheckEnabled` prop reaches `rich-markdown-editor-core.ts`
- Confirm `syncEditorSpellcheck` is called after the editor initializes

### Language dropdown missing
- Check `supportsLanguageSelection` in settings state
- On macOS this is always `false` by design

### Checkbox bounces after toggle
- The optimistic update applied, but IPC returned a different `enabled` value
- Handlers return normalized state from `readSpellcheckSettings(win, enabledOverride)` using the requested value, not a reread

### Spellcheck re-enables editor after being disabled
- Confirm `spellcheckEnabled` is NOT in the Quill initialization effect deps (it is passed as a parameter but excluded from the dependency array)
- The init effect closure captures the value at mount time; `useSyncSpellcheckEnabled` handles all post-mount changes
- Both `useInitializeEditor` and `useSyncSpellcheckEnabled` call `syncEditorSpellcheck` — this is intentional and idempotent at init

---

## Key Invariants

1. **IPC channel names live only in `src/shared/ipc.ts`** — do not duplicate or hardcode channel strings.
2. **Handlers must return envelope responses** — `{ ok: true, data: ... }` or `{ ok: false, error: ... }`.
3. **`spellcheckEnabled` is passed to init but excluded from deps** — this is the intentional isolation pattern; do not add it to the init effect dependency array.
4. **macOS language selection is OS-controlled** — renderer must respect `supportsLanguageSelection: false`.
5. **Optimistic updates must rollback on IPC failure** — never leave renderer state out of sync with native session.

---

## References

- IPC architecture: `docs/architecture/ipc-architecture.md`
- Rich editor core architecture: `docs/architecture/rich-markdown-editor-core-architecture.md`
- Lessons: `docs/lessons-learned/spellcheck-optimistic-toggle-sync.md`, `docs/lessons-learned/electron-spellcheck-settings.md`, `docs/lessons-learned/rich-editor-effect-deps-remount.md`
- Tests: `tests/spellcheck-settings.test.ts`
