# Project State Propagation Flow

## Trigger

Any IPC handler that returns a new `ProjectSnapshot` — usually `handleOpenProject` called after a file/folder create, rename, delete, move, or after an external file event.

## Entry point

`useProjectEditor()` in `src/features/project-editor/use-project-editor.ts:118`.

## Why this flow matters

This is the central state wiring hub. State is now split into 6 memoized sub-state objects to prevent false re-render cascades. Action hooks consume only the sub-states they need, keeping `useCallback` dependency arrays stable.

After pane-isolation-plan-v2, `PaneWorkspace` is the exclusive mutation surface for panes. Hooks no longer call `setPrimaryPane`/`setSecondaryPane` directly — they delegate to `workspace.updatePaneContent`, `workspace.loadPaneDocument`, `workspace.clearPanes`, `workspace.updatePaneMeta`. The `savePaneIfDirty` method now calls the private `markPaneSaved` internally after a successful save.

Understanding the sub-state decomposition and the `PaneWorkspace` facade is essential for debugging stale-closure or missed-render issues.

## Architecture

### Layer 1 — Core state (`useProjectEditorCoreState`)

File: `src/features/project-editor/use-project-editor-core-state.ts`

A collection of standalone `useState` hooks:
- `snapshot` — the full project tree + index
- `rootPath` — current project directory
- `primaryPane`, `secondaryPane` — per-pane document state
- `loadingProject`, `loadingDocument`, `saving` — loading flags
- `isFullscreen` — fullscreen toggle
- `externalConflictPath`, `conflictComparisonContent` — conflict resolution state
- `statusMessage` — user-facing status bar text

Returns a flat object with all values and their setters. **This object is recreated every render.**

### Layer 2 — Derived state (`useProjectEditorState` private implementation)

File: `src/features/project-editor/project-editor-private/state.ts`

Adds three externally-persisted state hooks:
- `useWorkspaceLayoutState()` — layout (single/split, pane assignments, focus mode) persisted to `localStorage`
- `useSidebarUiState()` — sidebar section, panel collapsed, panel width

Computes memoized derived values:
- `visibleFiles = useMemo(() => getVisibleSidebarPaths(coreState.snapshot), [coreState.snapshot])`
- `corkboardOrder = useMemo(() => coreState.snapshot?.index?.corkboardOrder ?? {}, [coreState.snapshot])`

Assembles memoized sub-states inline:
- `documentState` — active pane path, content, meta, dirty flag
- `layoutState` — workspace layout
- `sidebarState` — sidebar section, collapse, width, focus mode flag
- `projectState` — root path, snapshot, visible files, corkboard order
- `uiState` — loading/saving/fullscreen/conflict/message flags

Also assembles:
- `values` via one private memoized projection — all readable state plus UI projections (`selectedPath`, `editorValue`, `isDirty` from active pane)
- `setters` via `useMemo()` — all public setters needed by the private action Module
- `paneBindings` via `useMemo()` — both pane states plus `setPrimaryPane`/`setSecondaryPane`, kept private to `use-project-editor.ts` for `PaneWorkspace`

**The 6 sub-states are memoized with `useMemo`.** Action hooks should depend on the specific sub-states they read, not on `values`.

`paneBindings` still changes when pane state changes, but `usePaneWorkspace()` no longer turns that into workspace recreation. It syncs the fresh bindings into one stable `PaneWorkspace` instance.

### Layer 3 — Stable pane workspace (`usePaneWorkspace`)

File: `src/features/project-editor/pane/use-pane-workspace.ts`

`usePaneWorkspace()` creates one `PaneWorkspace` with `useRef` and then calls `workspace.updateDependencies(...)` on later renders.

That keeps:
- autosave timer ownership inside the class
- pane history store attached to the same facade
- action/effect dependencies from churning only because pane snapshots changed

This also changes an important rule for effects: they must depend on semantic state (`isDirty`, `selectedPath`, layout paths), not on `paneWorkspace` identity.

### Layer 4 — Actions (`useProjectEditorActions`)

File: `src/features/project-editor/project-editor-private/actions.ts`

