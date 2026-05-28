# Plan: `useProjectEditor()` Keystroke Churn

## Status

- State: in progress
- Scope: renderer project-editor state/update path only
- Goal: stop avoidable `useProjectEditor()` churn during typing, while preserving the existing pane, save, and debounce invariants
- Completed: issue 1 via the deeper split (`markPaneDirty` / `updatePaneContent`)
- Completed: issue 2 via stable `PaneWorkspace` instance with live dependency sync

## Problem Summary

Typing in the rich editor currently causes project-editor state updates earlier and more often than necessary.

Some reruns of `useProjectEditor()` are expected because the hook owns renderer state. The bug worth fixing is the avoidable churn on the hot typing path:

1. The dirty-marking path writes pane state on every keystroke, even when the pane is already dirty and the content has not changed.
2. `PaneWorkspace` is recreated whenever pane state or layout state changes, so every pane-content write rebuilds the workspace facade.
3. `useProjectEditorActions()` depends on that recreated workspace and rebuilds action closures more often than necessary.
4. `App` owns the full `model = useProjectEditor()`, so any state write under the hook re-renders the entire project-editor view tree, including UI that does not care about live editor text.

The result is that "typing in the editor" is coupled to "rebuild the project-editor composition root" more tightly than the architecture intends.

## End-to-End Current Data Flow

### Trigger

User presses a key in Quill.

### Hot path

1. Quill fires `text-change` in `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-serialization.ts`.
2. `onDirtyRef.current()` runs immediately before the debounced serialization flush.
3. In split mode, `onDirtyRef` maps to `actions.updateEditorValue(paneState.content, pane)` in `src/features/project-editor/pane/pane-editor.tsx`.
4. In single-pane mode, `onDirtyRef` maps to `actions.updateEditorValue(state.editorValue)` in `src/features/project-editor/pane/workspace-editor-panels.tsx`.
5. `actions.updateEditorValue(...)` delegates to `workspaceActions.updateEditorValue(...)` in `src/features/project-editor/workspace-actions.ts`.
6. `workspaceActions.updateEditorValue(...)` calls `paneWorkspace.updatePaneContent(...)`.
7. `PaneWorkspace.updatePaneContent(...)` always calls `setPrimaryPane(...)` or `setSecondaryPane(...)` with a newly-created pane object, marking it dirty.
8. That pane state update re-runs `useProjectEditorCoreState()`, `useProjectEditorState()`, `usePaneWorkspace()`, `useProjectEditorActions()`, and the top-level `useProjectEditor()` composition path.
9. Later, the debounce flush serializes actual content and calls `onChangeRef.current(markdownForParent)`, causing another pane-content update with the real new markdown.

### Files involved

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-serialization.ts`
- `src/features/project-editor/pane/pane-editor.tsx`
- `src/features/project-editor/pane/workspace-editor-panels.tsx`
- `src/features/project-editor/workspace-actions.ts`
- `src/features/project-editor/pane/pane-workspace.ts`
- `src/features/project-editor/use-project-editor-core-state.ts`
- `src/features/project-editor/project-editor-private/state.ts`
- `src/features/project-editor/pane/use-pane-workspace.ts`
- `src/features/project-editor/project-editor-private/actions.ts`
- `src/features/project-editor/use-project-editor.ts`
- `src/app.tsx`

## Issue Breakdown

### Issue 1: Dirty-mark path writes redundant pane state on every keystroke

#### What happens

The immediate dirty callback does not send new content. It sends the pane's current content only to mark the pane dirty.

That means after the first keystroke, subsequent keystrokes can still run this path with:

- `prev.content === content`
- `prev.isDirty === true`

Even in that no-op state, `PaneWorkspace.updatePaneContent()` still creates a new pane object and schedules a state update.

#### Why it matters

- It creates one avoidable render/update cycle per keystroke.
- It makes the typing hot path pay for state writes whose only semantic effect already happened on the first keystroke.
- It obscures profiling because "mark dirty" and "update content" are mixed into one API.

#### Current code points

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-serialization.ts`
- `src/features/project-editor/pane/pane-editor.tsx`
- `src/features/project-editor/pane/workspace-editor-panels.tsx`
- `src/features/project-editor/workspace-actions.ts`
- `src/features/project-editor/pane/pane-workspace.ts`

#### Planned fix

Minimal option:

- Add an early return inside `PaneWorkspace.updatePaneContent()` so it returns `prev` when the content is unchanged and `isDirty` is already `true`.

Deeper option:

