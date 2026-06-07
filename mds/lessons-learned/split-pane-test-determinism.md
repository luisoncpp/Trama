# Split Pane Tests: Deterministic Setup Against Persisted Layout

Date: 2026-04-04

## Context

A split-pane conflict-flow test failed intermittently with contradictory state transitions. The same test expected to toggle from `single` to `split`, but in some runs layout was already restored as `split` from persisted state.

## Symptom

Assertion failures like:
- expected `workspaceLayout.mode` to be `split`
- received `single`

Root pattern: test action called `toggleWorkspaceLayoutMode()` unconditionally. If mode was already `split`, toggle switched it back to `single`.

## Root Cause

Layout persistence is intentional (`trama.workspace.layout.v1`). Tests that assume fixed initial layout without normalizing setup can accidentally depend on execution order or leftover persisted values.

## What Worked

Use deterministic setup logic in tests:

```ts
if (model?.state.workspaceLayout.mode !== 'split') {
  await act(async () => {
    model?.actions.toggleWorkspaceLayoutMode()
    await Promise.resolve()
  })
}
expect(model?.state.workspaceLayout.mode).toBe('split')
```

Also avoid relying on implicit initial pane state. Explicitly switch to target pane and verify state before continuing test flow.

## Guardrail

For any split-mode test:
1. Normalize layout mode first (`single` or `split` explicitly).
2. Normalize active pane explicitly.
3. Only then execute the scenario being tested.
