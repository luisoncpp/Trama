# Project History with Local Git Implementation Plan

This plan implements the behavior specified in `mds/spec/project-history-git-spec.md`.

## Architecture Shape

Add a Git history subsystem in the Electron main process and expose it through typed IPC. Renderer state remains pane-targeted: revision rail state belongs to the pane/document that opened it, and preview is an explicit read-only mode of the existing rich editor.

## Main Process

### Git Service

Create `electron/services/git-history-service.ts`.

Responsibilities:

- run `git --version` to detect CLI availability
- discover repository root for a Project with `git -C <projectRoot> rev-parse --show-toplevel`
- detect whether a Project is inside a repository
- initialize a repository at Project root only after renderer confirmation
- detect special Git states: merge, rebase, cherry-pick, bisect
- validate unrelated staged changes before snapshot
- stage managed pathspecs with normal `.gitignore` semantics
- detect whether staged Trama-managed changes exist before commit
- commit with `Trama snapshot: YYYY-MM-DD HH:mm`
- list document revisions with rename following where practical, newest-first `--date-order`, bounded to 100 plus pagination cursor
- read document markdown from a commit
- read referenced `res/*.png` blobs from a commit for preview/load

Managed pathspecs must be scoped to the opened Project even when the Project is a subfolder inside a larger repository. Prefer pathspecs relative to the repository root.

### History Restore Write Path

Create a dedicated restore path instead of using normal `DocumentRepository.saveDocument`.

Responsibilities:

- write exact historical markdown bytes/text to the current document path
- restore only referenced historical `res/*.png` files present in the selected commit
- mark document and restored image paths as internal writes
- parse restored frontmatter and update only the document's `.trama.index.json` cache entry
- preserve `corkboardOrder`
- avoid materializing or rewriting image references through normal save logic

This can live in `electron/services/git-history-restore-service.ts` or inside the Git history service if the file stays small under lint limits.

### IPC

Update `src/shared/ipc.ts` with channels, schemas, and envelope types for:

- Git availability/status
- Save Snapshot
- Initialize-and-snapshot confirmation result flow
- List document revisions with page size/cursor
- Read revision preview
- Load revision

Add handlers under `electron/ipc/handlers/` and register them in `electron/ipc.ts`. Expose methods in `electron/preload.cts` and `src/types/trama-api.d.ts`.

All handlers must return envelope responses and validate payloads before side effects.

## Renderer

### Sidebar Import/Export

Update `src/features/project-editor/components/sidebar/sidebar-transfer-content.tsx` and related project-editor wiring to show **Save Snapshot** only when Git CLI is available.

The action sequence:

1. flush and save all dirty panes
2. if no repo exists, show confirmation to initialize Git at Project root
3. call snapshot IPC
4. show pending state and result toast/error
5. refresh open revision rails and select Current on success

### Context Menu

Extend `src/shared/workspace-context-menu.ts` and `electron/main-process/context-menu.ts` with a pane-targeted **See Revisions** command.

Important split-pane requirement: the command must target the pane where the context menu was opened, not whichever pane becomes active later. If Electron context menu params do not carry enough information, add a renderer-side way to track the last context-clicked editor pane before dispatching/opening the native menu.

### Pane State

Add session-only revision rail state per pane, likely near the existing pane workspace/state boundary.

State per pane should include:

- open/closed
- target document path
- loading/error state
- loaded revisions and pagination cursor
- selected item: Current or commit revision
- preview value and read-only preview mode
- load-confirmation dialog state

Any normal document navigation for that pane must close/exit preview and load the selected document normally.

### Rich Editor Preview Mode

Extend `RichMarkdownEditor` with an explicit read-only preview mode distinct from `disabled`.

Preview mode must:

- render rich content
- allow selection/copy/find/zoom
- block direct edits, paste, Paste Markdown, formatting, images, layout controls, save, revert, and typography mutation
- avoid undo/redo stack pollution when switching preview revisions

Do not inject nodes inside `.ql-editor`; preserve existing Quill integration invariants.

### Revision Rail UI

Add a pane-local right rail component, for example under `src/features/project-editor/pane/revisions/`.

Rail behavior:

- fixed width for V1
- responsive collapse/overlay on narrow panes if needed
- Current at top
- list dates in local time only
- load first 100 revisions
- load more on demand
- show empty-history message when only Current exists
- show **Load this revision** for selected committed revisions

## Data Flow

### Save Snapshot

