# Pane Exit Deepening - Technical Design

Date: 2026-06-01
Status: Implemented
Scope: Project editor pane persistence refactor around the `Pane exit` concept
Related: `CONTEXT.md`, `mds/adr/0002-pane-exit-lives-in-paneworkspace.md`, `mds/architecture/split-pane-coordination.md`, `mds/architecture/editor-serialization-debounce-architecture.md`, `mds/flows/rich-editor-revert-changes-flow.md`

## 1. Problem Statement

The project editor already names `PaneWorkspace` as the pane coordination Module, but the `Pane exit` behavior is still spread across multiple callers and shallow helper Modules.

Current friction:

1. `PaneWorkspace` owns `flushPaneContent`, `savePaneIfDirty`, `saveAllDirtyPanes`, autosave timer ownership, and saved-snapshot tracking.
2. `workspace-actions.ts` still owns part of the `Pane exit` policy for pane switch, manual save, and revert.
3. `sidebar-file-actions/private/file-select.ts` owns another save-before-leave flow.
4. `git-history-actions.ts` owns project-wide pre-save behavior before `Snapshot`.
5. `pane-save-logic.ts` is a shallow Module whose Interface is nearly identical to its Implementation.

The result is low depth at the seam. Understanding one `Pane exit` path requires bouncing between `PaneWorkspace`, action callers, and helper Modules before reaching the real behavior.

## 2. Goals

1. Deepen `PaneWorkspace` so `Pane exit` rules live behind one public seam.
2. Preserve current caller-visible behavior during the refactor.
3. Make `PaneWorkspace` the primary test surface for pane save / leave / revert preconditions.
4. Remove shallow pass-through persistence helpers where the deletion test fails.
5. Keep the existing split-pane contracts intact: explicit pane identity, layout/document separation, and flush-before-save semantics.

## 3. Non-goals

1. Do not normalize all leave-dirty flows into one new product behavior.
2. Do not change revision-rail behavior.
3. Do not redesign toolbar or conflict UI behavior.
4. Do not replace the window-close bridge or rework IPC contracts in this refactor.
5. Do not rewrite the whole pane Module into a new public shape; `PaneWorkspace` remains the public Module.

## 4. Current Behavior To Preserve

This refactor is about locality and leverage, not feature redesign. The deepened Module should preserve the current behavior unless a bug fix is required.

| Flow | Current owner | Current behavior | Preserve in refactor |
|------|---------------|------------------|----------------------|
| Manual save | `workspace-actions.ts` + `PaneWorkspace.savePaneIfDirty()` | Save target pane if dirty | Yes |
| Pane activation | `workspace-actions.ts` | Save outgoing dirty pane before switching active pane | Yes |
| Sidebar file select | `sidebar-file-actions/private/file-select.ts` | Save active dirty pane before assigning new file | Yes |
| `openFileInPane('primary', ...)` | `workspace-actions.ts` | Uses `canSelectFile(...)` block-first guard | Yes |
| Revert changes | `workspace-actions.ts` | Flush live editor, do not save, then caller reloads from disk | Yes |
| Window close save-all | `pane/use-project-editor-close-effect.ts` + `PaneWorkspace.saveAllDirtyPanes()` | Save all dirty panes before close | Yes |
| `Snapshot` pre-save | `git-history-actions.ts` + `PaneWorkspace.saveAllDirtyPanes()` | Save all dirty panes before `Snapshot` | Yes |
| Saved snapshot comparison | `PaneWorkspace` | Compare external content against last successful save for a path | Yes |

## 5. Target Seam

`PaneWorkspace` remains the public seam. The refactor deepens it by moving `Pane exit` preconditions and pane-save intent behind its Interface.

### 5.1 Responsibilities inside `PaneWorkspace`

1. Save eligibility for one pane
2. Save-all orchestration used by close and `Snapshot`
3. Flush-before-save and flush-before-revert preparation
4. `Pane exit` preparation for callers that already save-before-leave today
5. Saved-snapshot tracking for external-conflict comparison
6. Existing pane state mutation ownership (`setPrimaryPane` / `setSecondaryPane` remain private to the Module)

### 5.2 Responsibilities outside `PaneWorkspace`

1. Layout mutations
2. `loadDocument(path, pane)` calls
3. Revision-rail open/close/preview state
4. Conflict UI clearing
5. User-facing status messages
6. Block-first callers that intentionally preserve their current external guard behavior

## 6. Proposed Public Interface

The caller-facing surface should use intent methods and structured technical results.

