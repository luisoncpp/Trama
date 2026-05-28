# Split Pane Architecture

Goal: document the per-pane state model and the formal contracts that govern split-pane coordination. This doc supersedes the informal coordination notes and encodes the lessons learned from 8 split-pane bugfixes.

## Why This Exists

The split pane feature had 8 dedicated lessons-learned files because the per-pane state model was never formally documented. Every one of those bugs — dirty badge in wrong pane, pane-targeted save routing, sidebar showing wrong file on pane switch, preferred pane reset after reopen, test non-determinism — traced back to the same root cause: actions inferring pane identity from global active-pane state instead of receiving it explicitly.

## The Two-Layer State Model

Split pane coordination has **two distinct layers** that must not be conflated:

### Layer 1 — Workspace Layout (synchronous, decisional)

```
WorkspaceLayoutState {
  mode: 'single' | 'split'
  ratio: number
  primaryPath: string | null   ← file assigned to primary pane
  secondaryPath: string | null ← file assigned to secondary pane
  activePane: 'primary' | 'secondary'  ← which pane is "in focus"
  focusModeEnabled: boolean
  focusScope: 'line' | 'sentence' | 'paragraph'
}
```

**Layout state is synchronous.** It decides which file belongs to which pane and which pane is active. All UI-shared state (`selectedPath`, toolbar state) must derive from layout state, not from document state.

**Source:** `src/features/project-editor/project-editor-types.ts` + `src/features/project-editor/use-workspace-layout-state.ts`

### Layer 2 — Pane Document State (asynchronous, per-pane content)

```
PaneDocumentState {
  path: string | null        ← document currently loaded in this pane
  content: string            ← live editor content
  meta: DocumentMeta
  isDirty: boolean
}
```

There are two independent `PaneDocumentState` instances: `primaryPane` and `secondaryPane`.

**Document state is asynchronous.** Documents load after layout changes. During a pane switch, `workspaceLayout.activePane` updates synchronously but the new pane's document loads asynchronously. Deriving UI state from pane document state causes stale/null flashes during transitions.

**Source:** `src/features/project-editor/project-editor-private/state.ts`

## PaneWorkspace — Coordinator with Internal Timer

Action hooks no longer reciben `layoutState` + `paneState` separados y recalculan proyecciones localmente. En cambio, consumen una instancia de `PaneWorkspace` que actúa como fachada completa de paneles: lectura, mutación, save, flush y autosave.

`PaneWorkspace` recibe los setters de Preact via `paneBindings` (con `primaryPane`, `secondaryPane`, `setPrimaryPane`, `setSecondaryPane`) y es el **único** modulo que llama `setPrimaryPane`/`setSecondaryPane`. Los hooks externos solo usan los métodos públicos de la fachada.

La instancia de `PaneWorkspace` debe permanecer estable durante la sesión. `usePaneWorkspace()` la crea una sola vez y luego sincroniza dentro de ella el `layoutState`, `paneBindings`, refs de serialización y `saveDocumentFn` actuales mediante `updateDependencies(...)`.

```typescript
class PaneWorkspace {
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private layoutState: WorkspaceLayoutState,
    private paneBindings: PaneBindings,  // { primaryPane, secondaryPane, setPrimaryPane, setSecondaryPane }
    private serializationRefs: {
      primary: { current: EditorSerializationRefs }
      secondary: { current: EditorSerializationRefs }
    },
    private saveDocumentFn: (path: string, content: string, meta: DocumentMeta) => Promise<void>,
  ) {}

  // Query methods (read-only)
  getActivePaneDocument(): ActivePaneDocumentInfo  // selectedPath, editorValue, editorMeta, isDirty
  getPaneDocument(pane: WorkspacePane): PaneDocumentInfo  // path, content, isDirty
  isPaneDirty(pane?: WorkspacePane): boolean           // usa active si pane es undefined
  canSwitchAwayFrom(pane?: WorkspacePane): boolean     // true si no está dirty o no tiene path

  // Mutation methods (public)
  updatePaneContent(pane: WorkspacePane, content: string): void        // actualiza contenido y marca dirty
  loadPaneDocument(pane: WorkspacePane, path: string, content: string, meta: DocumentMeta): void  // carga documento en un pane
  clearPanes(): void                                                    // limpia ambos paneles (no toca layout)
  updatePaneMeta(path: string, meta: DocumentMeta): void                // actualiza meta del pane con ese path

  // Persistence methods
  savePaneIfDirty(pane: WorkspacePane): Promise<void>  // flush + save + markPaneSaved
  saveAllDirtyPanes(): Promise<void>                    // flush + save both panes

  // Coordination methods
  scheduleAutosave(pane: WorkspacePane, delay: number): void  // sin callback,interno
  cancelAutosave(): void
  updateDependencies(...): void
  destroy(): void

  // Direct access getters (frozen copies)
  get layout(): Readonly<WorkspaceLayoutState>
  get primary(): Readonly<PaneDocumentState>
  get secondary(): Readonly<PaneDocumentState>
}
```

