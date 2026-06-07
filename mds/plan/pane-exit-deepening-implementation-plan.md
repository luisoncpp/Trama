# Pane Exit Deepening - Implementation Plan

Date: 2026-06-01
Status: Implemented
Depends on: `mds/adr/0002-pane-exit-lives-in-paneworkspace.md`, `mds/plan/pane-exit-deepening-tech-design.md`

## 0. Objective

Deepen `PaneWorkspace` around the `Pane exit` concept so pane save / leave / revert preconditions live behind one Module seam, while preserving current behavior.

## 1. Ground Rules

1. Preserve current caller-visible behavior.
2. Keep `PaneWorkspace` as the public seam.
3. Prefer the smallest correct refactor.
4. Move behavior behind the seam before deleting helper Modules.
5. Do not normalize block-first and save-first flows in this task.

## 2. Implementation Slices

Follow these slices in order. Do not skip targeted tests between slices.

## Slice 1 - Capture current behavior in targeted tests

### Goal

Lock in the current `Pane exit` behavior before moving logic.

### Files

Modify:

1. `tests/pane-workspace.test.ts`
2. `tests/revert-changes-action.test.ts`
3. Any focused caller test that currently covers save-before-switch / save-before-select behavior

### Tasks

1. Add or tighten tests for:
   - `savePaneIfDirty` save/no-op behavior
   - `saveAllDirtyPanes` current behavior
   - revert flush-before-reload precondition
   - saved snapshot comparison behavior
2. Add a focused test that protects the current `openFileInPane('primary', ...)` block-first behavior so the refactor does not normalize it accidentally.

### Verification

```powershell
npm run test -- tests/pane-workspace.test.ts tests/revert-changes-action.test.ts tests/project-editor-conflict-flow.test.ts
```

Expected: all pass and document the current behavior clearly.

## Slice 2 - Add intent methods to `PaneWorkspace`

### Goal

Introduce deeper intent methods without changing current callers yet.

### Files

Modify:

1. `src/features/project-editor/pane/pane-workspace.ts`
2. `tests/pane-workspace.test.ts`

### Tasks

1. Add result types for:
   - `PreparePaneExitResult`
   - `PreparePaneRevertResult`
   - `SavePaneNowResult`
2. Implement:
   - `savePaneNow(pane)`
   - `preparePaneExit(pane)`
   - `preparePaneRevert(pane)`
3. Keep existing methods in place during migration:
   - `savePaneIfDirty`
   - `saveAllDirtyPanes`
   - `flushPaneContent`
4. Implement new methods in terms of current behavior, not redesigned behavior.

### Verification

```powershell
npm run test -- tests/pane-workspace.test.ts
```

Expected: new intent methods are covered and old behavior remains unchanged.

## Slice 3 - Inline shallow save helper

### Goal

Remove the shallow persistence helper once `PaneWorkspace` owns the real save behavior.

### Files

Modify:

1. `src/features/project-editor/pane/pane-workspace.ts`

Delete if fully absorbed:

1. `src/features/project-editor/pane/pane-save-logic.ts`

### Tasks

1. Inline `executePaneSave(...)` into `PaneWorkspace`.
2. Keep guards and save sequencing behavior identical.
3. Re-run tests before deleting the helper file.

### Verification

```powershell
npm run test -- tests/pane-workspace.test.ts
```

Expected: same test surface, one fewer shallow Module.

## Slice 4 - Migrate save-first callers to the deeper seam

### Goal

Move current save-before-leave callers behind the new `PaneWorkspace` Interface.

### Files

Modify:

1. `src/features/project-editor/workspace-actions.ts`
2. `src/features/project-editor/sidebar-file-actions/private/file-select.ts`
3. `src/features/project-editor/git-history-actions.ts`
4. `src/features/project-editor/pane/use-project-editor-close-effect.ts`

### Tasks

1. Update manual save flow to use `savePaneNow(...)`.
2. Update pane activation flow to use `preparePaneExit(outgoingPane)`.
3. Update sidebar file select flow to use `preparePaneExit(activePane)`.
4. Keep `saveAllDirtyPanes()` for close and `Snapshot` in this slice unless a minimal internal redirect is trivial.
5. Do not change `openFileInPane('primary', ...)` behavior in this slice.

