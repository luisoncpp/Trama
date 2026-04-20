# Sidebar Path Scoping Model

> **Last updated:** 2026-04-19

Goal: document the section-relative ↔ project-relative path conversion model so contributors can understand the boundary functions, conversion tables, and common failure modes without tracing code across multiple files.

## Why this exists

Path scoping bugs are the #1 source of sidebar failures. Every IPC call (read, create, rename, delete, move) requires a **project-relative** path, but the sidebar tree renders with **section-relative** paths. Getting this conversion wrong causes silent failures, wrong-file operations, or crashes.

## Core concept: three path layers

The sidebar subsystem works with three distinct path formats:

| Layer | Format | Example | Where it lives |
|-------|--------|---------|----------------|
| **Project root** | Absolute filesystem path | `C:\Proyectos\my-novel\` | `values.rootPath` in state hooks |
| **Project-relative** | Relative to project root, includes section folder | `book/chapter-1/intro.md` | IPC calls, filesystem operations |
| **Section-relative** | Relative to section root only | `chapter-1/intro.md` | Sidebar tree, UI rendering |

### Section roots

Each sidebar section maps to a specific folder under the project:

```typescript
// From sidebar-section-roots.ts
export const SIDEBAR_SECTION_CONFIG = {
  explorer: { title: 'Manuscript', root: 'book/' },
  outline:  { title: 'Outline',    root: 'outline/' },
  lore:     { title: 'Lore',       root: 'lore/' },
}
```

The **section root** is the bridge between project-relative and section-relative paths.

## Conversion functions

### 1. Project-relative → Section-relative (scoping down)

Used when displaying files in the sidebar tree. Strips the section root prefix.

**`getScopedFiles(files, sectionRoot)`** — `sidebar-panel-logic.ts:9`

```
Input:  ['book/chapter-1/intro.md', 'book/chapter-2/outro.md', 'lore/places/city.md']
Root:   'book/'
Output: ['chapter-1/intro.md', 'chapter-2/outro.md']
```

Algorithm:
1. Normalize all paths (replace `\` with `/`)
2. Filter paths that start with `sectionRoot`
3. Strip the `sectionRoot` prefix
4. Filter out empty results (files at section root level)

**`getScopedSelectedPath(selectedPath, sectionRoot)`** — `sidebar-panel-logic.ts:17`

Same logic but for a single path. Returns `null` if path is outside the section or empty after stripping.

### 2. Section-relative → Project-relative (scoping up)

Used before every IPC call. Prepends the section root.

**`makeRootPath(root)`** — `sidebar-panel-body.tsx:59`

```typescript
const makeRootPath = (root: string) => (path: string) => `${root}${path}`
```

Example usage in `sidebar-panel-body.tsx`:

```typescript
const withRoot = makeRootPath(sectionConfig.root)
// withRoot('chapter-1/intro.md') → 'book/chapter-1/intro.md'
```

**`buildCandidatePath(sectionRoot, directory, baseName, attempt, asMarkdown)`** — `use-project-editor-create-actions.ts:19`

Used for create operations:

```typescript
// Example: creating "My Article" in directory "drafts" under book/
sectionRoot = 'book/'
directory = 'drafts'
baseName = 'my-article'
attempt = 0
asMarkdown = true

