# AI Import/Export Architecture

## Overview

AI import/export is a clipboard-based file transfer system. Content flows through the system in a structured delimited format (`=== FILE: path ===`), enabling multi-file creation and extraction in a single clipboard operation. Both import and export share the same format grammar, defined in `src/shared/ai-import-parser.ts`.

```
Clipboard content (LLM output or export buffer)
         |
         v
   +-------------+      +----------------+      +------------+
   |   Parser    | ---> |   Preview UI   | ---> |  Execute   |
   | ai-import-  |      | (replace/append)|      | (files on  |
   | parser.ts   |      |                |      |  disk)     |
   +-------------+      +----------------+      +------------+
                          Import flow            Import flow

   +-----------+      +----------------+      +------------+
   |  File     | ---> |   Export       | ---> |  Clipboard |
   |  selection|      |   service      |      |  write     |
   +-----------+      +----------------+      +------------+
   Export flow         Export flow
```

## Canonical Format

```
=== FILE: relative/path.md ===
file content here
```

- Header: `=== FILE:` + space + path relative to project root + ` ===`
- Content: everything after the newline following the header until the next file header or end of content
- Optional YAML frontmatter supported at the top of file content
- Paths must be relative to project root (no leading `/`, no `..` traversal)
- Special characters (`<>:"|?*`) and Windows reserved names are blocked

Parser source of truth: `src/shared/ai-import-parser.ts`

## Import Pipeline

### 1. Parser (`src/shared/ai-import-parser.ts`)

Regex-based parser using `=== FILE: path ===` delimiters with global+multiline flags.

```typescript
const FILE_HEADER = /^===\s*FILE:\s*(.+?)\s*===\r?\n/gim
```

Splits clipboard into `ParsedFile[]` by finding header positions and extracting content substrings between consecutive headers. Files where either `filePath` or `content` is empty after trimming are excluded.

### 2. Service (`electron/services/ai-import-service.ts`)

**previewImport(parsedFiles, projectRoot)**
- Resolves each relative path against project root
- Checks file existence with `existsSync`
- Reads existing file frontmatter (for display in preview)
- Returns `AiImportPreview` with file list, counts (total/new/existing)

**executeImport(parsedFiles, projectRoot, importMode)**
- Creates intermediate directories if missing (`mkdir` with `recursive: true`)
- For new files: writes content directly
- For existing files:
  - `replace`: overwrites with incoming content
  - `append`: joins existing + incoming with `'\n\n'` separator only when neither ends/starts with `\n`; if either is empty, returns the non-empty one; if incoming is empty, returns existing unchanged
- Returns `AiImportResponse` with created/appended/replaced/skipped/error counts

### 3. IPC Handlers (`electron/ipc/handlers/ai-handlers.ts`)

**handleAiImportPreview** — validates payload with `aiImportRequestSchema`, calls `parseClipboardContent` + `previewImportService`

**handleAiImport** — validates payload, calls `parseClipboardContent` + `executeImportService`, returns envelope

Both handlers wrap errors in `errorEnvelope()` with descriptive messages.

### 4. Renderer Hook (`src/features/project-editor/use-ai-import.ts`)

Manages dialog state (open, preview data, importMode selection), calls `window.tramaApi.aiImportPreview` and `window.tramaApi.aiImport`.

### 5. UI Components

- `src/features/project-editor/components/ai-import-dialog.tsx` — modal with clipboard textarea, mode selector (replace/append, applies to existing files only; new files are always created)
- `src/features/project-editor/components/ai-import-preview-section.tsx` — shows file list with new/existing badges and frontmatter preview for existing files

## Export Pipeline

### 1. File Selection (renderer)