Receives the sub-states, `setters`, and `paneWorkspace`. Creates core actions:

| Action | Built by | Deps |
|--------|----------|------|
| `clearEditor` | `useClearEditor(setters, paneWorkspace)` | `[setters, paneWorkspace]` |
| `loadDocument` | `useLoadDocument(setters, paneWorkspace)` | `[setters, paneWorkspace]` |
| `openProject` | `useOpenProject(setters, clearEditor, loadDocument)` | `[clearEditor, loadDocument, setters]` |
| `saveDocumentNow` | `useSaveDocumentNow(setters)` | `[setters]` |

Key changes from pane-isolation-plan-v2:
- `clearEditor` calls `paneWorkspace.clearPanes()` instead of `setters.setPrimaryPane(emptyPane)`/`setters.setSecondaryPane(emptyPane)`.
- `loadDocument` calls `paneWorkspace.loadPaneDocument(targetPane, path, content, meta)` instead of `setters.setPrimaryPane(loadedPane)`/`setters.setSecondaryPane(loadedPane)`.
- `saveDocumentNow` no longer clears `isDirty` on panes — that is handled privately by `PaneWorkspace.savePaneIfDirty()` via `markPaneSaved`.

Then builds the flat `ProjectEditorActions` surface directly over the deep Modules (`workspace-actions`, `sidebar-file-actions`, `conflict-actions`).

**Action callbacks are now stable** — they only re-create when the specific sub-states they consume change. A `statusMessage` update no longer re-creates `toggleFocusMode`.

### Layer 5 — Consumer (`App` → `ProjectEditorView`)

File: `src/app.tsx`

```tsx
const model = useProjectEditor()
// model.state = buildProjectEditorModelState(values) — new object every render
// model.actions = { deleteFolder, renameFile, ... } — new object every render
return <ProjectEditorView model={model} ... />
```

`model` is ALWAYS a new reference. `buildProjectEditorModelState(values)` creates a fresh state object. Components receiving `model` always re-render.

## Data flow diagram

```
useProjectEditorCoreState()
  │
  ├─ snapshot, setSnapshot, rootPath, setRootPath, ...
  │
  ▼
project-editor-private/state.ts
  │
  ├─ documentState (useMemo)
  │   └─ selectedPath, editorValue, editorMeta, isDirty
  │
  ├─ layoutState (useMemo)
  │   └─ workspaceLayout
  │
  ├─ sidebarState (useMemo)
  │   └─ sidebarActiveSection, sidebarPanelCollapsed, sidebarPanelWidth, focusModeEnabled
  │
  ├─ projectState (useMemo)
  │   └─ rootPath, snapshot, visibleFiles, corkboardOrder
  │
  ├─ uiState (useMemo)
  │   └─ apiAvailable, loadingProject, loadingDocument, saving, isFullscreen, externalConflictPath, conflictComparisonContent, statusMessage
  │
  ├─ values (via private memoized projection) — legacy backward-compatible object
  │
  ├─ setters (useMemo)
  │   ├─ setSnapshot = coreState.setSnapshot (stable useState setter)
  │   ├─ setRootPath = coreState.setRootPath
  │   └─ setWorkspaceLayout (from useWorkspaceLayoutState)
  │
  ├─ paneBindings (useMemo)
  │   └─ primaryPane, secondaryPane, setPrimaryPane, setSecondaryPane
  │
  ▼
useProjectEditor() — creates one stable PaneWorkspace via usePaneWorkspace() and is the only importer of `project-editor-private/`
  │
  ▼
PaneWorkspace.updateDependencies(...)
  │
  ▼
project-editor-private/actions.ts
  │
  ├─ openProject = useOpenProject(setters, clearEditor, loadDocument)
  │   └─ calls setters.setSnapshot(snapshot) in applyOpenedProject
  │
  ├─ builds flat actions over `workspace-actions`, `sidebar-file-actions`, and `conflict-actions`
  │   └─ editFileTags → workspace.updatePaneMeta(path, nextMeta)
  │
  └─ ... other actions

▼
App → ProjectEditorView → ... → SidebarTree
  (model.state.visibleFiles flows down)
```

## Critical invariant