**Responsibilities:**
- Query facade: exposes pane state without mutating Preact state
- Mutation facade: `updatePaneContent`, `loadPaneDocument`, `clearPanes`, `updatePaneMeta` — únicos puntos de entrada para mutar paneles
- Persistence coordinator: owns flush, save, and autosave timer internally; `markPaneSaved` is **private** and called by `savePaneIfDirty` after successful IPC save
- `scheduleAutosave` no longer takes a callback — save policy lives inside the module

**Files:**
- `src/features/project-editor/pane/pane-workspace.ts` — the class with `PaneBindings` interface and mutation methods
- `src/features/project-editor/pane/index.ts` — barrel export (`PaneWorkspace`, `usePaneWorkspace`, `PaneBindings`, and public types)
- `src/features/project-editor/pane/use-pane-workspace.ts` — factory hook that encapsulates Preact setter injection, creates one stable `PaneWorkspace` via `useRef`, and syncs live dependencies into it
- `src/features/project-editor/pane/pane-save-logic.ts` — `executePaneSave` (internal, not exported)

## The Formal Contracts

### Contract 1: `selectedPath` derives from layout, not document state

**Wrong:**
```typescript
// Causes lag when switching panes — pane.path is async-loading
selectedPath: activePaneState.path
```

**Correct:**
```typescript
// Sidebar updates immediately — layout path is synchronous
const activePaneLayoutPath = workspaceLayout.activePane === 'secondary'
  ? workspaceLayout.secondaryPath
  : workspaceLayout.primaryPath
selectedPath: activePaneLayoutPath
```

**Why it matters:** When activating a pane, `workspaceLayout.activePane` updates immediately but the target pane's document (`secondaryPane.path`) may still be loading. Deriving `selectedPath` from document state causes the sidebar to go blank during the load window.

**File:** `src/features/project-editor/project-editor-private/state.ts`

### Contract 2: Editor `onChange` should pass explicit pane identity

**Rule:** Every `onChange` callback from a split-pane editor should call `updateEditorValue(nextValue, pane)` with an explicit pane argument when possible. Both `updateEditorValue` and `saveNow` accept an optional `pane` parameter — when omitted, they fall back to `workspaceLayout.activePane`. Explicit routing avoids race conditions when the secondary editor's `onChange` fires while `activePane` still points at primary.

**Wrong:**
```typescript
// Infers target pane from global activePane — drifts with event timing
onPaneEditorChange = (nextValue: string) => {
  actions.updateEditorValue(nextValue)  // falls back to activePane
}
```

**Correct:**
```typescript
// Routes directly to the pane that emitted the event
onPaneEditorChange = (nextValue: string) => {
  actions.updateEditorValue(nextValue, pane)  // explicit pane
}
```

**Why it matters:** Pointer/focus timing can leave `workspaceLayout.activePane` pointing at the wrong pane when the secondary editor's `onChange` fires. Explicit routing avoids this race.

**File:** `src/features/project-editor/components/workspace-editor-panels.tsx:37-39`

### Contract 3: Manual save should pass explicit pane identity

**Rule:** Each pane's save affordance should call `saveNow(pane)` so clicks in the secondary pane save the secondary pane's document, not the active pane's. Both `updateEditorValue` and `saveNow` accept an optional `pane` parameter — when omitted, they fall back to `activePane`. Explicit routing is preferred when the call site knows which pane triggered the action.

