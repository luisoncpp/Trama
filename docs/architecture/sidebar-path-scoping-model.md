# Sidebar Path Scoping Model

> **Last updated:** 2026-05-08

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

The canonical seam now lives in `src/features/project-editor/components/sidebar/sidebar-path-scoping.ts`. It exports branded types so TypeScript can distinguish the two relative path spaces at compile time:

- `SidebarSectionRoot` — normalized section root such as `book/`
- `ProjectRelativePath` — IPC/filesystem path such as `book/chapter-1/intro.md`
- `SectionRelativePath` — sidebar/tree path such as `chapter-1/intro.md`

### Section roots

Each sidebar section maps to a specific folder under the project:

```typescript
// From sidebar-section-roots.ts
export const SIDEBAR_SECTION_CONFIG = {
  explorer: { title: 'Manuscript', root: defineSidebarSectionRoot('book/') },
  outline:  { title: 'Outline',    root: defineSidebarSectionRoot('outline/') },
  lore:     { title: 'Lore',       root: defineSidebarSectionRoot('lore/') },
}
```

The **section root** is the bridge between project-relative and section-relative paths.

## Conversion functions

### 1. Project-relative → Section-relative (scoping down)

Used when displaying files in the sidebar tree. Strips the section root prefix.

**`getScopedFiles(files, sectionRoot)`** — `sidebar-path-scoping.ts`

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

**`getScopedSelectedPath(selectedPath, sectionRoot)`** — `sidebar-path-scoping.ts`

Same logic but for a single path. Returns `null` if path is outside the section or empty after stripping.

### 2. Section-relative → Project-relative (scoping up)

Used before every IPC call. The key difference after the refactor: callers do not concatenate strings themselves; they go through named conversions in `sidebar-path-scoping.ts`.

**`toProjectPath(path, sectionRoot)`** — `sidebar-path-scoping.ts`

```typescript
const sectionPath = toSectionRelativePath('chapter-1/intro.md')
toProjectPath(sectionPath, defineSidebarSectionRoot('book/'))
// → 'book/chapter-1/intro.md'
```

**`toProjectFolderPath(path, sectionRoot)`** — `sidebar-path-scoping.ts`

Used for folder targets and the section-root sentinel (`''` → `book`).

**`buildProjectCandidatePath(params)`** — `sidebar-path-scoping.ts`

Used for create operations:

```typescript
// Example: creating "My Article" in directory "drafts" under book/
const params = {
  sectionRoot: defineSidebarSectionRoot('book/'),
  directory: 'drafts',
name: 'my-article',
  attempt: 0,
  asMarkdown: true,
}

// Result: 'book/drafts/my-article.md'
```

### 3. Display path construction

**`joinProjectPath(rootPath, sectionRoot)`** — `sidebar-panel-logic.ts`

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
| Rename file | Section-relative | Project-relative | `toProjectPath()` |
| Delete file | Section-relative | Project-relative | `toProjectPath()` |
| Create article | Section-relative directory + name | Project-relative | `buildProjectCandidatePath()` |
| Create category | Section-relative directory + name | Project-relative | `buildProjectCandidatePath()` |
| Edit file tags | Section-relative | Project-relative | `toProjectPath()` |
| Move file (drag-drop) | Section-relative | Project-relative | `toProjectPath()` + `toProjectFolderPath()` |
| Reorder files | Section-relative | Project-relative | `buildScopedReorderHandler()` in `sidebar-path-scoping.ts` |
| CorkboardOrder → tree | Project-relative | Section-relative | `scopeCorkboardOrder()` in `sidebar-path-scoping.ts` |
| UI label display | Project root + section root | Absolute display path | `joinProjectPath()` |
| Select file | Section-relative | Project-relative | `toProjectPath()` |
| Load file tags | Section-relative | Project-relative | `toProjectPath()` inside `loadFileTags()` |

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
│  Path Scoping Module (sidebar-path-scoping.ts)              │
│  - branded path types                                        │
│  - getScopedFiles/getScopedSelectedPath                      │
│  - toProjectPath/toProjectFolderPath                         │
│  - buildProjectCandidatePath                                 │
│  - scopeCorkboardOrder/buildScopedReorderHandler             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Sidebar Adapter Layer (sidebar-panel-body.tsx)            │
│  - converts raw callback strings immediately                │
│  - never concatenates `${root}${path}` inline               │
│  - delegates all scoping to sidebar-path-scoping.ts         │
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

**Fix:** Always convert through `toProjectPath()` or `toProjectFolderPath()` from `sidebar-path-scoping.ts`.

