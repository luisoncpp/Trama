# Sidebar Architecture Guide

> **Last updated:** 2026-04-21

Goal: explain the sidebar subsystem end-to-end so contributors can understand data flow, path scoping, and extension points without broad code searches.

## Scope

This guide covers the sidebar subsystem in `project-editor`:
- section model (explorer/outline/lore/transfer/settings)
- path scoping (section-relative vs project-relative)
- tree building and filtering
- dialogs and context menus
- drag-and-drop reorder and move
- persistence model

## Architecture overview

The sidebar is a **multi-section panel** that renders different content based on the active rail section. Each content section (`explorer`, `outline`, `lore`) shares a common data model: a flat list of section-scoped paths (files and optional explicit folder entries), rendered as a hierarchical tree.

```
┌─────────────────────────────────────┐
│  SidebarPanelBody                   │
│  ┌─────────────────────────────────┐│
│  │  SidebarExplorerContent         ││
│  │  ┌─────────────────────────────┐││
│  │  │ SidebarExplorerBody         │││
│  │  │   SidebarFilter             │││
│  │  │   SidebarTree               │││
│  │  │     SidebarTreeRows         │││
│  │  │       SidebarTreeRowButton  │││
│  │  │       DropIndicator         │││
│  │  │   SidebarExplorerDialogs    │││
│  │  └─────────────────────────────┘││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

## Core model

### Section configuration

Sections are defined in `sidebar-section-roots.ts`:

```typescript
export const SIDEBAR_SECTION_CONFIG: Record<ContentSidebarSection, SidebarSectionConfig> = {
  explorer: { title: 'Manuscript', root: 'book/' },
  outline: { title: 'Outline', root: 'outline/' },
  lore:    { title: 'Lore',    root: 'lore/' },
}
```

Each section maps to a **root folder** under the project. The sidebar never sees the full project path — it works with **section-relative paths**.

### Path scoping invariant

**This is the most important invariant in the sidebar.**

| Layer | Path format | Example |
|-------|-------------|---------|
| Project root | absolute | `C:\Proyectos\my-novel\` |
| Section root | relative to project | `book/` |
| Sidebar tree path | relative to section | `chapter-1/intro.md` |
| IPC call path | project-relative | `book/chapter-1/intro.md` |

The conversion happens at the boundary:

```
sidebar path  →  IPC path
"chapter-1/intro.md"  →  sectionConfig.root + "chapter-1/intro.md"
                        = "book/chapter-1/intro.md"
```

Functions responsible:
- `getScopedFiles()` — strips `sectionRoot` prefix from project paths → sidebar paths
- `getScopedSelectedPath()` — same for selected path
- `joinProjectPath()` — builds the absolute section label path shown in the UI from `rootPath + sectionRoot`
- `makeRootPath()` in `sidebar-panel-body.tsx` — `(path) => root + path` used for IPC calls
- `loadFileTags()` in `sidebar-panel-body.tsx` — reads document tags via project-relative `readDocument` IPC when the Edit Tags dialog opens

**Lesson:** Any IPC file operation (read, rename, delete, create) must use the project-relative path, not the sidebar path. See `lessons-learned/sidebar-path-scoping.md` and the dedicated `docs/architecture/sidebar-path-scoping-model.md` for full conversion tables and boundary functions.

## Data flow

### 1. File list ingestion

```
Project open → IPC trama:project:open → snapshot.tree + snapshot.index.corkboardOrder
  → getVisibleSidebarPaths() → visibleFiles (project-relative paths)
  → useSidebarContentSection → getScopedFiles() → scopedFiles (section-relative)
  → scopeCorkboardOrder() → scoped corkboardOrder (section-relative keys/IDs)
  → SidebarTree → buildSidebarTree() → tree nodes
  → sortTreeRowsByOrder(rows, scopedCorkboardOrder) → sorted rows