- Split the semantics into two APIs:
  - `markPaneDirty(pane)` for the immediate path
  - `updatePaneContent(pane, content)` for the debounced serialized content path

#### Recommended first slice

Start with the minimal guard. It is the smallest correct fix and preserves the current public action surface.

### Issue 2: `PaneWorkspace` identity is tied to render-time state objects

#### What happens

`usePaneWorkspace()` created a new `PaneWorkspace` instance through `useMemo(...)` with dependencies on:

- `layoutState`
- `paneBindings`
- `serializationRefs`
- `saveDocumentFn`
- `navigationHistory`
- `savedContentMap`

`paneBindings` itself depended on `coreState.primaryPane` and `coreState.secondaryPane`, so every pane-content change recreated the `PaneWorkspace` instance.

#### Why it matters

- The workspace facade is supposed to be the stable seam for pane coordination.
- Recreating it on every content update weakens that seam and causes dependent hooks/effects to re-run more often.
- Effects like autosave currently depend on `paneWorkspace`, so workspace identity churn can retrigger effect work unrelated to the user's intent.

#### Current code points

- `src/features/project-editor/pane/use-pane-workspace.ts`
- `src/features/project-editor/project-editor-private/state-builders.ts`
- `src/features/project-editor/use-project-editor.ts`
- `src/features/project-editor/pane/use-project-editor-autosave-effect.ts`

#### Fix applied

`PaneWorkspace` now stays stable for the session:

1. `usePaneWorkspace()` creates the instance once with `useRef(...)`.
2. `PaneWorkspace.updateDependencies(...)` syncs the latest layout, pane bindings, serialization refs, and save function into that instance each render.
3. Long-lived collaborators (`navigationHistoryRef`, `lastSavedContentMapRef`) remain attached to the stable instance.

#### Risks and invariants

- The stable workspace must still read the latest pane/layout state synchronously for save, revert, switch, and external-conflict flows.
- Autosave timer ownership must remain inside `PaneWorkspace`.
- Pane history must remain stable across renders and reset only in explicit clear/open flows.

### Issue 3: Action object churn follows workspace churn

#### What happens

`useProjectEditorActions()` builds the full `ProjectEditorActions` object with `useMemo(...)` and depends on `paneWorkspace` plus the sub-state objects.

Because `paneWorkspace` is recreated on pane updates, the action object is also rebuilt more frequently than necessary.

#### Why it matters

- Components and effects consuming `actions` receive a new object identity even when their actual behavior contract did not change.
- This multiplies the cost of issue 2 across the UI tree.
- It makes it harder to reason about what is changing because "content changed" also becomes "all actions changed".

#### Current code points

- `src/features/project-editor/project-editor-private/actions.ts`
- `src/features/project-editor/project-editor-private/workspace-action-group.ts`
- `src/features/project-editor/use-project-editor.ts`

#### Fix applied

After stabilizing `PaneWorkspace`, `useProjectEditorActions()` now memoizes sidebar, workspace, and conflict action groups separately, then composes the flat surface from those stable group objects.

The remaining hidden churn source was an inline helper callback passed to `useOpenProject()` (`() => paneWorkspace.clearNavigationHistory()`). That callback is now its own named `useCallback(...)`, so sidebar/conflict groups no longer rebuild on unrelated editor typing updates.

Possible follow-up deepening:

- Group actions by domain and pass narrower action subsets to components/effects that only need a small part of the surface.

### Issue 4: Top-level `model` ownership makes typing re-render the whole project-editor shell

#### What happens

`App` calls `const model = useProjectEditor()` and passes the full model into `ProjectEditorView`.

Because `model.state` includes both live editor content and broad workspace UI state, any typing-driven state change re-renders the full view tree rooted at `ProjectEditorView`.

#### Why it matters

- Sidebar, dialogs, and other shell-level UI participate in render work even when only pane text changed.
- This is broader invalidation than needed for editor typing.
- It reduces the value of the state-slice decomposition already introduced in `project-editor-private/state-builders.ts`.

#### Current code points

- `src/app.tsx`
- `src/features/project-editor/project-editor-view.tsx`
- `src/features/project-editor/project-editor-types.ts`
- `src/features/project-editor/project-editor-private/state-values.ts`

#### Planned fix

Narrow what shell-level components subscribe to:

1. Keep the full model available where needed for editor/pane interactions.
2. Avoid flowing the entire `model` through components that only need sidebar, dialogs, theme-adjacent shell state, or static actions.
3. Consider splitting the top-level model into smaller view-model props or selector-style hooks.

#### Non-goal for the first slice