// Result: 'book/drafts/my-article.md'
```

### 3. Display path construction

**`joinProjectPath(rootPath, sectionRoot)`** — `sidebar-panel-logic.ts:29`

Builds the absolute section label shown in the UI:

```typescript
joinProjectPath('C:\\Proyectos\\my-novel\\', 'book/')
// → 'C:\Proyectos\my-novel\book'
```

Strips trailing separators before joining.

## Conversion table

| Operation | Input path format | Output path format | Function used |
|-----------|------------------|-------------------|---------------|
| Display tree nodes | Project-relative | Section-relative | `getScopedFiles()` |
| Display selected file | Project-relative | Section-relative | `getScopedSelectedPath()` |
| Rename file | Section-relative | Project-relative | `makeRootPath(sectionConfig.root)` |
| Delete file | Section-relative | Project-relative | `makeRootPath(sectionConfig.root)` |
| Create article | Section-relative + name | Project-relative | `buildCandidatePath()` |
| Create category | Section-relative + name | Project-relative | `buildCandidatePath()` |
| Edit file tags | Section-relative | Project-relative | `makeRootPath(sectionConfig.root)` |
| Move file (drag-drop) | Section-relative | Project-relative | `makeRootPath(sectionConfig.root)` |
| Reorder files | Section-relative | Section-relative | `onReorderFiles` (stays scoped) |
| UI label display | Project root + section root | Absolute display path | `joinProjectPath()` |
| Select file | Section-relative | Project-relative | `makeRootPath(sectionConfig.root)` at `sidebar-panel-body.tsx:109` |
| Load file tags | Section-relative | Project-relative | `loadFileTags(root)` at `sidebar-panel-body.tsx:108` |

## Boundary map: where conversion happens

```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar UI Layer (section-relative paths)                  │
│  - SidebarTree, SidebarTreeRowButton                        │
│  - SidebarFilter, SidebarExplorerBody                       │
│  - Context menus (file/folder rename, delete)               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Conversion Layer (sidebar-panel-body.tsx)                  │
│  - makeRootPath(sectionConfig.root) ← prepends section root │
│  - withRoot(path) used for all IPC-bound callbacks           │
│  - loadFileTags(sectionConfig.root) ← same pattern           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  IPC Layer (project-relative paths)                         │
│  - window.tramaApi.renameDocument({ path: projectRelative })│
│  - window.tramaApi.deleteDocument({ path: projectRelative })│
│  - window.tramaApi.createDocument({ path: projectRelative })│
│  - window.tramaApi.readDocument({ path: projectRelative })  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Electron Handler Layer (absolute paths)                    │
│  - Handlers prepend values.rootPath to project-relative     │
│  - Actual filesystem operations use absolute paths          │
└─────────────────────────────────────────────────────────────┘
```

## Common failure modes

### 1. Using sidebar path in IPC call

**Symptom:** File not found, or wrong file affected.

**Cause:** Passing a section-relative path directly to an IPC function without prepending the section root.

**Fix:** Always use `makeRootPath(sectionConfig.root)(path)` or `withRoot(path)` before IPC calls.

```typescript
// WRONG: section-relative path sent to IPC
await window.tramaApi.renameDocument({ path: 'chapter-1/intro.md', newName: 'new-name.md' })

// CORRECT: project-relative path
const withRoot = makeRootPath(sectionConfig.root)
await window.tramaApi.renameDocument({ path: withRoot('chapter-1/intro.md'), newName: 'new-name.md' })
```

### 2. Path separator normalization

**Symptom:** Path matching fails on Windows.

**Cause:** Windows uses `\` but section roots use `/`. Paths must be normalized before comparison.

**Fix:** `getScopedFiles()` and `getScopedSelectedPath()` both call `normalizePath()` first.

```typescript
function normalizePath(path: string): string {
  return path.replaceAll('\\', '/')
}
```

### 3. Empty section-relative paths

**Symptom:** Files directly at the section root level don't appear in the tree.

**Cause:** `getScopedFiles()` filters out empty strings resulting from stripping the section root. When `book/intro.md` is scoped with root `book/`, it correctly produces `intro.md` and appears. However, when a path equals the section root exactly (e.g., `book/`), stripping yields an empty string that gets filtered.

**Fix:** This is intentional. Files directly at the section root (e.g., `book/intro.md` → `intro.md`) do appear. Only paths that are the section root itself (e.g., `book/`) produce empty strings and are filtered out.

### 4. Create operations with wrong extension

**Symptom:** Created files don't appear in tree or have wrong type.

**Cause:** Articles need `.md` extension, categories (folders) don't.

**Fix:** `buildCandidatePath()` takes `asMarkdown` boolean:

```typescript
// Article: adds .md extension
buildCandidatePath('book/', 'drafts', 'my-article', 0, true)
// → 'book/drafts/my-article.md'