```ts
type PaneExitReason = 'empty' | 'clean' | 'saved'

type PreparePaneExitResult =
  | { kind: 'continued'; reason: PaneExitReason; path: string | null }
  | { kind: 'failed'; path: string | null; error: string }

type PreparePaneRevertResult =
  | { kind: 'reverted'; path: string }
  | { kind: 'no-op'; path: string | null }

type SavePaneNowResult =
  | { kind: 'saved'; path: string }
  | { kind: 'no-op'; path: string | null }
  | { kind: 'failed'; path: string | null; error: string }

class PaneWorkspace {
  preparePaneExit(pane: WorkspacePane): Promise<PreparePaneExitResult>
  preparePaneRevert(pane: WorkspacePane): PreparePaneRevertResult
  savePaneNow(pane: WorkspacePane): Promise<SavePaneNowResult>
  saveAllDirtyPanes(): Promise<void> // preserved in first refactor slice
  flushPaneContent(pane: WorkspacePane): string | null
  isPaneDirty(pane?: WorkspacePane): boolean
}
```

Notes:

1. `saveAllDirtyPanes()` keeps its existing broad behavior in the first slice to preserve current callers; a richer structured result can be a follow-up if needed.
2. `preparePaneExit(pane)` is used only for the existing save-before-leave flows in this refactor.
3. `preparePaneRevert(pane)` only prepares discard semantics and returns the target path; the caller still owns `loadDocument(path, pane)`.

## 7. Caller Mapping After Refactor

| Caller | Current behavior | Target interaction |
|--------|------------------|--------------------|
| `workspace-actions.saveNow` | Calls `savePaneIfDirty` and clears conflict UI on success | Call `savePaneNow`; caller keeps UI clearing |
| `workspace-actions.setWorkspaceActivePane` | Calls `savePaneIfDirty` before switching | Call `preparePaneExit` for outgoing pane |
| `sidebar-file-actions/private/file-select.ts` | Calls `savePaneIfDirty` before assigning file | Call `preparePaneExit` for active pane |
| `workspace-actions.revertChanges` | Guard + flush + `loadDocument` | Call `preparePaneRevert`; caller keeps `loadDocument` |
| `git-history-actions.saveSnapshot` | Calls `saveAllDirtyPanes` before `Snapshot` | Keep same top-level behavior; save mechanics remain inside `PaneWorkspace` |
| `pane/use-project-editor-close-effect.ts` | Calls `saveAllDirtyPanes` before close | Keep same top-level behavior; save mechanics remain inside `PaneWorkspace` |

## 8. Internal Simplifications

### 8.1 Inline shallow save helper

`pane-save-logic.ts` should be absorbed into `PaneWorkspace`.

Why:

1. The guard already exists in `savePaneIfDirty`.
2. The helper adds almost no leverage at the Interface.
3. The tests already exercise the real behavior through `PaneWorkspace`.

### 8.2 Snapshot logger

`snapshot-compare-logger.ts` can remain as a private helper or be absorbed into `PaneWorkspace` during implementation if that keeps the Module clearer. The decision should stay minimal and preserve behavior.

## 9. Test Surface

The Interface is the test surface.

Shift targeted tests toward:

1. `PaneWorkspace.preparePaneExit(...)`
2. `PaneWorkspace.preparePaneRevert(...)`
3. `PaneWorkspace.savePaneNow(...)`
4. Existing `saveAllDirtyPanes()` behavior
5. Existing snapshot comparison behavior

Reduce tests that only prove shallow caller choreography where the caller can now rely on `PaneWorkspace` intent methods.

## 10. Risks And Mitigations

1. Risk: behavior drift while deepening the seam.
   - Mitigation: capture current flow behavior in tests before moving logic.
2. Risk: `openFileInPane('primary', ...)` accidentally changes from block-first to save-first.
   - Mitigation: explicitly keep that caller on its current behavior in this refactor slice.
3. Risk: revert path stops flushing live Quill DOM before reload.
   - Mitigation: keep `preparePaneRevert` responsible for pre-reload flush only; caller still performs reload.
4. Risk: close / `Snapshot` regress because save-all behavior changes shape too early.
   - Mitigation: preserve `saveAllDirtyPanes()` public behavior in the first slice.

## 11. Files Expected To Change During Implementation

Primary:

1. `src/features/project-editor/pane/pane-workspace.ts`
2. `src/features/project-editor/workspace-actions.ts`
3. `src/features/project-editor/sidebar-file-actions/private/file-select.ts`
4. `src/features/project-editor/git-history-actions.ts`
5. `src/features/project-editor/pane/use-project-editor-close-effect.ts`
6. `tests/pane-workspace.test.ts`
7. `tests/revert-changes-action.test.ts`

Likely cleanup:

1. `src/features/project-editor/pane/pane-save-logic.ts`
2. `src/features/project-editor/pane/snapshot-compare-logger.ts`

## 12. Follow-up Work Explicitly Deferred

These are worthwhile but out of scope for this refactor because they change behavior or widen the design surface:

1. Normalizing all leave-dirty flows behind one universal policy
2. Per-pane autosave timer behavior
3. Per-pane save-in-flight UI state
4. Structured `saveAllDirtyPanes()` result contracts
5. Replacing the window-close save bridge with a first-class IPC seam