Sidebar Transfer section (`src/features/project-editor/components/sidebar/sidebar-transfer-content.tsx`) exposes export trigger. Export dialog (`ai-export-dialog.tsx`, `ai-export-dialog-body.tsx`) opens OS file/folder dialogs via IPC (`trama:ai:export:pick-staging` → `electron/services/ai-export-pick-service.ts` with `defaultPath: projectRoot`). Renderer **Staging Basket** chip list receives absolute paths, then **Relative Path Hardening** in `src/features/project-editor/components/ai-export-staging/` (deep module; import only from `index.ts`). Only `book/`, `lore/`, and `outline/` paths are accepted; skips are reported via export toast (`setCopyToastMessage`) and console. Basket supports arrow-key focus, Backspace/Delete removal, and per-chip dismiss. Include-frontmatter option remains in the dialog shell.

Note: Chromium `showOpenFilePicker` / `FileSystemFileHandle` paths are empty under Electron (`webUtils.getPathForFile` cannot resolve them), so staging pickers use the main-process `dialog.showOpenDialog` bridge instead.

### 2. Export Service (`electron/services/ai-export-service.ts`)

**formatExportContent(filePaths, projectRoot, includeFrontmatter)**
- Validates each path with `validateExportPath()` (blocks traversal, reserved names, invalid chars)
- Reads file content with `readFileSync`
- Strips frontmatter from output when `includeFrontmatter === false` (finds `---...---` block at start), then `.trim()`s the remaining content
- Builds `=== FILE: normalized/relative/path.md ===\n<content>` blocks
- Returns `AiExportResponse { success: boolean, formattedContent, fileCount }` where `success` is `false` when all paths are invalid/missing (empty formattedContent)

Path validation:
```typescript
function validateExportPath(projectRoot: string, relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, '/').trim().replace(/^\/+/, '').replace(/\/+$/, '')
  // blocks: empty, '.', '..', invalid chars, reserved Windows names
  // resolves and checks prefix against project root
  return absoluteTarget.startsWith(rootWithSeparator) ? absoluteTarget : null
}
```

### 3. IPC Handler (`electron/ipc/handlers/ai-handlers.ts`)

**handleAiExport** — validates payload with `aiExportRequestSchema`, calls `formatExportContent`, returns envelope

### 4. Renderer Hook (`src/features/project-editor/use-ai-export.ts`)

- Calls `window.tramaApi.aiExport({ filePaths, projectRoot, includeFrontmatter })`
- Writes `response.data.formattedContent` to clipboard via `navigator.clipboard.writeText`
- Shows toast notification on success

### 5. UI Components

- `src/features/project-editor/components/ai-export-dialog.tsx` — portal + close/keyboard handling
- `src/features/project-editor/components/ai-export-dialog-body.tsx` — file multi-select list, frontmatter checkbox, export/cancel buttons

## IPC Contract

All channels defined in `src/shared/ipc.ts`. Handler registration in `electron/ipc.ts`.

| Channel | Direction | Purpose |
|---|---|---|
| `trama:ai:import:preview` | renderer → main | Parse clipboard and preview files |
| `trama:ai:import` | renderer → main | Execute import with mode |
| `trama:ai:export` | renderer → main | Format files to clipboard |
| `trama:ai:export:pick-staging` | renderer → main | Native open-file / open-directory dialog rooted at `projectRoot`; returns absolute paths |

**Request/Response types** (`src/shared/ipc.ts`):

```typescript
// Import
aiImportRequestSchema = z.object({
  clipboardContent: z.string().trim().min(1),
  projectRoot: z.string().trim().min(1),
  importMode: aiImportModeSchema.default('replace'),  // 'replace' | 'append'
})
AiImportPreview = { files: AiImportFile[], totalFiles, newFiles, existingFiles }
AiImportResponse = { success, created, appended, replaced, skipped, errors }

 // Export
aiExportRequestSchema = z.object({
  filePaths: z.array(z.string().trim().min(1)),
  projectRoot: z.string().trim().min(1),
  includeFrontmatter: z.boolean().default(true),
})
AiExportResponse = { success: boolean, formattedContent: string, fileCount: number }
```