// Category (folder): no extension
buildCandidatePath('book/', 'drafts', 'my-category', 0, false)
// → 'book/drafts/my-category'
```

### 5. Reorder vs move path confusion

**Symptom:** Drag-drop reorder affects wrong files or fails silently.

**Cause:** `onReorderFiles` uses section-relative paths (for `corkboardOrder` keys), while `onMoveFile` uses project-relative paths (for actual filesystem moves).

**Fix:** In `sidebar-panel-body.tsx`:

```typescript
// Reorder: stays section-relative (sidebar-panel-body.tsx:110)
onReorderFiles={onReorderFiles}

// Move: wrapper converts to project-relative at sidebar-panel-body.tsx:111
onMoveFile={onMoveFile ? (s, t) => onMoveFile(withRoot(s), withRoot(t)) : undefined}
```

The key detail: `sidebar-tree.tsx:108` passes section-relative paths (`draggingPath`, `dropPosition.folderPath`). The conversion happens in the wrapper at `sidebar-panel-body.tsx:111`, not at the tree layer.

## Test cases to verify path scoping

When modifying path scoping logic, verify these cases:

| Test | Input | Expected output |
|------|-------|----------------|
| Scope file in section | `book/chapter-1/intro.md` with root `book/` | `chapter-1/intro.md` |
| Scope file outside section | `lore/places/city.md` with root `book/` | filtered out |
| Scope file at section root | `book/intro.md` with root `book/` | `intro.md` (via `getScopedFiles`), `null` (via `getScopedSelectedPath`) |
| Unscope for IPC | `chapter-1/intro.md` with root `book/` | `book/chapter-1/intro.md` |
| Unscope nested file | `drafts/chapter-1/intro.md` with root `book/` | `book/drafts/chapter-1/intro.md` |
| Create article path | root=`book/`, dir=`drafts`, name=`my-article` | `book/drafts/my-article.md` |
| Create category path | root=`book/`, dir=`drafts`, name=`my-category` | `book/drafts/my-category` |
| Join display path | root=`C:\novel\`, section=`book/` | `C:\novel\book` |
| Normalize Windows path | `book\chapter-1\intro.md` | `book/chapter-1/intro.md` |

## Related files

| File | Responsibility |
|------|---------------|
| `src/features/project-editor/components/sidebar/sidebar-panel-logic.ts` | `getScopedFiles()`, `getScopedSelectedPath()`, `joinProjectPath()` |
| `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx` | `makeRootPath()`, `loadFileTags()`, conversion wrapper `withRoot` |
| `src/features/project-editor/components/sidebar/sidebar-section-roots.ts` | `SIDEBAR_SECTION_CONFIG` definition |
| `src/features/project-editor/use-project-editor-create-actions.ts` | `buildCandidatePath()`, create operation scoping |
| `src/features/project-editor/use-project-editor-file-actions.ts` | File rename/delete/tag operations (receives project-relative paths) |
| `src/features/project-editor/use-project-editor-folder-actions.ts` | Folder rename/delete operations (receives project-relative paths) |
| `src/shared/sidebar-utils.ts` | `normalizeName()`, `isInvalidRenameInput()` |

## Lessons learned

- **Always trace the path format** when debugging sidebar issues. The most common bug is passing section-relative paths to project-relative IPC calls.
- **The conversion boundary is `sidebar-panel-body.tsx`**. All `withRoot()` calls live there. If a new callback needs project-relative paths, add the conversion at this layer.
- **Reorder is the exception**. `corkboardOrder` persistence uses section-relative paths because they're index keys, not filesystem targets.
- **Windows path separators** must be normalized before any string operations. The `normalizePath()` function in `sidebar-panel-logic.ts` handles this.
- **Empty folders** in the tree come from explicit folder entries in the scanner output, not from path derivation. They still use section-relative paths.

## See also

- Main sidebar architecture: `docs/architecture/sidebar-architecture.md`
- Path scoping lesson: `docs/lessons-learned/sidebar-path-scoping.md`
- Folder rename remapping: `docs/lessons-learned/folder-rename-split-layout-remap.md`
- Split pane sidebar coordination: `docs/lessons-learned/split-pane-sidebar-layout-vs-pane-path.md`
