# Tree Building & Implicit Folders Architecture

> **Last updated:** 2026-04-19

Goal: explain how the sidebar transforms a flat list of section-relative paths into a hierarchical tree, including implicit folder derivation, normalization rules, sorting, and expanded state management.

## Scope

This document covers:
- `buildSidebarTree()` and its path normalization pipeline
- Implicit vs explicit folder modeling
- Sorting rules (folders before files)
- `getVisibleSidebarRows()` DFS traversal
- `getAncestorFolderPaths()` utility
- Expanded folder state seeding and lifecycle
- Filter-driven auto-expansion

## Input model

The tree builder receives a **flat array of section-relative paths** (see `sidebar-architecture.md` for path scoping details):

```typescript
sidebarPaths: string[]
// Examples:
//   ['chapter-1/scene-1.md', 'chapter-1/scene-2.md']
//   ['Lore/Characters/hero.md', 'Lore/Places/city.md']
//   ['Act-01/']  ← explicit empty folder (trailing slash)
```

Two types of entries are supported:
- **Files**: paths without trailing slash (e.g. `chapter-1/scene.md`)
- **Explicit folders**: paths with trailing slash (e.g. `empty-folder/`)

## Path normalization

`buildSidebarTree()` does **not** call `normalizePath()` on the raw input first. It first parses the raw path with `parseSidebarPath()` so it can preserve the trailing-slash signal that distinguishes an explicit folder from a file.

```typescript
function parseSidebarPath(rawPath: string): { path: string; type: SidebarTreeNodeType } | null {
  const normalizedSlashes = rawPath.replaceAll('\\', '/').replace(/^\/+/, '')
  const isFolder = normalizedSlashes.endsWith('/')
  const normalizedPath = normalizedSlashes.replace(/\/+$/, '')
  if (!normalizedPath) {
    return null
  }

  return {
    path: normalizedPath,
    type: isFolder ? 'folder' : 'file',
  }
}
```

After that, helper utilities such as `buildSidebarTree()` and `getAncestorFolderPaths()` canonicalize paths with `normalizePath()`:

```typescript
function normalizePath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '')
}
```

Three transformations:
1. Backslash → forward slash (Windows compatibility)
2. Strip leading slashes
3. Strip trailing slashes

The **node ID** is always the normalized path without trailing slash. This means a folder `Lore/Characters/` and a file `Lore/Characters.md` would have different IDs (`Lore/Characters` vs `Lore/Characters.md`).

## Folder derivation

### Implicit folders

Folders are **derived from file path segments**. Given `Lore/Characters/hero.md`, the builder creates:

```
Lore                    (folder, depth 0)
└── Lore/Characters     (folder, depth 1)
    └── Lore/Characters/hero.md  (file, depth 2)
```

Algorithm in `buildSidebarTree()`:
1. Split normalized path into segments
2. For **file** entries: iterate folder segments only (`0` to `segments.length - 2`), then create the file node separately with `ensureFileNode()`
3. For **explicit folder** entries: iterate all segments (`0` to `segments.length - 1`) so the final segment is materialized as a folder node
4. `ensureFolderNode()` and `ensureFileNode()` are **idempotent** for repeated creation attempts of the same normalized path

### Explicit folders

Empty folders that would never appear from file paths can be provided directly with a trailing slash:

```typescript
buildSidebarTree(['Lore/Worldbuilding/'])
// Creates: Lore (folder) → Lore/Worldbuilding (folder, no children)
```

The trailing slash is the **only** way to distinguish an explicit folder from a file in the input.

## Node structure

```typescript
interface SidebarTreeNode {
  id: string        // normalized path (no trailing slash)
  name: string      // last path segment (file.ext or folder name)
  path: string      // same as id for current implementation
  type: 'folder' | 'file'
  depth: number     // 0 for root-level, increments per nesting level
  parentId: string | null
  childIds: string[]
}
```

Depth is assigned during construction:
- Root-level nodes (no parent): depth 0
- Each child: parent depth + 1

## Sorting rules

After all nodes are built, a **post-processing sort** runs:

```typescript
function compareNodeOrder(a: SidebarTreeNode, b: SidebarTreeNode): number {
  if (a.type !== b.type) {
    return a.type === 'folder' ? -1 : 1  // folders first
  }
  return a.name.localeCompare(b.name)     // then alphabetical
}
```

Applied to:
1. Each node's `childIds` array (in-place sort)
2. The `rootIds` array (in-place sort)

**Result**: folders always appear before files at every level, and siblings are alphabetically ordered within their type group.

## Tree state output

```typescript
interface SidebarTreeState {
  nodesById: Record<string, SidebarTreeNode>
  rootIds: string[]
}
```