`saveNow` is also awaitable. Interactive callers may ignore the returned promise, but tests and any flow that needs to observe post-save pane state should await it so the full `savePaneIfDirty()` chain (`flush -> save -> markPaneSaved`) finishes before the next assertion or state transition.

**Wrong:**
```typescript
// Could save primary when user clicked secondary's save button
onPaneSaveNow = () => actions.saveNow()  // falls back to activePane
```

**Correct:**
```typescript
// Saves the pane whose button was clicked
onPaneSaveNow = () => actions.saveNow(pane)
```

**Why it matters:** `workspaceLayout.activePane` can differ from the pane whose save button was clicked if focus hasn't followed the pointer.

**File:** `src/features/project-editor/components/workspace-editor-panels.tsx:40-42`

### Contract 4: Dirty guard protects the active projected document only

**Rule:** The dirty guard (`canSelectFile`) checks `values.isDirty` — the active pane's projected dirty state — not both panes.

```typescript
if (!canSelectFile(values.isDirty, values.selectedPath, filePath)) {
  setters.setStatusMessage(PROJECT_EDITOR_STRINGS.statusNeedSaveBeforeSwitch)
  return
}
```

**Why it matters:** This protects the currently active document from unsaved-work loss. Both panes being dirty is fine — the guard only blocks if navigating away from the active dirty document.

**File:** `src/features/project-editor/workspace-actions.ts:openFileInPane`

### Contract 5: `openProject(root, preferredFilePath?, preferredPane?)` with explicit pane handling

The `preferredPane` parameter exists so conflict-resolution flows (save-as-copy) can reopen the project with the new file in the same pane where the conflict occurred.

**Flow:**
1. `applyOpenedProject` reconciles layout and applies `preferredPane` to `activePane`
2. Seeds pane-history initial entries from the reconciled layout
3. Loads active pane document first
4. Preloads inactive pane document if in split mode and path differs

**Why `preferredPane` matters:** Without it, the single-document state model would overwrite pane intent on reopen.

**Why the seeding step matters:** if project-open resets pane history and restores the same persisted pane paths, path-based render effects may not run again, leaving the first opened pane documents unreachable via Back.

**File:** `src/features/project-editor/project-editor-private/open-project.ts`

### Contract 6: Split mode transitions are explicit, not automatic

| Transition | Trigger | Behavior |
|---|---|---|
| `single` → `split` | `openFileInPane(path, 'secondary')` | Forces split, sets `secondaryPath`, activates secondary |
| `single` → `split` | `toggleWorkspaceLayoutMode()` with candidate | Finds second file, activates primary |
| `split` → `single` | `toggleWorkspaceLayoutMode()` | Sets `mode: 'single'`, activates primary |

**No implicit mode changes.** Split mode only enters via explicit action.

**File:** `src/features/project-editor/workspace-actions.ts:toggleWorkspaceLayoutMode`

### Contract 7: Test setup must normalize layout before asserting

**Rule:** Any split-mode test must explicitly set `mode` and `activePane` before the scenario under test.

```typescript
// WRONG — toggle is non-deterministic if mode is already split
await act(async () => { model?.actions.toggleWorkspaceLayoutMode() })

// CORRECT — normalize to known state first
if (model?.state.workspaceLayout.mode !== 'split') {
  await act(async () => { model?.actions.toggleWorkspaceLayoutMode() })
}
expect(model?.state.workspaceLayout.mode).toBe('split')
```

**Why it matters:** Layout persists across test runs (`trama.workspace.layout.v1`). Tests that assume fixed initial layout without normalizing setup are non-deterministic.

**File:** `tests/project-editor-conflict-flow.test.ts`

## State Projection Map

From `buildProjectEditorValues` in `project-editor-private/state.ts`:

| Projected value | Source | Notes |
|---|---|---|
| `selectedPath` | `workspaceLayout.primaryPath` or `secondaryPath` | **Layout layer** — synchronous, use for sidebar |
| `editorValue` | `activePane.content` | Document layer — async |
| `editorMeta` | `activePane.meta` | Document layer |
| `isDirty` | `activePane.isDirty` | Document layer |

The active pane is determined by `workspaceLayout.activePane` and then used to select which `PaneDocumentState` feeds the projection.

## Sub-State Decomposition (Memoized)

