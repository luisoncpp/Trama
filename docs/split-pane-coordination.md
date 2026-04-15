# Split Pane Coordination Guide

Goal: explain how `primary`/`secondary` panes are coordinated end-to-end so regressions can be debugged without broad code searches.

## Scope

This guide covers renderer-side coordination in `project-editor`:
- pane state ownership
- active-pane projection
- split/single mode transitions
- file-open and pane-switch behavior
- dirty/save semantics
- conflict and autosave implications

## Core model

There are two layers of state:

1. Pane-owned document state (`PaneDocumentState`)
- `primaryPane`: `{ path, content, meta, isDirty }`
- `secondaryPane`: `{ path, content, meta, isDirty }`
- Source: `src/features/project-editor/use-project-editor-state.ts`

2. Workspace layout state (`WorkspaceLayoutState`)
- `mode`: `single | split`
- `primaryPath`, `secondaryPath`
- `activePane`: `primary | secondary`
- Source: `src/features/project-editor/project-editor-types.ts`

The active editor view is a projection:
- `selectedPath`, `editorValue`, `editorMeta`, `isDirty`
- computed from `workspaceLayout.activePane` in `buildValues()`
- Source: `src/features/project-editor/use-project-editor-state.ts`

## Source of truth by concern

- Pane content/dirty: `primaryPane` / `secondaryPane`
- Which pane is currently driving generic editor actions: `workspaceLayout.activePane`
- Which files are assigned to panes: `workspaceLayout.primaryPath` / `workspaceLayout.secondaryPath`
- Single-panel UI values: derived projection (`selectedPath`, `editorValue`, `isDirty`)

## Action flow map

### 1) Typing in editor

Split mode:
- `PaneEditor` routes onChange with explicit pane:
- `actions.updateEditorValue(nextValue, pane)`
- Source: `src/features/project-editor/components/workspace-editor-panels.tsx`

Single mode:
- `ActiveEditorPanel` calls `actions.updateEditorValue(nextValue)`
- action falls back to `pane ?? activePane`
- Source: `src/features/project-editor/use-project-editor-ui-actions.ts`

Dirty semantics:
- target pane gets `{ content: nextValue, isDirty: true }`
- other pane remains unchanged

### 2) Switching active pane

- `setWorkspaceActivePane(pane)` resolves `nextPath` from layout
- guarded by `canSelectFile(values.isDirty, values.selectedPath, nextPath)`
- if blocked, status: `Save or wait for autosave before switching files.`
- if allowed, updates `activePane` and conditionally loads document into target pane when `targetPaneState.path !== nextPath`
- Source: `src/features/project-editor/use-project-editor-layout-actions.ts`

Important:
- the dirty guard checks the active projection (`values.isDirty`), not both panes.
- this is intentional: it protects from leaving the currently active dirty document.

### 3) Opening a file in a specific pane

- `openFileInPane(filePath, pane)`
- secondary path:
  - forces split mode (`single -> split`)
  - sets `activePane = secondary`
  - sets `secondaryPath = filePath`
  - loads file only when path changed
- primary path:
  - guarded by `canSelectFile(...)`
  - sets `activePane = primary`, `primaryPath = filePath`
  - loads file when path changed
- Source: `src/features/project-editor/use-project-editor-layout-actions.ts`

### 4) Open project / restore layout

- `reconcileWorkspaceLayout(...)` normalizes ratio/mode/paths and preferred path handling
- `applyOpenedProject(...)`:
  - stores snapshot
  - reconciles layout
  - loads active pane file first
  - preloads inactive pane file in split mode if different
- Sources:
  - `src/features/project-editor/project-editor-logic.ts`
  - `src/features/project-editor/use-project-editor-open-project.ts`

## Save semantics

`saveDocumentNow(path, content, meta)`:
- writes one path through IPC
- clears dirty in any pane whose `pane.path === savedPath`
- this can clear one or both panes if they reference same path
- Source: `src/features/project-editor/use-project-editor-actions.ts`

Manual save button semantics:
- single-pane UI uses `saveNow()` and therefore saves the active projected document
- split-pane UI must call `saveNow(pane)` so the clicked panel saves its own pane state even if `activePane` has not switched yet
- Source: `src/features/project-editor/use-project-editor-ui-actions.ts` and `src/features/project-editor/components/workspace-editor-panels.tsx`

## Autosave semantics

Autosave runs on projected active values only:
- `selectedPath`
- `isDirty`
- `editorValue`
- `editorMeta`

Therefore autosave targets the active pane document.
- Source: `src/features/project-editor/use-project-editor-autosave-effect.ts`

## External conflict semantics

External-event handling receives:
- active pane
- selected path
- projected `isDirty`

Conflict UI is driven from active document context.
- Source: `src/features/project-editor/use-project-editor.ts` and `use-project-editor-external-events-effect.ts`

## Known invariants

1. Split editors must pass explicit pane in onChange.
2. Active projection must remain a pure derived view from `activePane`.
3. Save dirty-clear must remain path-based, not pane-based.
4. Pane switching dirty guard protects current active document.
5. Open-project preload keeps both panes coherent in split mode.

## Fast debug path (2-3 minutes)

1. Read this file.
2. Verify wiring in `src/features/project-editor/components/workspace-editor-panels.tsx`.
3. Verify update behavior in `src/features/project-editor/use-project-editor-ui-actions.ts`.
4. Verify guards/load rules in `src/features/project-editor/use-project-editor-layout-actions.ts`.
5. Run `npm run test -- tests/project-editor-conflict-flow.test.ts`.

## Regression tests to trust first

- `tests/project-editor-conflict-flow.test.ts`
- `tests/use-project-editor.test.ts`
- `tests/typescript-compile.test.ts`
