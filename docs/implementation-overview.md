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

## Focus mode postmortem (why the final fix worked)

Final stable approach in `rich-markdown-editor-focus-scope`:

- For `sentence` and `line`, first try native text highlighting through CSS Highlights API (`::highlight(...)`) with a DOM `Range` built from line-relative offsets.
- If Highlights API is unavailable at runtime, fall back to non-mutating line/block emphasis (`is-focus-emphasis`) without DOM injection.
- Keep `paragraph` as block emphasis only.

Why keeping `is-focus-text-highlight` marker is necessary:

- In test runtime (JSDOM), rendered `::highlight(...)` output is not visually assertable.
- The marker class provides a deterministic observable that the highlight path actually executed.
- Removing the marker encouraged broad refactors that accidentally altered focus control flow; keeping it as an explicit state boundary reduces risky cleanups.

Why this worked:

- It highlights glyphs first, not only background. The previous overlay-only variants looked "close" but did not read like true focused text.
- It does not mutate Quill content. Rendering stays outside Delta/content ownership, preventing blank-line growth and editor instability.
- It separates concerns: scope detection (sentence/line math) is independent from rendering path (highlight vs emphasis fallback).

Why previous attempts failed:

- Injecting DOM nodes inside `.ql-editor` (wrappers/overlays) conflicted with Quill's model and caused content side effects.
- Treating background overlay as equivalent to text highlight produced visual regressions (dimmed paragraph look instead of true sentence/line emphasis).
- Over-centralizing logic in `rich-markdown-editor.tsx` made iteration fragile and repeatedly hit lint limits (`max-lines`), slowing safe fixes.

Key misunderstandings around `rich-markdown-editor`:

- The component should orchestrate editor lifecycle and hooks, not contain complex focus rendering internals.
- Quill's rendered DOM is not a safe place for ad-hoc structural mutation; visual effects must be non-destructive.
- A single "overlay solution" was assumed to be enough for all runtimes, but practical stability required capability detection and fallback behavior.

For the current Phase 3 sequence:

- WS1 split usability is complete and stable.
- WS2 theme layer and polish are complete.
- WS3 fullscreen/focus mode is complete.
- Current active next workstream is WS4 (UX hardening and accessibility).

## Known tradeoffs

- Dev startup uses `concurrently + wait-on`; if Electron exits, all child processes are stopped.
- Preload uses `.cts` and emits `preload.cjs`; main must load that exact artifact.
- Lint limits are strict (`max-lines`, `max-lines-per-function`), so decomposition is required, not optional.