The first slice should not redesign the whole app composition. The goal is to remove the worst hot-path churn first, then evaluate whether shell rerenders are still a measurable problem.

## Proposed Execution Plan

### Slice 1: Eliminate redundant dirty writes

#### Changes

- Add a no-op guard in `PaneWorkspace.updatePaneContent()`.
- Keep existing `updateEditorValue(...)` API unchanged.

#### Expected outcome

- `useProjectEditor()` no longer re-runs once per keypress solely from the immediate dirty path.
- The hook still re-runs when the debounced content flush lands, which is expected.

#### Risk

- Low. Behavior does not change; only redundant state writes are skipped.

### Slice 2: Stabilize `PaneWorkspace`

Status: completed

#### Changes

- Replace render-tied `useMemo(new PaneWorkspace(...))` construction with a stable instance.
- Sync latest layout and pane snapshots into the instance without replacing the instance.
- Re-check effects that currently depend on `paneWorkspace` identity.

#### Expected outcome

- Pane coordination facade stops changing identity during typing.
- Effects and action builders stop re-running only because the workspace object was recreated.

#### Notes from implementation

- `useProjectEditorCloseEffect()` now depends on pane dirty flags, not `paneWorkspace` identity.
- The autosave effect already depended on semantic inputs (`selectedPath`, `isDirty`, `activePane`) and remained compatible with the stable workspace.

#### Risk

- Medium. Save/switch/autosave/external-event flows rely on current pane/layout state being fresh.

### Slice 3: Reduce action churn

Status: completed

#### Changes

- After stabilizing the workspace, tighten dependencies in `useProjectEditorActions()`.
- Keep action identities stable unless their true inputs changed.

#### Expected outcome

- Fewer downstream rerenders driven by `actions` identity changes.

#### Notes from implementation

- `useProjectEditorActions()` now memoizes sidebar, workspace, and conflict action groups independently before composing the flat `actions` surface.
- A focused regression test now verifies that unrelated callbacks like `toggleFocusMode`, `resolveConflictKeep`, and `setSidebarSection` stay referentially stable through editor dirty/content updates.

#### Risk

- Medium-low. Mostly dependency hygiene after slice 2.

### Slice 4: Narrow shell subscriptions if still needed

#### Changes

- Profile the post-slice-3 behavior.
- If typing still invalidates too much UI, split `ProjectEditorView` inputs or move to selector-oriented consumption.

#### Expected outcome

- Typing only re-renders pane/editor surfaces and any UI that truly reflects live editor state.

#### Risk

- Medium-high. This is a composition-layer refactor, not a hotfix.

## Invariants To Preserve

- Dirty state must become `true` immediately on the first keystroke.
- Debounced serialization remains the source of real pane-content updates.
- `saveNow`, autosave, revert, switch-pane save, and close-save must still observe the latest flushed content.
- Split-pane routing stays pane-explicit; typing in one pane must not affect the other pane's dirty/content state.
- `PaneWorkspace` remains the exclusive mutation surface for pane state.

## Debug Playbook

1. Inspect `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-serialization.ts` to confirm whether the hot path is `onDirtyRef` or the debounce flush.
2. Inspect `src/features/project-editor/pane/pane-workspace.ts` and verify whether the current write is semantically a no-op.
3. Inspect `src/features/project-editor/pane/use-pane-workspace.ts` and verify whether workspace identity changes with pane content.
4. Inspect `src/features/project-editor/project-editor-private/actions.ts` to see whether action identity churn follows workspace churn.
5. Inspect `src/app.tsx` and `src/features/project-editor/project-editor-view.tsx` to see how broadly the full model is subscribed.

## Focused Tests

Run these first for any slice in this plan:

```bash
npm run test -- tests/pane-workspace.test.ts
npm run test -- tests/use-pane-workspace.test.ts
npm run test -- tests/use-project-editor.test.ts
npm run test -- tests/project-editor-debounce-regression.test.ts
```

If slice 2 or later changes workspace/action identity behavior, also run:

```bash
npm run test -- tests/project-editor-conflict-flow.test.ts
npm run test -- tests/workspace-layout-persistence.test.ts
npm run test -- tests/window-close.test.ts
```

## Definition of Done

This plan is complete when:

1. The immediate dirty path no longer causes redundant pane writes per keystroke.
2. `PaneWorkspace` is stable across ordinary typing updates, unless a deliberate design reason remains and is documented.
3. Action identity churn caused solely by workspace recreation is removed.
4. The remaining reruns during typing correspond to real state changes that the UI must observe.
