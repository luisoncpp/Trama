# Implementation Overview (Phase 2 + Core Phase 3 + WS3)

For fast onboarding, read `new-conversation-handoff.md` first, then this file.

## What is implemented

The project now includes:

- Open project via native folder picker from renderer.
- Recursive project scan for markdown documents.
- Frontmatter parse/serialize in main process with `yaml`.
- Read/save/create/rename/delete markdown documents through typed IPC.
- Folder create through typed IPC.
- Renderer-to-main diagnostic logging via `trama:debug:log`.
- `.trama.index.json` reconciliation (prune missing + append new).
- External file watcher events (`internal` vs `external`) and conflict handling actions.
- Rich markdown visual editor loop with autosave debounce.
- Sidebar with section-scoped tree (`book/`, `outline/`, `lore/`) and settings.
- Sidebar filter, responsive behavior, and right-click file context actions.
- Split workspace mode with per-pane document state, persistent layout, drag resize, click-to-activate panes, and native/context-menu split toggle.
- Fullscreen mode via native Electron window APIs with renderer-state synchronization.
- Focus mode with scope options (`line | sentence | paragraph`) and contextual text dimming around caret.
- Workspace layout controls for split/fullscreen/focus/scope plus persisted focus settings in layout storage.
- Extended keyboard shortcuts for workspace control (`Ctrl/Cmd+.` split, `Ctrl/Cmd+Shift+F` fullscreen, `Ctrl/Cmd+Shift+M` focus mode, `Ctrl/Cmd+Shift+Tab` pane switch).

## Runtime architecture

- Renderer process:
  - `src/app.tsx`
  - `src/features/project-editor/*`
- Preload script:
  - `electron/preload.cts`
- Main process:
  - `electron/main.ts`
  - `electron/ipc.ts`
  - `electron/ipc/handlers/*`
  - `electron/services/*`
- Shared contract:
  - `src/shared/ipc.ts`

Notable WS3 renderer modules:

- `src/features/project-editor/use-project-editor-fullscreen-effect.ts`
- `src/features/project-editor/use-project-editor-focus-actions.ts`
- `src/features/project-editor/use-project-editor-shortcuts-effect.ts`
- `src/features/project-editor/components/workspace-layout-controls.tsx`
- `src/features/project-editor/components/rich-markdown-editor.tsx`

See `ipc-architecture.md` for endpoint mapping and extension workflow.

## Security baseline

Configured in `electron/window-config.ts`:

- `nodeIntegration: false`
- `contextIsolation: true`
- `webSecurity: true`
- `sandbox: false` (temporary practical choice; revisit later)

## IPC contract model

IPC responses use a global envelope pattern:

- Success: `{ ok: true, data: ... }`
- Failure: `{ ok: false, error: { code, message, details? } }`

Validation is done with `zod` in main process before side effects.

Current channels:

- `trama:ping`
- `trama:debug:log`
- `trama:project:open`
- `trama:project:select-folder`
- `trama:document:read`
- `trama:document:save`
- `trama:document:create`
- `trama:document:rename`
- `trama:document:delete`
- `trama:folder:create`
- `trama:index:get`
- `trama:project:external-file-event` (event)
- `trama:window:set-fullscreen`
- `trama:window:fullscreen-changed` (event)

## Token-saving mental model for new chats

1. The only shared truth for channels/schemas/types is `src/shared/ipc.ts`.
2. `electron/ipc.ts` should stay thin: validate and delegate.
3. Business logic belongs in `electron/ipc/handlers/*` and `electron/services/*`.
4. Renderer behavior should be composed in feature hooks (`use-project-editor*`) and lightweight view components.
5. Fullscreen uses native main-process window APIs, while focus mode is renderer-local UI state.
6. If a sidebar behavior regresses, check these first:
- `sidebar-panel.tsx`
- `sidebar-explorer-content.tsx`
- `sidebar-explorer-body.tsx`
- `sidebar-tree.tsx`
- `use-sidebar-tree-expanded-folders.ts`

## Why this matters for later phases

Current seams are ready for Phase 4 work:

- Add IPC endpoints by extending `src/shared/ipc.ts` first.
- Keep preload API explicit in `electron/preload.cts` and `src/types/trama-api.d.ts`.
- Use focused tests in `tests/sidebar-panels.test.ts`, `tests/use-project-editor.test.ts`, and `tests/ipc-contract.test.ts` before full suite.

WS3 verification now includes:

- `tests/fullscreen-ipc.test.ts`
- `tests/focus-mode-scope.test.ts`
- `tests/workspace-layout-persistence.test.ts`
- `tests/workspace-keyboard-shortcuts.test.ts`

For the current Phase 3 sequence:

- WS1 split usability is complete and stable.
- WS2 theme layer and polish are complete.
- WS3 fullscreen/focus mode is complete.
- Current active next workstream is WS4 (UX hardening and accessibility).

## Known tradeoffs

- Dev startup uses `concurrently + wait-on`; if Electron exits, all child processes are stopped.
- Preload uses `.cts` and emits `preload.cjs`; main must load that exact artifact.
- Lint limits are strict (`max-lines`, `max-lines-per-function`), so decomposition is required, not optional.

## Focus mode stabilization note (important)

WS3 focus scope behavior (`line | sentence | paragraph`) proved sensitive in the rich editor. The stable implementation uses this priority order:

1. Text highlight via CSS Highlights API when available (`CSS.highlights` + `Highlight`).
2. Geometry-based overlay fallback when highlight API is not available.
3. Quill/line bounds fallback to avoid disappearing emphasis.

The key architectural rule is: do not structurally mutate Quill content for visual focus effects. Keep focus rendering external to document content and isolate this logic in dedicated focus-scope modules instead of growing `rich-markdown-editor.tsx`.

See `docs/lessons-learned/focus-mode-rich-markdown-highlighting.md` for failure history, misconceptions, and guardrails.
