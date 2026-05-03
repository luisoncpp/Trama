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

### Layer 2 — Derived state (`useProjectEditorState`)

File: `src/features/project-editor/use-project-editor-state.ts`

Adds three externally-persisted state hooks:
- `useWorkspaceLayoutState()` — layout (single/split, pane assignments, focus mode) persisted to `localStorage`
- `useSidebarUiState()` — sidebar section, panel collapsed, panel width

Computes memoized derived values:
- `visibleFiles = useMemo(() => getVisibleSidebarPaths(coreState.snapshot), [coreState.snapshot])`
- `corkboardOrder = useMemo(() => coreState.snapshot?.index?.corkboardOrder ?? {}, [coreState.snapshot])`

Assembles **6 memoized sub-states** via `use-project-editor-sub-state-hooks.ts`:
- `documentState` — active pane path, content, meta, dirty flag
- `paneState` — both pane document states (used by `use-project-editor.ts` to build `paneBindings`)
- `layoutState` — workspace layout
- `sidebarState` — sidebar section, collapse, width, focus mode flag
- `projectState` — root path, snapshot, visible files, corkboard order
- `uiState` — loading/saving/fullscreen/conflict/message flags

Also assembles legacy objects for backward compatibility:
- `values` via `buildValues()` — all readable state plus UI projections (`selectedPath`, `editorValue`, `isDirty` from active pane)
- `setters` via `useMemo()` — all setters wrapped into one object. `setPrimaryPane`/`setSecondaryPane` are kept in the setters object for internal use by `use-project-editor.ts` to build `paneBindings`, but they are not part of the public API consumed by action hooks.

**The 6 sub-states are memoized with `useMemo`.** Action hooks should depend on the specific sub-states they read, not on `values`.

### Layer 3 — Actions (`useProjectEditorActions`)

File: `src/features/project-editor/use-project-editor-actions.ts`

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

Then composes UI actions via `useProjectEditorUiActions(...)`, which receives the sub-states + `paneWorkspace` and passes each one only to the hooks that need it:

| Hook | Receives | Why |
|------|----------|-----|
| `useSidebarActions` | `layoutState`, `sidebarState`, `setters` | Only reads layout and sidebar flags |
| `useWorkspaceLayoutActions` | `workspace`, `projectState`, `setters` | Needs workspace for pane queries and project snapshot for split transitions |
| `useEditorViewActions` | `workspace`, `uiState`, `setters` | Needs workspace for `updatePaneContent` and `savePaneIfDirty` |
| `useProjectEditorCreateActions` | `projectState`, `sidebarState`, `setters` | Needs root path and active sidebar section |
| `useProjectEditorFileActions` | `workspace`, `projectState`, `setters` | Needs workspace for dirty guards and `updatePaneMeta` |
| `useProjectEditorFolderActions` | `workspace`, `projectState`, `setters` | Needs workspace for dirty guards and layout for path pruning |
| `useSecondaryProjectEditorActions` | `workspace`, `documentState`, `projectState`, `uiState`, `setters` | Conflict actions need the active document's content/path |

**Action callbacks are now stable** — they only re-create when the specific sub-states they consume change. A `statusMessage` update no longer re-creates `toggleFocusMode`.

### Layer 4 — Consumer (`App` → `ProjectEditorView`)

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
useProjectEditorState()
  │
  ├─ documentState (useMemo)
  │   └─ selectedPath, editorValue, editorMeta, isDirty
  │
  ├─ paneState (useMemo)
  │   └─ primaryPane, secondaryPane
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
  ├─ values (via buildValues) — legacy backward-compatible object
  │
  ├─ setters (useMemo)
  │   ├─ setSnapshot = coreState.setSnapshot (stable useState setter)
  │   ├─ setRootPath = coreState.setRootPath
  │   ├─ setPrimaryPane, setSecondaryPane (internal, for paneBindings construction)
  │   └─ setWorkspaceLayout (from useWorkspaceLayoutState)
  │
  ▼
useProjectEditor() — builds paneBindings from paneState + setters, creates PaneWorkspace via usePaneWorkspace()
  │
  ▼
useProjectEditorActions(subStates, setters, paneWorkspace)
  │
  ├─ openProject = useOpenProject(setters, clearEditor, loadDocument)
  │   └─ calls setters.setSnapshot(snapshot) in applyOpenedProject
  │
  ├─ useProjectEditorUiActions({ layoutState, projectState, uiState, sidebarState, setters, openProject, loadDocument, paneWorkspace })
  │   ├─ sidebarActions ← useSidebarActions(workspace.layout, sidebarState, setters)
  │   ├─ layoutActions ← useWorkspaceLayoutActions(workspace, projectState, setters, loadDocument)
  │   ├─ editorViewActions ← useEditorViewActions(workspace, uiState, setters)
  │   │   └─ updateEditorValue → workspace.updatePaneContent(targetPane, nextValue)
  │   │   └─ saveNow → workspace.savePaneIfDirty(targetPane) → flush → save → markPaneSaved (private)
  │   ├─ createActions ← useProjectEditorCreateActions(projectState, sidebarState, setters)
  │   ├─ fileActions ← useProjectEditorFileActions({ workspace, projectState, setters, openProject })
  │   │   └─ editFileTags → workspace.updatePaneMeta(path, nextMeta)
  │   ├─ folderActions ← useProjectEditorFolderActions({ workspace, projectState, setters, openProject })
  │   └─ conflictActions ← useSecondaryProjectEditorActions(workspace, documentState, projectState, uiState, setters)
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
| `src/features/project-editor/use-project-editor-sub-state-hooks.ts` | Memoized sub-state builders (`useDocumentState`, `usePaneState`, etc.) |
| `src/features/project-editor/use-project-editor-state.ts` | Derived values + 6 sub-states + setters assembly |
| `src/features/project-editor/pane/pane-workspace.ts` | `PaneWorkspace` facade with mutation methods, private `markPaneSaved` |
| `src/features/project-editor/pane/use-pane-workspace.ts` | Factory hook that encapsulates setter injection via `useMemo` |
| `src/features/project-editor/use-project-editor-actions.ts` | Action composition hub; passes sub-states + `paneWorkspace` to UI action hooks |
| `src/features/project-editor/use-project-editor.ts` | Model assembly for App; builds `paneBindings` from `paneState` + setters |
| `src/app.tsx` | Top-level component wiring |
| `src/features/project-editor/use-project-editor-open-project.ts` | `applyOpenedProject` — where setSnapshot is called |
| `src/features/project-editor/use-project-editor-folder-actions.ts` | `executeFolderDelete` — prunes layout before openProject |
| `src/features/project-editor/use-project-editor-file-actions.ts` | `useDeleteFileAction` — simpler flow without layout pruning |