- `nodesById`: flat lookup map by normalized path
- `rootIds`: ordered list of top-level node IDs (already sorted)

## Visibility traversal

`getVisibleSidebarRows()` performs a **depth-first traversal** of the tree, starting from `rootIds`:

```typescript
function getVisibleSidebarRows(
  tree: SidebarTreeState,
  expandedFolderPaths: Set<string>,
  visibleNodePaths?: Set<string>,  // filter-driven visibility
): SidebarTreeRow[]
```

Behavior:
1. Visit each root ID in order
2. Skip nodes not in `visibleNodePaths` (when filter is active)
3. Emit a row for the current node
4. If the node is a folder **and** it's in `expandedFolderPaths`, recursively visit children
5. Otherwise stop at this branch

Output is a flat `SidebarTreeRow[]` where `depth` drives UI indentation.

## Ancestor extraction

`getAncestorFolderPaths()` is a utility that extracts all parent folder paths from a file path:

```typescript
getAncestorFolderPaths('Lore/Characters/hero.md')
// → ['Lore', 'Lore/Characters']

getAncestorFolderPaths('root.md')
// → []
```

Used by:
- Filter auto-expansion (see below)
- Selected path ancestor expansion
- Context menu operations

## Expanded folder state lifecycle

Managed by `useSidebarTreeExpandedFolders()` hook. The state follows a precise lifecycle:

### 1. Initial seeding (`useSeedExpandedFolders`)

Priority order:
1. Keep previously expanded paths that still exist in current tree
2. On first init with no valid paths → expand root folders
3. On tree structure change with empty previous state → expand root folders
4. After folder rename → remap via `remapExpandedFoldersForPathRemap()`

The hook tracks a **tree key** (sorted folder paths joined by `|`) to detect structural changes vs re-renders.

### 2. Selected path expansion (`useExpandSelectedPathAncestors`)

When a file is selected, all its ancestor folders are auto-expanded so the file is visible in the tree. Uses `getAncestorFolderPaths()` filtered against existing folder nodes.

### 3. Filter-driven auto-expansion

When the filter query is active:
- `filterSidebarTree()` computes `autoExpandFolderPaths` — all ancestor folders of matched files
- Effective expanded set = `userExpanded ∪ autoExpanded`
- Previous user-expanded state is saved in a ref

When the filter is cleared:
- Restores the saved user-expanded state (filtered against current tree)

### 4. Rename/move remapping

When a folder is renamed or moved, `remapExpandedFoldersForPathRemap()` updates expanded paths:
1. Try project-relative prefix remap first
2. Fall back to section-relative (strip section root) remap
3. Filter out any paths that no longer exist in the tree

## Filter system interaction

`filterSidebarTree()` in `sidebar-filter-logic.ts`:

1. Case-insensitive match on node `name` and `path`
2. When a file matches:
   - The file is added to `visibleNodePaths`
   - All ancestor folders are added to `visibleNodePaths` and `autoExpandFolderPaths`
3. Non-matching files and their non-ancestor folders are excluded

The filter **never removes nodes from the tree** — it only controls which nodes appear in the visible rows output.

## Data flow summary

```
section-relative paths (flat array)
  → parseSidebarPath() — normalize slashes enough to detect trailing / and classify folder vs file
  → buildSidebarTree()
      → normalizePath() — canonicalize stored paths/segments
      → ensureFolderNode() — idempotent, derives implicit folders
      → ensureFileNode() — idempotent, creates file nodes
      → compareNodeOrder() — folders first, then alphabetical
  → SidebarTreeState { nodesById, rootIds }
  → getVisibleSidebarRows() — DFS with expanded/filter gates
  → SidebarTreeRow[] — flat list for UI rendering
```

## Edge cases and invariants

1. **Duplicate paths**: `ensureFolderNode` and `ensureFileNode` are idempotent — calling them twice with the same path is a no-op
2. **Empty input**: returns `{ nodesById: {}, rootIds: [] }` — tree renders as empty state
3. **Root-level files**: files with no path separator (e.g. `README.md`) become root nodes directly
4. **Mixed separators**: `normalizePath()` converts `\` to `/` so Windows paths work correctly
5. **Trailing slash on files**: `parseSidebarPath()` treats any trailing-slash path as a folder, so `chapter.md/` would be interpreted as a folder named `chapter.md`
6. **Node ID collision**: a folder `Lore/Characters` and a file `Lore/Characters.md` have distinct IDs — no collision possible
7. **Sorting stability**: `localeCompare` provides deterministic ordering within type groups

## Related documents

- `sidebar-architecture.md` — overall sidebar subsystem, path scoping model
- `sidebar-path-scoping-model.md` — section-relative vs project-relative path conversion
- `lessons-learned/folder-rename-split-layout-remap.md` — expanded state remapping on rename