`setSnapshot` is always a stable function reference (from `useState` in `useProjectEditorCoreState`). **Any call to `setters.setSnapshot(snapshot)` will update the core state, regardless of which render produced the `setters` object.** The `setters` container object is now memoized (since individual setters are stable), but the functions inside were always stable.

## PaneWorkspace mutation surface

After pane-isolation-plan-v2, all pane mutation goes through `PaneWorkspace` public methods:

| Method | Called by | Replaces |
|--------|-----------|----------|
| `updatePaneContent(pane, content)` | `useEditorViewActions.updateEditorValue` | Direct `setPrimaryPane`/`setSecondaryPane` calls |
| `loadPaneDocument(pane, path, content, meta)` | `useLoadDocument` in actions | Direct `setPrimaryPane`/`setSecondaryPane` calls |
| `clearPanes()` | `useClearEditor` in actions | Direct `setPrimaryPane(emptyPane)`/`setSecondaryPane(emptyPane)` calls |
| `updatePaneMeta(path, meta)` | `useEditFileTagsAction` | Direct `setPrimaryPane`/`setSecondaryPane` calls |
| `savePaneIfDirty(pane)` | `saveNow`, autosave, switch-pane | Flush + save + private `markPaneSaved` |

No code outside `pane/` calls `setPrimaryPane`/`setSecondaryPane` directly. The `markPaneSaved` method is private — only `savePaneIfDirty` calls it after a successful IPC save.

## Common failure modes

1. **Stale closure with non-setter functions** — `clearEditor` and `loadDocument` are NOT stable (recreated via `useCallback`). If captured in a long-lived closure (e.g. an effect), they may be stale. Use the `setters` object's stable setters for state updates, and use `useRef` for side-effect coordination.

2. **Memoization not triggering** — `useMemo([coreState.snapshot])` compares references with `===`. If `setSnapshot` is called with the same object reference, the memo won't recompute. Always pass a new object to `setSnapshot`.

3. **State update after component unmount** — If the component unmounts during an async operation (e.g. `openProject`), the state setters are no-ops. Preact handles this gracefully but the snapshot won't be applied.

4. **Sub-state mismatch in action hooks** — Action hooks must receive the correct sub-state type. Passing a stub (e.g. `documentState` with `selectedPath: null`) to conflict actions silently breaks flows because the action returns early on null checks. Always derive real sub-states from pane + layout state.

5. **Depending on `values` instead of sub-states** — New action hooks should consume `layoutState`, `paneState`, etc., not the monolithic `values` object. Depending on `values` re-introduces the false re-render cascade that the sub-state decomposition was designed to fix.

6. **Post-save dirty flag still true** — If `saveNow` is fire-and-forget (`void`), tests may read `isDirty` before `markPaneSaved` completes. Use `await` if downstream code needs post-save state. See `docs/lessons-learned/awaitable-save-actions.md`.

## Files to inspect

| File | Role |
|------|------|
| `src/features/project-editor/use-project-editor-core-state.ts` | Raw useState hooks |
| `src/features/project-editor/project-editor-private/state.ts` | Derived values + memoized sub-states + setters/paneBindings assembly |
| `src/features/project-editor/pane/pane-workspace.ts` | `PaneWorkspace` facade with mutation methods, private `markPaneSaved` |
| `src/features/project-editor/pane/use-pane-workspace.ts` | Factory hook that encapsulates setter injection via one stable `PaneWorkspace` instance and dependency sync |
| `src/features/project-editor/project-editor-private/actions.ts` | Private action composition hub over the deep Modules |
| `src/features/project-editor/use-project-editor.ts` | Public seam for App; consumes private state/actions Modules and builds `PaneWorkspace` |
| `src/app.tsx` | Top-level component wiring |
| `src/features/project-editor/project-editor-private/open-project.ts` | `applyOpenedProject` — where setSnapshot is called |
| `src/features/project-editor/sidebar-file-actions/private/folder-crud.ts` | `deleteFolder` — prunes layout before openProject |
| `src/features/project-editor/sidebar-file-actions/private/file-crud.ts` | `deleteFile` — simpler flow without layout pruning |
