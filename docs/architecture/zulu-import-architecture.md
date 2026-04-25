# ZuluPad Import Architecture

## Overview

ZuluPad import is a file-based import system that reads `.zulu` XML documents and converts each page into a separate markdown file with YAML frontmatter. The import supports configurable target folder and tag generation from page titles.

```
.zulu file on disk
       |
       v
+-------------+      +----------------+      +----------------+
|   Parser    | ---> |   Preview UI   | ---> |   Execute      |
| zulu-parser |      | (folder + tags)|      | (markdown      |
|    .ts      |      |                |      |  files on disk)|
+-------------+      +----------------+      +----------------+
```

## Parser (`src/shared/zulu-parser.ts`)

Parses the `.zulu` XML using regex to extract pages. The format is:

```xml
<ZuluDoc>
  <index>
    <name>Index Page</name>
    <content><![CDATA[...]]></content>
  </index>
  <content>
    <page>
      <name><![CDATA[Title]]></name>
      <content><![CDATA[body]]></content>
    </page>
  </content>
</ZuluDoc>
```

**Approach**: `<page>` blocks are matched directly across the entire XML document (no need to isolate the outer `<content>` section first). Each page's `<name>` and `<content>` are extracted from its `<page>` block via nested regex. CDATA wrappers are stripped using `<!\[CDATA\[...\]\]>` regex when present.

The `<index>` page is treated as a regular page (its `<name>` is always "Index Page").

**Exported interface**:

```typescript
interface ZuluPage {
  title: string  // from <name>
  content: string  // from <content>
}
```

## Encoding Handling

ZuluPad (C++/wxWidgets on Windows) saves `.zulu` files in **Latin-1 (CP1252)** by default. The XML declaration omits encoding (`<?xml version="1.0" ?>`), making naive UTF-8 reads produce replacement characters (`\uFFFD`) for accented characters (á, é, í, ó, ú, ñ).

**`readZuluFile`** in `electron/ipc/handlers/zulu-handlers.ts`:

1. Reads file as `Buffer` (binary).
2. Scans first 200 bytes for `encoding="..."` in the XML declaration. If found, decodes with that encoding.
3. Tries UTF-8 first.
4. If result contains `\uFFFD`, re-decodes as Latin-1 (`buffer.toString('latin1')`).

This handles both modern UTF-8 files and legacy Latin-1 files produced by ZuluPad on Windows.

## Import Service (`electron/services/zulu-import-service.ts`)

### File Naming

Page titles are converted to kebab-case file names:

- Lowercased
- Special characters (`<>:"|?*/\`) replaced with hyphens
- Spaces replaced with hyphens
- Multiple hyphens collapsed
- Leading/trailing hyphens stripped
- Falls back to `"untitled"` if empty

### Collision Avoidance

If `nombre.md` already exists (within the same import batch), the filename gets a numeric suffix: `nombre-2.md`, `nombre-3.md`, etc.

### Tag Generation

Three modes, all producing at most one tag per page:

| Mode | Behavior |
|------|----------|
| `none` | No tags |
| `single` | Only single-word titles get a tag; the tag is the full title |
| `all` | Every title gets one tag with the full title |

The tag is always the **full title lowercased** — tags are not split on spaces. Example: `"Sistema de Magia de los Golems"` → tag `sistema de magia de los golems`.

### Line Ending Normalization

ZuluPad content is plain text with `\n` line breaks. To preserve paragraph structure in markdown rendering, each non-empty line gets two trailing spaces (`  `) appended — this triggers markdown's hard line break. Empty lines are left untouched (they serve as paragraph separators).

```typescript
function normalizeContentForMarkdown(content: string): string {
  const lines = content.split(/\r?\n/)
  return lines.map((line) => (line.length > 0 ? `${line}  ` : line)).join('\n')
}
```

### Output Format

Each page becomes a markdown file with YAML frontmatter:

```markdown
---
title: Sistema de Magia de los Golems
tags:
  - sistema de magia de los golems
---
Contenido del artículo...
```

Tags key is only included when tags are present. Title key is always included.

## IPC Contract

All channels defined in `src/shared/ipc.ts`.

| Channel | Direction | Purpose |
|---|---|---|
| `trama:zulu:select-file` | renderer → main | Open native `.zulu` file picker, read file, return content + page count |
| `trama:zulu:import:preview` | renderer → main | Parse content + target folder → return file list with paths |
| `trama:zulu:import` | renderer → main | Parse content + target folder + tag mode → write markdown files |

### Schemas

```typescript
// Select file
ZuluSelectFileResponse = { filePath: string, content: string, pageCount: number }

// Preview
ZuluImportPreviewFile = { title: string, path: string, tagCount: number, exists: boolean }
ZuluImportPreviewResponse = { files: ZuluImportPreviewFile[], totalFiles: number }

// Import
ZuluImportRequest = { content: string, targetFolder: string (default 'lore/'), tagMode: 'none' | 'single' | 'all', projectRoot: string }
ZuluImportResponse = { success: boolean, created: string[], errors: Array<{ path: string, error: string }> }
```

## IPC Handlers (`electron/ipc/handlers/zulu-handlers.ts`)

**`handleZuluSelectFile`** — Opens Electron native file dialog filtered to `.zulu`, reads file with encoding detection, parses to get page count, returns envelope.

**`handleZuluImportPreview`** — Validates payload with `zuluImportPreviewRequestSchema`, calls `previewZuluImport` service, returns envelope.

**`handleZuluImport`** — Validates payload with `zuluImportRequestSchema`, calls `executeZuluImport` service with projectRoot resolution, returns envelope.

## File Map

### Main process
- `electron/ipc.ts` — registers `registerZuluHandlers(ipcMain)`
- `electron/ipc/handlers/zulu-handlers.ts` — `handleZuluSelectFile`, `handleZuluImportPreview`, `handleZuluImport`
- `electron/ipc/handlers/index.ts` — re-exports zulu handlers
- `electron/services/zulu-import-service.ts` — `previewZuluImport`, `executeZuluImport`

### Renderer / Preload
- `electron/preload.cts` — exposes `tramaApi.zuluSelectFile`, `tramaApi.zuluImportPreview`, `tramaApi.zuluImport`
- `src/types/trama-api.d.ts` — type declarations for zulu APIs

### Shared
- `src/shared/ipc.ts` — channel constants, Zod schemas, types
- `src/shared/zulu-parser.ts` — XML parser, `ZuluPage` interface

### Renderer UI
- `src/features/project-editor/use-zulu-import.ts` — import hook (select/preview/execute states)
- `src/features/project-editor/components/zulu-import-dialog.tsx` — modal portal + lifecycle
- `src/features/project-editor/components/zulu-import-dialog-body.tsx` — form, preview, actions
- `src/features/project-editor/components/sidebar/sidebar-transfer-content.tsx` — "Import ZuluPad File" button
- `src/features/project-editor/project-editor-view.tsx` — wires `useZuluImport` hook
- `src/features/project-editor/project-editor-dialogs.tsx` — registers `ZuluImportDialog`

## UI Flow

1. User opens sidebar → Transfer section → clicks "Import ZuluPad File"
2. Native file picker opens (filter: `.zulu`)
3. Dialog shows: source file path, page count, target folder input (default `lore/`), tag mode selector
4. "Preview" button → calls `zuluImportPreview` IPC → shows file list with target paths and tag counts
5. "Import" button → calls `zuluImport` IPC → creates markdown files on disk
6. Dialog closes. Index reconciliation happens via Chokidar watcher (external file events).

## Related Docs

- `docs/spec/zulu.md` — `.zulu` file format specification