### Verification

```powershell
npm run test -- tests/pane-workspace.test.ts tests/project-editor-conflict-flow.test.ts tests/window-close.test.ts
```

Expected: save-before-leave callers now cross the deeper seam; behavior remains unchanged.

## Slice 5 - Migrate revert to the deeper seam

### Goal

Move revert preconditions behind `PaneWorkspace` while keeping reload outside it.

### Files

Modify:

1. `src/features/project-editor/workspace-actions.ts`
2. `tests/revert-changes-action.test.ts`
3. `tests/pane-workspace.test.ts`

### Tasks

1. Update `revertChanges(...)` to call `preparePaneRevert(pane)`.
2. If result is `reverted`, caller performs `loadDocument(path, pane)`.
3. Keep conflict UI clearing and status-message behavior outside `PaneWorkspace`.

### Verification

```powershell
npm run test -- tests/revert-changes-action.test.ts tests/pane-workspace.test.ts tests/project-editor-conflict-flow.test.ts
```

Expected: revert still flushes before reload and still reloads the same pane/path.

## Slice 6 - Optional logger cleanup

### Goal

Collapse any remaining shallow persistence helper if it improves locality without changing behavior.

### Files

Possibly modify:

1. `src/features/project-editor/pane/pane-workspace.ts`
2. `src/features/project-editor/pane/snapshot-compare-logger.ts`

### Tasks

1. If `snapshot-compare-logger.ts` is still a trivial pass-through after the refactor, inline it.
2. If it still improves readability, keep it private and unchanged.

### Verification

```powershell
npm run test -- tests/pane-workspace.test.ts tests/project-editor-conflict-flow.test.ts
```

Expected: no behavior change; improved locality only.

## Slice 7 - Focused quality gates

### Goal

Validate the refactor at the seam and on the high-risk flows.

### Verification commands

```powershell
npm run test -- tests/pane-workspace.test.ts tests/revert-changes-action.test.ts tests/project-editor-conflict-flow.test.ts tests/window-close.test.ts
npm run build
```

If lint is practical for the branch state, also run:

```powershell
npm run lint
```

Expected:

1. PaneWorkspace tests cover the new intent surface.
2. Revert regression tests still pass.
3. Conflict and window-close flows still pass.
4. Build succeeds.

## 3. Checklist For Cheaper Models (Strict Order)

1. Freeze current behavior with tests first.
2. Add `PaneWorkspace` intent methods before changing callers.
3. Migrate one caller group at a time.
4. Keep `openFileInPane('primary', ...)` unchanged.
5. Delete `pane-save-logic.ts` only after new tests are green.
6. Run targeted tests after each slice.
7. Run build at the end.

If any targeted test fails, fix immediately before moving to the next slice.

## 4. Suggested Commit Breakdown

1. Commit A: test capture for current `Pane exit` behavior.
2. Commit B: `PaneWorkspace` intent methods.
3. Commit C: caller migration for save-first flows.
4. Commit D: revert migration + shallow helper deletion.
5. Commit E: focused quality gates and doc updates.

## 5. Required Doc Updates During Implementation

When the code refactor is executed, update these docs if behavior or file responsibilities change:

1. `mds/architecture/split-pane-coordination.md`
2. `mds/architecture/editor-serialization-debounce-architecture.md`
3. `mds/flows/rich-editor-revert-changes-flow.md`
4. `mds/live/file-map.md` if any new TS/TSX file is created
5. `mds/lessons-learned/README.md` plus a new lesson file if implementation reveals a counter-intuitive persistence fact

## 6. Done Criteria

The refactor is done only if all are true:

1. `PaneWorkspace` owns the pane save / leave / revert preconditions behind intent methods.
2. Shallow persistence helpers no longer hold meaningful behavior.
3. Save-before-leave callers use the deeper seam.
4. Revert preconditions use the deeper seam while reload stays outside it.
5. Current caller-visible behavior is preserved.
6. Targeted tests and build pass.