```

### 2. Tree building

`buildSidebarTree()` in `sidebar-tree-logic.ts`:
- Input: flat array of section-relative paths (files and optional folder paths ending in `/`)
- Output: `SidebarTreeState` with `nodesById` and `rootIds`
- Folders are derived from path segments (and can also come from explicit folder rows in input)
- Folders sort before files (locale compare within type)
- Node ID = normalized path without trailing slash

See `docs/architecture/tree-building-and-implicit-folders.md` for the complete breakdown of normalization, implicit folder derivation, sorting rules, and expanded state lifecycle.

```typescript
interface SidebarTreeNode {
  id: string        // normalized path
  name: string      // last segment
  path: string      // normalized path
  type: 'folder' | 'file'
  depth: number     // nesting level
  parentId: string | null
  childIds: string[]
}
```

### 3. Visibility and rendering

`getVisibleSidebarRows()` flattens the tree into a linear list of rows, respecting expanded/collapsed state:
- Only children of expanded folders appear
- Depth drives indentation in the UI

See `docs/architecture/tree-building-and-implicit-folders.md` for the DFS traversal algorithm and expanded state lifecycle.

### 4. Filter system

`filterSidebarTree()` in `sidebar-filter-logic.ts`:
- Case-insensitive match on node name and full path
- When a file matches, the file + all ancestor folders become visible
- `autoExpandFolderPaths` — folders that should be auto-expanded to show matches
- Debounced input (180ms) in `SidebarFilter` component

See `docs/architecture/tree-building-and-implicit-folders.md` for the filter-driven auto-expansion mechanics and how it interacts with expanded state.

## State persistence

### Expanded folders

Hook: `useSidebarTreeExpandedFolders`

Seeding logic (priority order):
1. Seed from current in-memory expanded state, filtering out paths that no longer exist
2. On first init, if no valid expanded paths exist → expand root folders
3. On tree structure change (new files/folders), validate/remap and fall back to roots when needed
4. On folder rename → remap expanded paths via `remapExpandedFoldersForPathRemap()`
5. During active filter, merge in `autoExpandFolderPaths`; on filter clear, restore pre-filter expanded state

See `docs/architecture/tree-building-and-implicit-folders.md` for the complete expanded state lifecycle, tree key detection, and rename remapping algorithm.

### Section selection

Persisted in `trama.sidebar.ui.v1`:
- `activeSection`: which rail section is active
- `panelCollapsed`: whether the entire sidebar is collapsed
- `panelWidth`: panel width in pixels

## Dialogs and context menus

### Dialog state machine

Each dialog type is managed by a dedicated hook:

| Hook | Manages |
|------|---------|
| `useSidebarCreateDialog` | Article/Category creation mode, input state |
| `useSidebarFileActionsDialog` | File rename/delete/edit-tags mode |
| `useSidebarFolderActionsDialog` | Folder rename/delete mode |

Pattern: `openX(path) → set mode + target → render dialog → confirm/close → reset`

### Context menus

Two context menus rendered via overlay layer:
- `SidebarFileContextMenu` — Edit Tags, Rename, Delete
- `SidebarFolderContextMenu` — Rename, Delete

Note: right-clicking a file row triggers file selection/open and then immediately shows the file context menu; the selection call is not awaited before the menu opens.

Positioned absolutely at click coordinates. Click outside closes.

## Drag and drop reorder and move

### Model

- Entire file row is draggable (`draggable` on file rows)
- `draggingPath`: file being dragged
- `dropPosition`: calculated from `clientY` relative to row midpoints
- Drop types currently produced by `sidebar-tree.tsx`: `onFolder` (drop onto folder), `between` (drop between rows)
- `DropIndicator` type model also includes `onSection`, but the tree logic does not currently calculate that position

### Move path

When the drop target resolves to `onFolder`, the renderer takes the move path instead of reorder:

```
drag file → dropPosition.type === 'onFolder'
  → onMoveFile(sourcePath, targetFolder)
  → sidebar-panel-body.tsx re-prefixes both with section root
  → IPC move path uses project-relative filesystem paths