1. Renderer checks Git availability and exposes action.
2. User clicks **Save Snapshot**.
3. Renderer saves all dirty panes through existing pane save path.
4. If project has no repository, renderer confirms initialization.
5. IPC handler verifies Git state is not merge/rebase/cherry-pick/bisect.
6. Handler stages managed pathspecs respecting `.gitignore`.
7. Handler aborts if unrelated staged changes exist or no managed changes are staged.
8. Handler commits directly to current `HEAD`.
9. Renderer refreshes any open revision rails.

### See Revisions and Preview

1. User opens rich-editor context menu in a pane.
2. **See Revisions** toggles the rail for that pane/document.
3. Renderer flushes pending serialization into pane state without saving.
4. Renderer requests revisions for the document path.
5. Main process returns Current metadata plus commits where the document changed.
6. Selecting a commit requests historical markdown and referenced image blobs.
7. Renderer applies preview value to the same rich editor in read-only preview mode.

### Load Revision

1. User selects a committed revision and clicks **Load this revision**.
2. Renderer shows destructive confirmation.
3. IPC handler blocks special Git states.
4. Handler writes exact historical markdown to the active current file path.
5. Handler restores referenced `res/*.png` files present in the selected commit.
6. Handler marks internal writes and updates only the document index cache entry.
7. Renderer updates pane content, leaves rail open, and selects Current changes.

## Files to Change

Likely main process:

- `src/shared/ipc.ts`
- `electron/ipc.ts`
- `electron/preload.cts`
- `src/types/trama-api.d.ts`
- `electron/ipc/handlers/git-history-handlers.ts`
- `electron/services/git-history-service.ts`
- optional `electron/services/git-history-restore-service.ts`
- `electron/ipc/handlers/project-handlers/shared.ts` if restore reuses index-cache update helpers

Likely renderer:

- `src/features/project-editor/components/sidebar/sidebar-transfer-content.tsx`
- `src/features/project-editor/project-editor-view.tsx`
- `src/features/project-editor/project-editor-dialogs.tsx`
- `src/features/project-editor/use-project-editor.ts`
- `src/features/project-editor/project-editor-private/state.ts`
- `src/features/project-editor/project-editor-private/actions.ts`
- `src/features/project-editor/pane/workspace-editor-panels.tsx`
- `src/features/project-editor/pane/pane-editor.tsx`
- `src/features/project-editor/pane/editor-panel.tsx`
- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor.tsx`
- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-core.ts`
- `src/features/project-editor/pane/rich-markdown-editor/private/rich-markdown-editor-toolbar-controller.ts`
- `src/features/project-editor/pane/rich-markdown-editor/private/rich-markdown-editor-toolbar-dom.ts`
- `src/shared/workspace-context-menu.ts`
- `electron/main-process/context-menu.ts`

New renderer files should be added under a cohesive revision-history module instead of many shallow hooks.

## Tests

Focused tests to add:

- Git availability and repo discovery service tests
- snapshot pathspec scoping in root repo and parent repo cases
- ignored files are not force-added
- unrelated staged changes abort snapshot
- no managed changes returns friendly no-op
- initial repository initialization path
- special Git state blocking for snapshot/load
- document revision listing includes only commits where document changed
- rename-follow behavior where practical
- deletion commits excluded
- preview reads commit image blobs before current working tree fallback
- load revision writes exact markdown and restores only referenced commit images
- load revision does not delete unreferenced current images
- load revision updates only index cache, not corkboard order
- renderer rail Current row labeling for unsaved vs saved-uncommitted changes
- split-pane context menu targets clicked pane
- preview mode blocks mutation controls but permits copy/find/zoom

Use focused commands while implementing:

- `npm run test -- tests/ipc-contract.test.ts`
- `npm run test -- tests/project-editor-conflict-flow.test.ts`
- `npm run test -- tests/pane-workspace.test.ts`
- new focused Git history tests
- `npm run lint`
- `npm run build`

## Risks and Invariants

- Never commit unrelated staged changes.
- Never infer pane target from global active pane for context-clicked revision actions.
- Keep preview state out of undo/redo history.
- Keep `.git` ignored by project scanner/watcher.
- Respect `.gitignore`; do not force-add.
- Loading a revision is not a snapshot and should leave working-tree changes uncommitted.
- Loading a revision may overwrite shared `res/*.png` paths for historical fidelity; see `mds/adr/0001-restore-revision-images-for-fidelity.md`.

## Documentation Updates During Implementation

- Add new TS/TSX files to `mds/live/file-map.md`.
- Add or update architecture docs if the Git history subsystem grows beyond 3 files.
- Add a flow doc if revision preview/load becomes easier to debug as a trigger sequence.
- Add lessons learned for any counter-intuitive Git/Quill/Electron behavior discovered.