```typescript
// WRONG: section-relative path sent to IPC
await window.tramaApi.renameDocument({ path: 'chapter-1/intro.md', newName: 'new-name.md' })

// CORRECT: project-relative path
const sectionRoot = defineSidebarSectionRoot('book/')
const sectionPath = toSectionRelativePath('chapter-1/intro.md')
await window.tramaApi.renameDocument({ path: toProjectPath(sectionPath, sectionRoot), newName: 'new-name.md' })
```

### 2. Path separator normalization

**Symptom:** Path matching fails on Windows.

**Cause:** Windows uses `\` but section roots use `/`. Paths must be normalized before comparison.

**Fix:** `sidebar-path-scoping.ts` normalizes before both scoping down and scoping up.

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

**Fix:** `buildProjectCandidatePath()` takes params object with `asMarkdown` boolean:

```typescript
// Article: adds .md extension
buildProjectCandidatePath({ sectionRoot: defineSidebarSectionRoot('book/'), directory: 'drafts', name: 'my-article', attempt: 0, asMarkdown: true })
// → 'book/drafts/my-article.md'

// Category (folder): no extension
buildProjectCandidatePath({ sectionRoot: defineSidebarSectionRoot('book/'), directory: 'drafts', name: 'my-category', attempt: 0, asMarkdown: false })
// → 'book/drafts/my-category'
```

### 5. Reorder vs move path confusion

**Symptom:** Drag-drop reorder affects wrong files or fails silently.

**Cause:** `onReorderFiles` receives section-relative paths from the tree, but the IPC handler needs project-relative paths for `corkboardOrder` keys and values.

**Fix:** `sidebar-panel-body.tsx` delegates to the deep seam:

```typescript
onReorderFiles={buildScopedReorderHandler(onReorderFiles, sectionConfig.root)}
onMoveFile={(sourcePath, targetFolder) =>
  onMoveFile(
    toProjectPath(toSectionRelativePath(sourcePath), sectionConfig.root),
    toProjectFolderPath(toSectionRelativeFolderPath(targetFolder), sectionConfig.root),
  )
}
```

The key detail: `sidebar-tree.tsx` passes section-relative paths (`draggingPath`, `dropPosition.folderPath`). The conversion happens in `buildScopedReorderHandler()` inside `sidebar-path-scoping.ts`, not at the tree layer. For root-level files, `folderPath` is `''` (section-relative empty) which maps to the section root without trailing slash (e.g., `book`).

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
| `src/features/project-editor/components/sidebar/sidebar-path-scoping.ts` | Canonical seam: branded types + every section-relative ↔ project-relative conversion |
| `src/features/project-editor/components/sidebar/sidebar-panel-logic.ts` | `joinProjectPath()` and sidebar filter state; delegates path scoping to the canonical seam |
| `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx` | Thin adapter: converts raw callback strings immediately and calls project actions with branded-project conversions |
| `src/features/project-editor/components/sidebar/sidebar-section-roots.ts` | `SIDEBAR_SECTION_CONFIG` definition with branded `SidebarSectionRoot` values |
| `src/features/project-editor/use-project-editor-create-actions.ts` | Create operations reuse `buildProjectCandidatePath()` from the same seam |
| `src/features/project-editor/use-project-editor-file-actions.ts` | File rename/delete/tag operations (receives project-relative paths) |
| `src/features/project-editor/use-project-editor-folder-actions.ts` | Folder rename/delete operations (receives project-relative paths) |
| `src/shared/sidebar-utils.ts` | `normalizeName()`, `isInvalidRenameInput()` |

## Lessons learned

- **Always trace the path format** when debugging sidebar issues. The most common bug is passing section-relative paths to project-relative IPC calls.
- **The deep seam is `sidebar-path-scoping.ts`**. `sidebar-panel-body.tsx` is only the outer adapter that turns raw callback strings into branded conversions immediately.
- **Reorder converts both ways**. `scopeCorkboardOrder()` converts project-relative index keys/IDs to section-relative for the sidebar tree; `buildScopedReorderHandler()` converts section-relative back to project-relative before IPC.
- **Compiler checks replace several runtime mix-up tests**. `tests/sidebar-path-scoping-types.test.ts` uses `@ts-expect-error` plus `tests/typescript-compile.test.ts` to ensure `SectionRelativePath` and `ProjectRelativePath` cannot be mixed accidentally.
- **Windows path separators** must be normalized before any string operations. `sidebar-path-scoping.ts` handles this for every exported conversion.
- **Empty folders** in the tree come from explicit folder entries in the scanner output, not from path derivation. They still use section-relative paths.

## See also

- Main sidebar architecture: `docs/architecture/sidebar-architecture.md`
- Path scoping lesson: `docs/lessons-learned/sidebar-path-scoping.md`
- Folder rename remapping: `docs/lessons-learned/folder-rename-split-layout-remap.md`
- Split pane sidebar coordination: `docs/lessons-learned/split-pane-sidebar-layout-vs-pane-path.md`