```

- `onMoveFile` is wired through `SidebarPanelBody` → `SidebarExplorerContent` → `SidebarExplorerBody` → `SidebarTree`
- This path is for actual file moves between folders, not just in-index ordering

### IPC contract

```
trama:index:reorder → { folderPath: string, orderedIds: string[] }
```

- `folderPath`: **project-relative** folder path used as the `corkboardOrder` key (for example `book/chapter-1` or `book` for section root). Conversion from section-relative happens in `buildScopedReorderHandler()` at `sidebar-panel-body.tsx`.
- `orderedIds`: **project-relative** file paths (e.g., `book/Act-01/scene-2.md`). Conversion from section-relative happens in `buildScopedReorderHandler()`.
- Persists `corkboardOrder` in `.trama.index.json` (no disk file moves)
- After successful reorder, `openProject(rootPath)` refreshes the snapshot so `corkboardOrder` state updates immediately

**Current implementation note:** this is still a partial drag-and-drop system with two different outcomes. Folder drops use the move callback; between-row drops use reorder. The indicator type model includes `onSection`, but current tree logic does not emit it.

## Component hierarchy

```
SidebarPanelBody
├── SidebarExplorerContent (for explorer/outline/lore)
│   ├── SidebarHeader
│   └── SidebarExplorerBody
│       ├── SidebarFilter
│       ├── SidebarTree
│       │   └── SidebarTreeRows
│       │       ├── SidebarTreeRowButton (per row)
│       │       └── DropIndicator
│       └── SidebarExplorerDialogs
│           ├── ContextMenus
│           ├── FooterAndCreateDialog
│           ├── FileActionsDialog
│           └── FolderActionsDialog
├── SidebarTransferContent (AI import/export)
└── SidebarSettingsContent (theme, spellcheck, focus scope)
```

## Extension points

### Adding a new content section

1. Add entry to `SIDEBAR_SECTION_CONFIG` in `sidebar-section-roots.ts`
2. Add section to `SidebarSection` type in `project-editor-types.ts`
3. Add rail button in sidebar rail component
4. If it needs a tree view, reuse `SidebarExplorerContent` with different props
5. If it needs custom content, create a new `Sidebar*Content` component and wire it in `SidebarPanelBody`

### Adding a new file action

1. Add callback to `SidebarFileActions` interface in `sidebar-types.ts`
2. Add to context menu in `sidebar-file-context-menu.tsx`
3. Add dialog hook if needed (follow `useSidebarFileActionsDialog` pattern)
4. Wire through `SidebarPanelBody` → `SidebarExplorerContent` → `SidebarTree`

## Invariants

1. **Path scoping**: sidebar tree paths are section-relative. Filesystem IPC paths (read/create/rename/delete/move) are project-relative at the boundary. Reorder also converts to project-relative via `buildScopedReorderHandler()` at `sidebar-panel-body.tsx`.
2. **Folder modeling**: the tree can derive folders from file path prefixes and can also consume explicit folder paths from scanner output.
3. **Pane coordination**: sidebar `selectedPath` derives from `workspaceLayout.activePane` path, not from async-loading pane document path (see `lessons-learned/split-pane-sidebar-layout-vs-pane-path.md`).
4. **Focus mode lock**: sidebar auto-collapses and is locked closed while focus mode is active.
5. **Expanded folder state**: expanded state survives tree changes via path validation + root fallback (in-memory state).

## Regression hotspots

| Area | Common issue | Reference |
|------|-------------|-----------|
| Path scoping | Using sidebar path in IPC call | `lessons-learned/sidebar-path-scoping.md` |
| Folder rename | Expanded state not remapped | `lessons-learned/folder-rename-split-layout-remap.md` |
| Split pane | Sidebar selectedPath from wrong pane | `lessons-learned/split-pane-sidebar-layout-vs-pane-path.md` |
| Tree rendering | Cursor jumping on re-init | Watch `buildSidebarTree` deps | See `docs/architecture/tree-building-and-implicit-folders.md` |
| Filter | Auto-expand not restoring | Check `autoExpandFolderPaths` flow | See `docs/architecture/tree-building-and-implicit-folders.md` |
