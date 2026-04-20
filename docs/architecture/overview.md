# Architecture Overview

> **Last updated:** 2026-04-19

This document provides a cross-cutting summary of Trama's architecture. For subsystem-specific details, see individual files in this folder.

---

## System Layers

```
┌─────────────────────────────────────────────────────┐
│  Renderer (Preact + TypeScript)                      │
│  ├── Project Editor (sidebar, workspace, panels)     │
│  ├── Rich Markdown Editor (Quill integration)       │
│  └── Hooks & state management                       │
└─────────────────────────────────────────────────────┘
                        │ IPC (context-bridge)
                        ▼
┌─────────────────────────────────────────────────────┐
│  Main Process (Electron)                            │
│  ├── IPC handlers (document, folder, index, AI)    │
│  ├── Services (document repo, index, watcher)       │
│  └── Native APIs (spellcheck, dialogs, clipboard)   │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  Filesystem (project root)                          │
│  ├── Markdown files (book/, outline/, lore/)        │
│  └── .trama.index.json (corkboard order, meta cache)│
└─────────────────────────────────────────────────────┘
```

---

## Core Invariants

1. **IPC channel names live only in `src/shared/ipc.ts`** — no hardcoded strings elsewhere.
2. **All IPC handlers return envelope responses** — `{ ok: true, data: ... }` or `{ ok: false, error: ... }`.
3. **Sidebar paths are section-relative**; IPC calls use project-relative paths. Conversion boundary is `sidebar-panel-body.tsx`.
4. **Preload API surface** (`electron/preload.cts`) must match `src/types/trama-api.d.ts`.
5. **Workspace commands travel via `WORKSPACE_CONTEXT_MENU_EVENT`** CustomEvent — never bypass this bridge.

---

## Key Subsystems

### IPC Layer (`docs/architecture/ipc-architecture.md`)

Thin registration layer in `electron/ipc.ts` delegates to handler modules in `electron/ipc/handlers/`. Runtime state (active project root, services) lives in `electron/ipc-runtime.ts`.

Adding a new endpoint:
1. Define channel + schemas in `src/shared/ipc.ts`
2. Implement handler in `electron/ipc/handlers/...`
3. Register in `electron/ipc.ts`
4. Expose preload method in `electron/preload.cts`
5. Extend typings in `src/types/trama-api.d.ts`

### Project Index (`docs/architecture/project-index-architecture.md`)

`.trama.index.json` provides custom file ordering (`corkboardOrder`) and frontmatter cache (`cache`). Reconciliation runs on every file mutation (create, save, rename, delete, move). Internal writes are marked to prevent watcher-triggered loops.

**Key risk:** `corkboardOrder` has dual path scoping — reconciliation writes project-relative keys and document-ID values; drag-drop reorder writes section-relative keys and file-path values. Reorder state is ephemeral and may not be consumable by ID-based readers until reconciliation runs.

### Sidebar (`docs/architecture/sidebar-architecture.md`)

Multi-section panel (Manuscript/Outline/Lore) sharing tree-building logic. Path scoping is the most critical invariant: sidebar tree uses section-relative paths; filesystem IPC calls use project-relative paths.

Conversion functions (`sidebar-path-scoping-model.md`):
- `getScopedFiles()` — strips section root → sidebar paths
- `makeRootPath()` — prepends section root → IPC paths

Tree building (`tree-building-and-implicit-folders.md`) derives folders from file path segments. Explicit empty folders use trailing slash notation.

Expanded folder state survives tree changes via path validation + root fallback.

### Rich Editor (`docs/architecture/rich-markdown-editor-core-architecture.md`)

Quill-based rich text editor with custom blot extensions for layout directives (center/spacer/pagebreak). Markdown parses to Quill HTML via `marked`; serialization uses Turndown service with a custom rule for directive nodes.

**Critical Quill rule:** `quill.getText()` omits embeds; Quill document indexes count embeds as length `1`. Always map plain-text offsets through Delta ops before calling `getBounds` or selection APIs.

**Sync loop prevention:** `isApplyingExternalValueRef` flag blocks text-change handler when applying external values.

### Split Pane (`docs/architecture/split-pane-coordination.md`)

Two-layer state model:
- **Layout layer** (synchronous): `WorkspaceLayoutState` — which pane gets which file, active pane
- **Document layer** (asynchronous): `PaneDocumentState` per pane — path, content, isDirty

