# corkboardOrder path scoping

**Date:** 2026-04-21

## What I learned

`corkboardOrder` keys in `.trama.index.json` are project-relative (e.g., `book`, `book/Act-01`, `lore/places`). The sidebar tree operates entirely with section-relative paths (e.g., `Act-01`, `places`). These two worlds must be bridged at the `sidebar-panel-body.tsx` boundary, not inside the tree component.

## The counter-intuitive part

The reorder IPC handler (`trama:index:reorder`) receives **project-relative** paths in its payload (`folderPath` and `orderedIds`). Previously, `onReorderFiles` passed section-relative paths directly, which meant the IPC handler received paths like `Act-01` instead of `book/Act-01` — causing silent failures or wrong-folder updates.

The `scopeCorkboardOrder()` function converts project-relative `corkboardOrder` keys and IDs into section-relative equivalents for the sidebar tree, and `buildScopedReorderHandler()` converts section-relative paths back to project-relative before calling the IPC.

## Data flow

1. `snapshot.index.corkboardOrder` → `use-project-editor-state.ts` derives `corkboardOrder`
2. `corkboardOrder` flows through `project-editor-view` → `sidebar-panel` → `sidebar-panel-body`
3. `sidebar-panel-body` calls `scopeCorkboardOrder()` to convert keys/IDs to section-relative
4. Scoped order → `sidebar-explorer-content` → `sidebar-explorer-body` → `sidebar-tree`
5. `sidebar-tree` calls `sortTreeRowsByOrder()` to reorder rows before rendering
6. On drag-drop, `use-sidebar-tree-drag-handlers` builds section-relative reorder payload
7. `buildScopedReorderHandler()` in `sidebar-panel-body` converts back to project-relative before IPC

## Key files

| File | Responsibility |
|------|---------------|
| `sidebar-tree-sort.ts` | `sortTreeRowsByOrder()` — pure sort by order map |
| `sidebar-panel-body.tsx` | `scopeCorkboardOrder()`, `buildScopedReorderHandler()` — path conversion boundary |
| `use-sidebar-tree-drag-handlers.ts` | `executeDrop()` — builds section-relative reorder payload |

## Focused test

```
npm run test -- tests/sidebar-tree.test.ts
```