To prevent false re-render cascades caused by a single `values` object changing on every render, the private state Module returns stable sub-state objects built with inlined memo projections:

| Sub-state | Type | Contains | Consumed by |
|---|---|---|---|
| `documentState` | `ProjectEditorDocumentState` | `selectedPath`, `editorValue`, `editorMeta`, `isDirty` | Conflict actions, editor view actions |
| `layoutState` | `ProjectEditorLayoutState` | `workspaceLayout` | Layout actions, sidebar actions, focus actions |
| `sidebarState` | `ProjectEditorSidebarState` | `sidebarActiveSection`, `sidebarPanelCollapsed`, `sidebarPanelWidth`, `focusModeEnabled` | Sidebar actions, focus actions, create actions |
| `projectState` | `ProjectEditorProjectState` | `rootPath`, `snapshot`, `visibleFiles`, `corkboardOrder` | File/folder/create actions, layout actions |
| `uiState` | `ProjectEditorUiState` | `apiAvailable`, `loadingProject`, `loadingDocument`, `saving`, `isFullscreen`, `externalConflictPath`, `conflictComparisonContent`, `statusMessage` | Conflict actions, editor view actions |

**Rule:** The private action Module in `project-editor-private/actions.ts` builds the full `ProjectEditorActions` surface via one `useMemo` over the three deep Modules. Callers receive a stable `actions` object instead of many independent callbacks.

**Source:** `src/features/project-editor/project-editor-private/state.ts`

## Key Implementation Files

| File | Role |
|---|---|---|
| `src/features/project-editor/project-editor-types.ts` | `WorkspaceLayoutState`, `PaneDocumentState`, `WorkspacePane`, and 6 sub-state type definitions |
| `src/features/project-editor/pane/pane-workspace.ts` | `PaneWorkspace` coordinator: read methods + mutation methods (`updatePaneContent`, `loadPaneDocument`, `clearPanes`, `updatePaneMeta`) + `savePaneIfDirty`/`saveAllDirtyPanes` + `scheduleAutosave`; `markPaneSaved` is private; receives `PaneBindings` with Preact setters |
| `src/features/project-editor/pane/use-pane-workspace.ts` | Factory hook that encapsulates setter injection via `useMemo`, creating a `PaneWorkspace` instance from `paneBindings` + `serializationRefs` + `saveDocumentFn` |
| `src/features/project-editor/pane/index.ts` | Barrel: exports `PaneWorkspace`, `usePaneWorkspace`, `PaneBindings`, and public types |
| `src/features/project-editor/pane/pane-save-logic.ts` | `executePaneSave` helper (internal, not in barrel) |
| `src/features/project-editor/use-project-editor.ts` | Composition root and public seam: creates `PaneWorkspace`, wires `serializationRefs`/`saveDocumentFn`, and is the only importer of `project-editor-private/` |
| `src/features/project-editor/project-editor-private/state.ts` | Private state assembly: layout+document projection to shared state, visible-files derivation, setters, and `paneBindings` |
| `src/features/project-editor/workspace-actions.ts` | Deep module for workspace layout, pane activation, focus, fullscreen, editor view, save, and revert |
| `src/features/project-editor/sidebar-file-actions/index.ts` | Deep module facade for sidebar UI and file/folder CRUD |
| `src/features/project-editor/conflict-actions.ts` | Deep module for external-edit conflict resolution |
| `src/features/project-editor/project-editor-private/actions.ts` | Private action assembly over `workspace-actions`, `sidebar-file-actions`, and `conflict-actions` |
| `src/features/project-editor/project-editor-private/open-project.ts` | `applyOpenedProject` with `preferredPane` handling |
| `src/features/project-editor/project-editor-logic.ts` | `reconcileWorkspaceLayout`, `canSelectFile` |
| `src/features/project-editor/components/workspace-editor-panels.tsx` | Split UI with explicit pane routing in `PaneEditor` |

## Regression Tests

Run these first when debugging split-pane issues:

```bash
npm run test -- tests/project-editor-conflict-flow.test.ts
npm run test -- tests/use-project-editor.test.ts
npm run test -- tests/workspace-layout-persistence.test.ts
npm run test -- tests/pane-workspace.test.ts
npm run test -- tests/use-pane-workspace.test.ts
```
