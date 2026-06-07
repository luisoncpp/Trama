# Split Pane: Route editor change callbacks to the correct pane

## Context

In split layout, both editor instances reused the same `updateEditorValue` action. That action decided the target pane from `workspaceLayout.activePane`.

## Symptom

When typing in the secondary editor, the primary pane could be marked dirty in some interaction orders.

## Root Cause

The callback target was derived from global active-pane state instead of the pane that emitted the change event. In split view this can drift if event ordering/rerender timing does not align with pane activation.

## Resolution

1. Extended `updateEditorValue` to accept an optional pane argument.
2. Kept existing behavior as default (`pane ?? activePane`) for single-pane and existing call sites.
3. Updated split-pane UI wiring to pass explicit pane identity from each `PaneEditor`.
4. Added regression coverage in `tests/project-editor-conflict-flow.test.ts`.

## Guardrail

For split-editor callbacks, always prefer pane-targeted actions over globally inferred pane state.
