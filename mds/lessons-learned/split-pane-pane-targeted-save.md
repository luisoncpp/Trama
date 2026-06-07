# Split Pane: Route manual save callbacks to the correct pane

## Context

Split layout renders one save affordance per editor pane, but the original `saveNow()` action resolved its target document from the globally projected active pane.

## Symptom

When both panes had unsaved edits, clicking the save button in the secondary pane could save the primary document instead.

## Root Cause

The pane-local save button reused an action that defaulted to `workspaceLayout.activePane`. Pointer/focus timing can leave `activePane` pointing at primary when the secondary toolbar button dispatches save.

## Resolution

1. Extended `saveNow` to accept an optional pane argument.
2. In split layout, wired each pane's save button to call `saveNow(pane)`.
3. Preserved default active-pane behavior for single-pane UI and existing call sites.
4. Added regression coverage for dirty primary + dirty secondary + explicit secondary save.

## Guardrail

In split-editor UI, manual actions triggered from a specific pane should receive explicit pane identity instead of inferring from global active-pane state.