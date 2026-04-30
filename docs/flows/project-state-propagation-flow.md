# Project State Propagation Flow

## Trigger

Any IPC handler that returns a new `ProjectSnapshot` — usually `handleOpenProject` called after a file/folder create, rename, delete, move, or after an external file event.

## Entry point

`useProjectEditor()` in `src/features/project-editor/use-project-editor.ts:118`.

## Why this flow matters

This is the central state wiring hub. `setters` and `values` objects are recreated every render (not memoized), which causes all `useCallback` dependencies to change every render. This design has a critical implication: **every callback is always "latest"**, but every callback is also **recreated every render**. Understanding this is essential for debugging stale-closure or missed-render issues.

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

Assembles two objects:
- `values` via `buildValues()` — all readable state (snapshot, panes, visibleFiles, etc.) plus UI projections (`selectedPath`, `editorValue`, `isDirty` from active pane)
- `setters` via `buildSetters()` — all setters wrapped into one object

**Both `values` and `setters` are recreated every render.** The setter functions inside (`setSnapshot`, `setRootPath`, etc.) are stable `useState` setters, but the container objects are fresh.

### Layer 3 — Actions (`useProjectEditorActions`)

File: `src/features/project-editor/use-project-editor-actions.ts`

De-structures `values` and `setters` from the state result. Creates:

| Action | Built by | Deps |
|--------|----------|------|
| `clearEditor` | `useClearEditor(setters)` | `[setters]` |
| `loadDocument` | `useLoadDocument(setters)` | `[setters]` |
| `openProject` | `useOpenProject(setters, clearEditor, loadDocument)` | `[clearEditor, loadDocument, setters]` |
| `saveDocumentNow` | `useSaveDocumentNow(setters)` | `[setters]` |
| UI actions | `useProjectEditorUiActions(...)` | passes `values, setters, openProject, loadDocument` |
| Folder actions | `useProjectEditorFolderActions({ values, setters, openProject })` | `[openProject, setters, values]` |
| File actions | `useProjectEditorFileActions({ values, setters, openProject })` | `[openProject, setters, values.rootPath]` |

**Every `useCallback` in Layer 3 has dependencies that change every render** (because `values`, `setters`, or derived callbacks change). Result: every action callback is recreated every render, always capturing the latest state.

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
  ├─ values (via buildValues)
  │   ├─ snapshot, rootPath, panes, loading flags
  │   ├─ visibleFiles (useMemo from snapshot)
  │   ├─ corkboardOrder (useMemo from snapshot)
  │   ├─ selectedPath, editorValue, isDirty (projected from active pane)
  │   └─ workspaceLayout (from useWorkspaceLayoutState)
  │
  ├─ setters (via buildSetters)
  │   ├─ setSnapshot = coreState.setSnapshot (stable useState setter)
  │   ├─ setRootPath = coreState.setRootPath
  │   ├─ setPrimaryPane, setSecondaryPane, ...
  │   └─ setWorkspaceLayout (from useWorkspaceLayoutState)
  │
  ▼
useProjectEditorActions(state, refs)
  │
  ├─ openProject = useOpenProject(setters, clearEditor, loadDocument)
  │   └─ calls setters.setSnapshot(snapshot) in applyOpenedProject
  │
  ├─ deleteFolder = useCallback(..., [openProject, setters, values])
  │   └─ calls setters.setWorkspaceLayout(nextLayout), then openProject(...)
  │
  ├─ deleteFile = useCallback(..., [openProject, setters, values.rootPath])
  │   └─ calls setters.setStatusMessage, then openProject(values.rootPath)
  │
  └─ ... other actions

▼
App → ProjectEditorView → ... → SidebarTree
  (model.state.visibleFiles flows down)
```

## Critical invariant

`setSnapshot` is always a stable function reference (from `useState` in `useProjectEditorCoreState`). **Any call to `setters.setSnapshot(snapshot)` will update the core state, regardless of which render produced the `setters` object.** The `setters` container object is recreated every render, but the functions inside are stable.

## Common failure modes

1. **Stale closure with non-setter functions** — `clearEditor` and `loadDocument` are NOT stable (recreated via `useCallback` every render). If captured in a long-lived closure (e.g. an effect), they may be stale. Use the `setters` object's stable setters for state updates, and use `useRef` for side-effect coordination.

2. **Memoization not triggering** — `useMemo([coreState.snapshot])` compares references with `===`. If `setSnapshot` is called with the same object reference, the memo won't recompute. Always pass a new object to `setSnapshot`.

3. **State update after component unmount** — If the component unmounts during an async operation (e.g. `openProject`), the state setters are no-ops. Preact handles this gracefully but the snapshot won't be applied.

## Files to inspect

| File | Role |
|------|------|
| `src/features/project-editor/use-project-editor-core-state.ts` | Raw useState hooks |
| `src/features/project-editor/use-project-editor-state.ts` | Derived values + setters assembly |
| `src/features/project-editor/use-project-editor-actions.ts` | Action composition hub |
| `src/features/project-editor/use-project-editor.ts` | Model assembly for App |
| `src/app.tsx` | Top-level component wiring |
| `src/features/project-editor/use-project-editor-open-project.ts` | `applyOpenedProject` — where setSnapshot is called |
| `src/features/project-editor/use-project-editor-folder-actions.ts` | `executeFolderDelete` — prunes layout before openProject |
| `src/features/project-editor/use-project-editor-file-actions.ts` | `useDeleteFileAction` — simpler flow without layout pruning |