**All pane-targeted actions should pass explicit pane identity** — `updateEditorValue(value, pane?)`, `saveNow(pane?)`. Both parameters are optional; when omitted, they fall back to `activePane`. Explicit routing avoids race conditions when the secondary editor's `onChange` fires while `activePane` still points at primary.

### Focus Mode (`docs/architecture/focus-mode-architecture.md`)

Hybrid rendering: CSS Highlights API primary, geometric overlay fallback. Three scopes — `line`, `sentence` (inline), `paragraph` (block emphasis only). Sidebar auto-collapses and locks during focus.

Focus mode state (`focusModeEnabled`) is preserved through startup normalization. The `normalizeWorkspaceLayoutState` function uses `?? false` which only defaults to `false` when the value is `undefined` or `null` — a persisted `true` is kept. Tests confirm this behavior: `focus-mode-scope.test.ts` "preserves focusModeEnabled true through normalization".

### Wiki Tag Links (`docs/architecture/wiki-tag-links-architecture.md`)

Tag-based lookup system: lore file frontmatter tags → `TagIndexService` → renderer cache → editor overlay on `Ctrl` hold.

**Critical Quill indexing rule:** plain-text offsets are NOT Quill document indexes. Tags inside embeds throw off `getBounds()`. Always map through Delta ops.

Three known failure modes: stale index after save (fixed by rebuilding in write flows), Ctrl/Cmd click race (fixed by modifier state in click path), underline offset drift (fixed by `quill.container` coordinate reference).

### AI Import/Export (`docs/architecture/ai-import-export-architecture.md`)

Clipboard-based file transfer using `=== FILE: path ===` delimited format. Import: parser → preview UI → execute (replace/append modes). Export: file selection → format → clipboard write.

Path validation blocks traversal, reserved names, and invalid characters. Both services operate within project root boundaries.

### Spellcheck (`docs/architecture/spellcheck-architecture.md`)

Electron session API controlled via IPC. `spellcheckEnabled` passed to Quill init but **not in the dependency array** — prevents editor re-init on toggle. `useSyncSpellcheckEnabled` handles all post-mount toggles.

Optimistic UI with rollback on IPC failure. macOS language selection is OS-controlled (`supportsLanguageSelection: false`).

### Book Export (`docs/architecture/book-export-architecture.md`)

Multi-format pipeline: PDF (pdf-lib with Unicode font embedding), DOCX (docx package), EPUB (epub-gen), HTML (marked), Markdown (concatenation).

Layout directives (center/spacer/pagebreak) are parsed during export and translated to format-specific operations. Image handling: data URLs decoded directly, local paths resolved against project root.

---

## Data Flow Summary

```
Project open
  → handleOpenProject → scan filesystem → reconcileIndex
  → TagIndexService.buildIndex
  → snapshot sent to renderer
  → sidebar tree built from section-relative paths

File select
  → workspaceLayout updated (sync)
  → pane document loads (async)
  → editor content rendered

File save
  → IPC: trama:document:save
  → DocumentRepository.save
  → reconcileActiveProjectIndex (rebuilds corkboardOrder + cache)
  → TagIndexService.rebuild (if tags may have changed)
  → watcher marked internal to suppress re-event

Drag-drop reorder
  → IPC: trama:index:reorder (section-relative keys + values)
  → persisted to .trama.index.json
  → overwritten on next reconciliation

External file change
  → watcher detects → classifies internal/external
  → external events forwarded to renderer
  → renderer triggers project re-open
```

---

## Architectural Debt

| Issue | Impact | Mitigation |
|-------|--------|------------|
| `corkboardOrder` dual path scoping | Reorder state lost on reconcile; ID-based readers may not find reorder-persisted order | Known; reorder currently ephemeral until reconciliation |
| Split-pane `isDirty` projection | Uses active pane's document state only; both panes dirty simultaneously is allowed but guard only protects active | Design decision per split-pane contract docs |
| Tag index stale after save | Fixed for in-process saves; external changes still require project re-open | `externalFileEvent` IPC triggers re-fetch on renderer |

---

## Related Documents

- `docs/START-HERE.md` — documentation entry point and fast routing
- `docs/live/current-status.md` — implemented vs pending features
- `docs/live/file-map.md` — file ownership and where to edit
- `docs/lessons-learned/README.md` — accumulated lessons from bugs and fixes
- `docs/dev-workflow.md` — build/test/checklist rules