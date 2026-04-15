# Split-pane Sidebar Shows Wrong File When Switching Panes

## Problem

When modifying one pane and switching focus to another pane, the sidebar stops showing the file of the newly active pane. The sidebar becomes blank or shows the previous file.

## Root Cause

In `use-project-editor-state.ts`, the `selectedPath` (used by the sidebar to highlight the active file) was computed from `activePaneState.path` — the document currently loaded **in memory** for that pane.

```typescript
// WRONG - causes lag when switching panes
selectedPath: activePaneState.path
```

However, when a pane is activated:
1. `workspaceLayout.activePane` updates immediately
2. But `secondaryPane.path` (or `primaryPane.path`) is still loading asynchronously
3. While loading, `selectedPath` is null or stale
4. Sidebar renders nothing until async document load completes

## Solution

Use the **layout path** instead — the file **assigned to the pane** in the layout state:

```typescript
// CORRECT - sidebar updates immediately
const activePaneLayoutPath = params.workspaceLayout.activePane === 'secondary'
  ? params.workspaceLayout.secondaryPath
  : params.workspaceLayout.primaryPath

selectedPath: activePaneLayoutPath
```

This ensures the sidebar reflects the correct file **before** the async document load begins, eliminating the blur between pane switch and sidebar update.

## Key Insight

Split-pane coordination has two layers of state:
- **Layout layer** (`workspaceLayout.active​Pane`, `primaryPath`, `secondaryPath`) — synchronous, decisions made here
- **Document layer** (`primaryPane.path`, `secondaryPane.path`) — asynchronous, documents load after layout changes

When projecting state for UI, prefer layout state or the most recently decided state. Avoid deriving from async-loading pane state.

## Files Changed

- `src/features/project-editor/use-project-editor-state.ts`
