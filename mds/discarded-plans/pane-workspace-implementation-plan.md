# PaneWorkspace — Implementation Plan

> **DISCONTINUED** — Este plan ya no debe usarse. Fue reemplazado por el enfoque descrito en la tarea del agente: PaneWorkspace de solo lectura (read-only), sin reemplazar estado de Preact. Ver ADR-0001 para contexto.

Deepening the scattered pane state into a single module (PaneWorkspace class + usePaneWorkspace hook adapter).

## Final Design

### Injection contract

\\\	ypescript
type SaveDocumentFn = (path: string, content: string, meta: Record<string, unknown>) => Promise<void>
type ReadDocumentFn = (path: string) => Promise<{ content: string; meta: Record<string, unknown> }>

interface PaneWorkspaceDeps {
  saveDocument: SaveDocumentFn
  readDocument: ReadDocumentFn
  autosaveMs?: number  // defaults to 2000
}
\\\

### Snapshot (immutable read surface)

\\\	ypescript
interface PaneDocumentState {
  path: string | null
  content: string
  meta: Record<string, unknown>
  isDirty: boolean
}

interface PaneWorkspaceSnapshot {
  readonly primaryPane: PaneDocumentState
  readonly secondaryPane: PaneDocumentState
  readonly activePane: 'primary' | 'secondary'
  readonly loadingDocument: boolean
  readonly saving: boolean
  readonly statusMessage: string
}
\\\

### Class

\\\	ypescript
class PaneWorkspace {
  constructor(deps: PaneWorkspaceDeps)
  getSnapshot(): PaneWorkspaceSnapshot
  subscribe(onChange: () => void): () => void        // returns unsubscribe
  async openFile(path: string, pane: 'primary' | 'secondary'): Promise<void>
  updateContent(content: string): void                // marks active pane dirty, resets autosave
  switchActivePane(pane: 'primary' | 'secondary'): void
  async saveDocument(): Promise<void>                 // saves active pane
  async saveAll(): Promise<void>                      // saves both if dirty
  markSaved(): void                                   // clears dirty (external reload path)
  destroy(): void                                     // tears down autosave timer
}
\\\

### Hook adapter

\\\	ypescript
function usePaneWorkspace(workspace: PaneWorkspace): PaneWorkspaceSnapshot
\\\

Subscribes to workspace.subscribe(), calls getSnapshot() every render. Preact diffs the snapshot via shallow reference change on mutation.

## Behavior specification

### updateContent(content)
- Sets active pane content and isDirty: true
- Resets internal autosave debounce timer
- Emits onChange so hook re-renders

### switchActivePane(target)
- If current active pane is dirty: fires pending autosave immediately (calls injected saveDocument)
- Sets ctivePane to target
- Emits onChange

### saveDocument()
- If active pane !isDirty: no-op
- Sets saving: true in snapshot, emits onChange
- Calls injected saveDocument(path, content, meta)
- On success: sets active pane isDirty: false, clears autosave timer, sets statusMessage to "Saved"
- On failure: sets statusMessage to error text
- Sets saving: false, emits onChange

### saveAll()
- Iterates primary, then secondary
- For each dirty pane: saves via injected saveDocument
- Used by close flow and before-project-switch

### openFile(path, pane)
- Sets loadingDocument: true, emits onChange
- Calls eadDocument(path)
- Populates the target pane with { path, content, meta, isDirty: false }
- Sets loadingDocument: false, emits onChange

### markSaved()
- Clears isDirty on active pane without saving
- Used when external reload discards local changes

### destroy()
- Clears autosave timer
- Clears subscription list

## Autosave (internal, hidden from interface)

- A private utosaveTimer: ReturnType<typeof setTimeout> | null
- When updateContent() is called: clears any running timer, starts new setTimeout(autosaveMs)
- When the timer fires: calls saveDocument() internally
- When destroy() or saveDocument() is called explicitly: clears the timer

## Files affected

### New files
- src/features/project-editor/pane-workspace.ts — class PaneWorkspace + types + snapshot
- src/features/project-editor/use-pane-workspace.ts — hook adapter

### Files to modify
- use-project-editor-core-state.ts — remove primaryPane, secondaryPane, loadingDocument, saving, statusMessage atoms; add PaneWorkspace instantiation
- use-project-editor-state.ts — remove projected field derivation (selectedPath, editorValue, isDirty); read from snapshot
- use-project-editor-actions.ts — replace raw setter calls with workspace.openFile(), workspace.updateContent(), workspace.saveDocument(), workspace.switchActivePane()
- use-project-editor-pane-persistence.ts — remove flush-before-switch/close logic; replace with workspace.saveAll()
- use-project-editor-close-effect.ts — simplify: workspace.saveAll() replaces __tramaSaveAll
- use-project-editor-autosave-effect.ts — **DELETE** (absorbed into PaneWorkspace)

### What does NOT change
- use-project-editor-external-events-effect.ts — conflict detection stays outside the module
- use-project-editor-fullscreen-effect.ts, use-project-editor-shortcuts-effect.ts, use-project-editor-context-menu-effect.ts
- use-project-editor-conflict-actions.ts — calls workspace.markSaved() instead of raw setPrimaryPane / setSecondaryPane
- use-project-editor-create-actions.ts, use-project-editor-file-actions.ts, use-project-editor-folder-actions.ts

## Migration sequence

1. **Create pane-workspace.ts** — write the class, types, and snapshot. Write unit tests that test through the class interface (no Preact, just 
ew PaneWorkspace({ saveDocument: mockSave, readDocument: mockRead })). Verify: autosave debounce fires, flush-before-switch works, saveAll saves both.

2. **Create use-pane-workspace.ts** — hook adapter. Test: mount with Preact, mutate via class methods, assert snapshot updates trigger re-renders.

3. **Plumb into use-project-editor-core-state.ts** — create PaneWorkspace instance inside the hook (using injected window.tramaApi methods). Return the workspace + snapshot instead of the old atoms. The old atoms become derived from snapshot. *At this point the app still works — old callers read the old atoms.*

4. **Port callers one by one** — starting with:
   - use-project-editor-state.ts (reads projected fields from snapshot instead of deriving from atoms)
   - use-project-editor-actions.ts (calls workspace.openFile() etc.)
   - use-project-editor-pane-persistence.ts (uses workspace.saveAll())
   - use-project-editor-close-effect.ts (uses workspace.saveAll())
   - use-project-editor-conflict-actions.ts (uses workspace.markSaved())

5. **Remove dead code** — delete use-project-editor-autosave-effect.ts. Remove the old useState atoms from core state. Remove derived field computation from use-project-editor-state.ts.

6. **Run test suite** — verify existing integration tests pass through the new module. Add regression tests for the 7 split-pane lessons-learned scenarios.

## Test strategy

### Class-level tests (new, no Preact)
- Autosave fires after debounce, saves callback invoked
- updateContent marks dirty, snapshot reflects it
- switchActivePane flushes pending autosave before switching
- saveAll calls save for each dirty pane, in order
- openFile calls eadDocument, populates pane, clears dirty
- Error in saveDocument sets statusMessage, no dirty cleared
- destroy clears timer, no more autosave fires

### Hook-level tests
- Snapshot changes trigger Preact re-render
- Unsubscribe on unmount works

### Integration tests (existing, updated)
- use-project-editor.test.ts — verify pane state flows through snapshot
- project-editor-conflict-flow.test.ts — external conflict handled, markSaved clears dirty
- Split-pane regression scenarios from lessons-learned