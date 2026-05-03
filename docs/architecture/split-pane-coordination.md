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

**Source:** `src/features/project-editor/use-project-editor-state.ts`

## PaneWorkspace — Coordinator with Internal Timer

Action hooks no longer reciben `layoutState` + `paneState` separados y recalculan proyecciones localmente. En cambio, consumen uma instância de `PaneWorkspace` que actúa como fachada completa de paneles: lectura, save, flush y autosave.

```typescript
class PaneWorkspace {
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private layoutState: WorkspaceLayoutState,
    private primaryPane: PaneDocumentState,
    private secondaryPane: PaneDocumentState,
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

  // Persistence methods
  savePaneIfDirty(pane: WorkspacePane): Promise<void>  // flush + save
  saveAllDirtyPanes(): Promise<void>                    // flush + save both panes

  // Coordination methods
  scheduleAutosave(pane: WorkspacePane, delay: number): void  // sin callback,interno
  cancelAutosave(): void
  destroy(): void

  // Direct access getters (frozen copies)
  get layout(): Readonly<WorkspaceLayoutState>
  get primary(): Readonly<PaneDocumentState>
  get secondary(): Readonly<PaneDocumentState>
}
```

**Responsibilities:**
- Query facade: exposes pane state without mutating Preact state
- Persistence coordinator: owns flush, save, and autosave timer internally
- `scheduleAutosave` no longer takes a callback — save policy lives inside the module

**Files:**
- `src/features/project-editor/pane/pane-workspace.ts` — the class
- `src/features/project-editor/pane/index.ts` — barrel export (only `PaneWorkspace` and public types)
- `src/features/project-editor/pane/pane-save-logic.ts` — `executePaneSave` (internal, not exported)
- `src/features/project-editor/use-pane-workspace.ts` — hook adapter (`useMemo`-based, for stubs only)

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

**File:** `src/features/project-editor/use-project-editor-state.ts:97`

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

**File:** `src/features/project-editor/use-project-editor-layout-actions.ts:143-145`

### Contract 5: `openProject(root, preferredFilePath?, preferredPane?)` with explicit pane handling

The `preferredPane` parameter exists so conflict-resolution flows (save-as-copy) can reopen the project with the new file in the same pane where the conflict occurred.

**Flow:**
1. `applyOpenedProject` reconciles layout and applies `preferredPane` to `activePane`
2. Loads active pane document first
3. Preloads inactive pane document if in split mode and path differs

**Why `preferredPane` matters:** Without it, the single-document state model would overwrite pane intent on reopen.

**File:** `src/features/project-editor/use-project-editor-open-project.ts:35-72`

### Contract 6: Split mode transitions are explicit, not automatic

| Transition | Trigger | Behavior |
|---|---|---|
| `single` → `split` | `openFileInPane(path, 'secondary')` | Forces split, sets `secondaryPath`, activates secondary |
| `single` → `split` | `toggleWorkspaceLayoutMode()` with candidate | Finds second file, activates primary |
| `split` → `single` | `toggleWorkspaceLayoutMode()` | Sets `mode: 'single'`, activates primary |

**No implicit mode changes.** Split mode only enters via explicit action.

**File:** `src/features/project-editor/use-project-editor-layout-actions.ts:47-70`

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

From `buildValues()` in `use-project-editor-state.ts`:

| Projected value | Source | Notes |
|---|---|---|
| `selectedPath` | `workspaceLayout.primaryPath` or `secondaryPath` | **Layout layer** — synchronous, use for sidebar |
| `editorValue` | `activePane.content` | Document layer — async |
| `editorMeta` | `activePane.meta` | Document layer |
| `isDirty` | `activePane.isDirty` | Document layer |

The active pane is determined by `workspaceLayout.activePane` and then used to select which `PaneDocumentState` feeds the projection.

## Sub-State Decomposition (Memoized)

To prevent false re-render cascades caused by a single `values` object changing on every render, `useProjectEditorState` now returns six stable sub-state objects via `use-project-editor-sub-state-hooks.ts`:

| Sub-state | Type | Contains | Consumed by |
|---|---|---|---|
| `documentState` | `ProjectEditorDocumentState` | `selectedPath`, `editorValue`, `editorMeta`, `isDirty` | Conflict actions, editor view actions |
| `paneState` | `ProjectEditorPaneState` | `primaryPane`, `secondaryPane` | Persistence, file/folder actions, layout actions |
| `layoutState` | `ProjectEditorLayoutState` | `workspaceLayout` | Layout actions, sidebar actions, focus actions |
| `sidebarState` | `ProjectEditorSidebarState` | `sidebarActiveSection`, `sidebarPanelCollapsed`, `sidebarPanelWidth`, `focusModeEnabled` | Sidebar actions, focus actions, create actions |
| `projectState` | `ProjectEditorProjectState` | `rootPath`, `snapshot`, `visibleFiles`, `corkboardOrder` | File/folder/create actions, layout actions |
| `uiState` | `ProjectEditorUiState` | `apiAvailable`, `loadingProject`, `loadingDocument`, `saving`, `isFullscreen`, `externalConflictPath`, `conflictComparisonContent`, `statusMessage` | Conflict actions, editor view actions |

**Rule:** Action hooks must consume only the sub-states they need, not the monolithic `values` object. This keeps `useCallback`/`useEffect` dependency arrays stable and prevents unrelated state changes from re-creating callbacks.

**Source:** `src/features/project-editor/use-project-editor-sub-state-hooks.ts` + `src/features/project-editor/use-project-editor-state.ts`

## Key Implementation Files

| File | Role |
|---|---|
| `src/features/project-editor/project-editor-types.ts` | `WorkspaceLayoutState`, `PaneDocumentState`, `WorkspacePane`, and 6 sub-state type definitions |
| `src/features/project-editor/pane/pane-workspace.ts` | `PaneWorkspace` coordinator: read methods + `savePaneIfDirty`, `saveAllDirtyPanes`, `scheduleAutosave` (no callback) |
| `src/features/project-editor/pane/index.ts` | Barrel: only `PaneWorkspace` and public types exported |
| `src/features/project-editor/pane/pane-save-logic.ts` | `executePaneSave` helper (internal, not in barrel) |
| `src/features/project-editor/use-project-editor.ts` | Creates `PaneWorkspace` instance with `serializationRefs` and `saveDocumentFn` |
| `src/features/project-editor/use-project-editor-state.ts` | `buildValues()` — projection from layout+document layers to shared state; returns 6 memoized sub-states |
| `src/features/project-editor/use-project-editor-sub-state-hooks.ts` | Memoized sub-state builders (`useDocumentState`, `usePaneState`, `useLayoutState`, `useSidebarSt`, `useProjectSt`, `useUiSt`) |
| `src/features/project-editor/use-project-editor-layout-actions.ts` | `openFileInPane`, `setWorkspaceActivePane`, `toggleWorkspaceLayoutMode` |
| `src/features/project-editor/use-project-editor-ui-actions.ts` | `updateEditorValue(pane?)`, `saveNow(pane?)` with explicit pane routing; composes primary + secondary (conflict) action sets |
| `src/features/project-editor/use-project-editor-open-project.ts` | `applyOpenedProject` with `preferredPane` handling |
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