All responses are envelope-wrapped (`{ ok: true, data: ... }` or `{ ok: false, error: ... }`).

## File Map

### Main process
- `electron/ipc.ts` — registers AI handlers
- `electron/ipc/handlers/ai-handlers.ts` — `handleAiImportPreview`, `handleAiImport`, `handleAiExport`
- `electron/services/ai-import-service.ts` — re-exports `parseClipboardContent` from the shared parser, plus `previewImport`, `executeImport`
- `electron/services/ai-export-service.ts` — `formatExportContent`, `validateExportPath`

### Renderer / Preload
- `electron/preload.cts` — exposes `tramaApi.aiImportPreview`, `tramaApi.aiImport`, `tramaApi.aiExport`
- `src/types/trama-api.d.ts` — `AiImportRequest`, `AiExportRequest`, envelope types

### Shared
- `src/shared/ipc.ts` — channel constants, Zod schemas, types
- `src/shared/ai-import-parser.ts` — format grammar and parser

### Renderer UI
- `src/features/project-editor/use-ai-import.ts` — import hook
- `src/features/project-editor/use-ai-export.ts` — export hook
- `src/features/project-editor/components/ai-import-dialog.tsx`
- `src/features/project-editor/components/ai-import-preview-section.tsx`
- `src/features/project-editor/components/ai-export-dialog.tsx`
- `src/features/project-editor/components/ai-export-dialog-body.tsx`
- `src/features/project-editor/components/ai-export-staging/index.ts` — staging deep module public API (path hardening, `AiExportStagingController`, keyboard helpers)
- `src/features/project-editor/components/ai-export-staging-basket.tsx` — basket UI wired to staging controller
- `electron/services/ai-export-pick-service.ts` — staging basket file/folder dialogs (`defaultPath: projectRoot`)
- `electron/preload.cts` — exposes `aiExportPickStaging`
- `src/features/project-editor/components/sidebar/sidebar-transfer-content.tsx` — Transfer section (import + export triggers)
- `src/features/project-editor/project-editor-view.tsx` — wires import/export hooks and dialogs

## Security

Export service validates all paths before disk access:
1. Normalizes Windows backslashes to forward slashes
2. Trims leading/trailing slashes and whitespace
3. Splits into segments and blocks `.`, `..`, special chars, and reserved Windows names
4. Resolves path and confirms it starts with project root prefix (prevents `/etc/passwd` escapes)

Import service operates on already-parsed relative paths and creates files only within project root via `path.resolve(projectRoot, file.path)`.

## Test Coverage

| Test file | Coverage |
|---|---|
| `tests/ai-import-parser.test.ts` | Parser: single file, multiple files, empty content, missing header, regex reset |
| `tests/ai-import-service.test.ts` | Service: replace overwrites, append with separator, preview classification |
| `tests/ai-import-ipc-handler.test.ts` | IPC: invalid importMode validation error, append mode write verification |
| `tests/use-ai-import.test.ts` | Renderer hook: importMode forwarded to preview/execute, log format |
| `tests/ai-export-service.test.ts` | Export: multi-file output, frontmatter toggle, path traversal blocking, missing file skip |
| `tests/ai-export-ipc-handler.test.ts` | IPC: envelope validation, success/error payloads |
| `tests/use-ai-export.test.ts` | Renderer hook: IPC call shape, clipboard copy, error state |
| `tests/ai-export-staging-hardening.test.ts` | Relative path hardening, merge/duplicate reporting |
| `tests/ai-export-staging-keyboard.test.ts` | Staging basket arrow keys and Backspace removal |

## Related docs

- `mds/spec/ai-import-format.md` — user-facing format guide with LLM prompts
- `mds/plan/ai-import-export-implementation-map.md` — implementation tracking and checklist
- `mds/adr/0003-native-file-picker-for-ai-export.md` — native picker + staging basket decision
- `mds/plan/ai-export-native-staging-plan.md` — staging basket implementation checklist