# Flow Docs

Operational guides organized by user or system action: "when this happens, everything that follows is this."

## Purpose

Use `docs/flows/` when you need to follow behavior end-to-end from a trigger instead of from a subsystem boundary.

This folder is for:

- debugging a concrete user action
- understanding which functions run in sequence
- finding which state is read, written, or only projected for UI
- locating side effects quickly without codebase-wide search

## How this differs from other doc types

- `docs/architecture/`
  - explains what a subsystem is, its design, and its invariants
- `docs/flows/`
  - explains what happens when an action occurs
- `docs/lessons-learned/`
  - explains counter-intuitive facts discovered while working in the area
- `docs/plan/`
  - explains how to change or refactor something

## Recommended format

Each flow doc should try to include:

1. Trigger
2. Entry point
3. Step-by-step sequence
4. Reads
5. Writes
6. Side effects
7. Files to inspect
8. Common failure modes

Keep these docs operational. Prefer short tables, explicit file names, and sequence lists over long essays.

| `tag-overlay-flow.md` | What happens when Ctrl is held to show wiki tag underlines, including text matching, index mapping, and fresh bounds computation on each render |

| File | Scope |
|------|-------|
| `rich-editor-typing-flow.md` | What happens from a Quill keystroke through dirty marking, debounce, serialization, and state sync |
| `rich-editor-external-sync-flow.md` | What happens when the editor receives a new external value and must decide whether to re-apply it into Quill |
| `tag-overlay-flow.md` | What happens when Ctrl is held to show wiki tag underlines, including text matching, index mapping, and fresh bounds computation on each render |
| `switch-pane-flow.md` | What happens when the active workspace pane changes in split mode |
| `folder-delete-flow.md` | What happens from right-click Delete through IPC, snapshot refresh, and sidebar tree re-render |
| `visible-files-computation-flow.md` | How `visibleFiles` is derived from `coreState.snapshot`, scoped, and propagated through 7+ component layers to the tree renderer |
| `project-state-propagation-flow.md` | How state flows from `useProjectEditorCoreState` through `values`/`setters` to actions and back; why every callback is recreated every render |
| `sidebar-render-chain-flow.md` | The full component render chain from `App` through 10 layers down to `SidebarTreeRowButton` |
| `external-file-watcher-flow.md` | How chokidar events are classified internal/external, filtered, and forwarded to the renderer to trigger tree refreshes |
