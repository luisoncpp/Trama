# Phase 4 Detailed Plan - Knowledge Graph & Authoring Tools

Date: 2026-04-11
Status: **In Progress** — Planning phase
Related: `docs/current-status.md`, `docs/dev-workflow.md`, `docs/wiki-tag-links-spec.md`, `docs/wiki-tag-links-implementation-plan.md`, `REQUIREMENTS.md`

## 1. Context and Starting Point

Phase 3 is complete and stable. The project has:
- Full split-pane workspace with persistence.
- Theme system (light/dark/system) with WCAG AA compliance.
- Fullscreen and Scrivener-style focus mode with scope dimming.
- Rich markdown editor with typography auto-replace, find overlay, and paste-markdown.
- Sidebar with hierarchical tree, filter, create actions, and file context menus.
- Conflict-safe external change handling (reload/keep/compare/save-as-copy).
- Typed IPC contracts, Zod validation, and file watcher integration.
- Green quality gates (`build`, `lint`, `test`, `test:smoke`).
- Test runner script (`scripts/run-tests.ps1`) for reliable execution in all environments.

This means Phase 4 can focus on knowledge graph features (wiki tag links), authoring tools (templates, corkboard), and operational improvements (folder operations, AI pipeline).

## 2. Phase 4 Goal

Deliver a production-ready knowledge graph and authoring experience:
- **Wiki tag links**: implicit tag-based lookup from Lore frontmatter, Ctrl+click navigation.
- **Folder operations**: rename, delete, and move workflows.
- **Templates**: create documents from predefined schemas (character, location, scene).
- **Corkboard**: drag-and-drop card view for planning scenes/ideas.
- **AI import/export pipeline**: structured clipboard import from LLM output, structured export for AI context.

Definition of Done target:
- User can define tags in Lore frontmatter and click matching terms in any editor to open associated articles.
- User can rename/delete/move folders in the sidebar with full safety checks.
- User can create documents from templates with pre-filled frontmatter.
- User can view and rearrange scenes on a corkboard via drag-and-drop.
- User can import structured LLM output and export project content for AI context.
- All Phase 3 behaviors remain intact (no regressions).
- Feature set is covered by tests and quality gates pass.

## 3. Scope

### In Scope

- Wiki tag links: TagIndexService, IPC contracts, editor overlay, Ctrl+click navigation.
- Folder rename/delete/move: IPC endpoints, sidebar UI, conflict safety.
- Template system: template files, create-from-template dialog, frontmatter scaffolding.
- Corkboard view: card rendering, drag-and-drop reordering, persistence.
- AI import/export: structured clipboard parsing, multi-file creation, structured export format.

### Out of Scope (Phase 5+)

- Full knowledge graph visualization (node/edge graph view).
- Bidirectional/backlinks panel.
- Real-time collaboration.
- Custom theme editor.
- Performance optimization (incremental index scans, virtualized tree).

## 4. Technical Baseline and Constraints

Current architecture to preserve:
- Renderer feature-centric editor module in `src/features/project-editor/*`.
- Typed IPC contracts in `src/shared/ipc.ts` and preload typing in `src/types/trama-api.d.ts`.
- Main-process orchestration through `electron/ipc.ts` with modular handlers.
- Window security baseline from `electron/window-config.ts`.
- Per-pane editor state model (`primaryPane`/`secondaryPane`).
- Tag-based wiki link specification in `docs/wiki-tag-links-spec.md`.

Known constraints:
- `sandbox: false` remains a temporary tradeoff; do not increase renderer attack surface.
- `max-lines: 200` and `max-lines-per-function: 50` lint rules are enforced.
- Tag links are **implicit** (no `[[...]]` markup) — matching is against plain text in the editor.
- Tags are unique to a single Lore file; longest-match-wins resolution strategy.

## 5. Workstreams and Deliverables

---

## WS1 - Wiki Tag Links

**Objective**: Implement tag-based implicit wiki link system as specified in `docs/wiki-tag-links-spec.md`.

**Status**: Not started.

### Deliverables

1. **TagIndexService** (main process)
   - Build `Map<string, string>` of `lowercaseTag → filePath` on project scan.
   - Incremental updates on file save/create/delete/watcher events.
   - `getTagIndex()` and `resolveTag(tagText, fromPath)` methods.
   - Longest-match-first resolution.
   - Duplicate tag detection with warning logging.

2. **IPC Contract**
   - `getTagIndex` channel: returns `{ tags: Record<string, string> }`.
   - `resolveTag` channel: accepts `{ tag: string }`, returns `{ found: boolean, path?: string, meta?: DocumentMeta }`.
   - Zod schemas for validation.

3. **Renderer Tag Cache**
   - Hook: `use-tag-index.ts` — fetch, cache, invalidate on project open and watcher events.

4. **Editor Integration**
   - Tag overlay decorator: scans visible text nodes for tag matches.
   - CSS class `trama-tag-link` applied only while Ctrl is held.
   - Ctrl+click opens associated Lore file in secondary pane (or primary if not in split).
   - Auto-enable split mode if clicking a tag with no secondary pane.
   - Tags inside code blocks/inline code are excluded.
   - Visual styling for dark/light themes.

5. **Edge Cases**
   - Duplicate tags across files → first alphabetically by path wins, warning logged.
   - Tag target deleted/renamed → toast notification, no pane navigation.
   - Tags inside headers/bold/italic are matched.

### Files to Create

| File | Purpose |
|------|---------|
| `electron/services/tag-index-service.ts` | Build and maintain tag → filePath map |
| `src/features/project-editor/use-tag-index.ts` | Renderer hook: fetch, cache, invalidate tag index |
| `src/features/project-editor/components/rich-markdown-editor-tag-overlay.ts` | Tag detection decorator for Quill editor |
| `src/features/project-editor/components/rich-markdown-editor-tag-helpers.ts` | Pure functions: match text against tags, longest-match resolution |
| `tests/tag-index-service.test.ts` | Main process tag index unit tests |
| `tests/tag-matching.test.ts` | Longest-match, case-insensitivity, code-block exclusion tests |
| `tests/tag-click-navigation.test.ts` | Ctrl+click opens file in secondary pane integration tests |

### Files to Modify

| File | Change |
|------|--------|
| `src/shared/ipc.ts` | Add `getTagIndex` and `resolveTag` channels + Zod schemas |
| `electron/ipc/handlers/` | Wire tag index rebuild on save/create/delete |
| `electron/preload.cts` | Expose `getTagIndex()` and `resolveTag()` to `window.tramaApi` |
| `src/types/trama-api.d.ts` | Add new API type signatures |
| `electron/services/frontmatter.ts` | Extract `tags` array during parse |
| `electron/services/watcher-service.ts` | Trigger tag index rebuild on Lore file changes |
| `src/features/project-editor/components/rich-markdown-editor.tsx` | Import tag overlay decorator |
| `src/features/project-editor/components/rich-markdown-editor-core.ts` | Register Ctrl+click listener for tag navigation |

### Acceptance Criteria

1. User adds `tags: [magia, norte]` to a Lore file's frontmatter.
2. User types `magia` in any editor pane.
3. Holding `Ctrl` underlines `magia` in the text.
4. Clicking `magia` while holding `Ctrl` opens the Lore file in the secondary pane.
5. Tag with `norte salvaje` takes precedence over `norte` when both match.
6. Tags inside code blocks are ignored.
7. Tag index rebuilds automatically when Lore files are saved, created, or deleted.
8. All new files pass lint, test, and build.

### Tests

- `tests/tag-index-service.test.ts`: build, update, resolve, duplicate detection.
- `tests/tag-matching.test.ts`: longest-match-first, case insensitivity, word boundaries, code-block exclusion.
- `tests/tag-click-navigation.test.ts`: Ctrl+click opens in correct pane, auto-split, invalid tag toast.

---

## WS2 - Folder Operations (Rename/Delete/Move)

**Objective**: Complete file-tree operations for folders, extending the existing file rename/delete/create infrastructure.

**Status**: Not started.

### Deliverables

1. **Folder Rename**
   - IPC endpoint: `trama:folder:rename` with `{ oldPath: string, newName: string }`.
   - Updates `.trama.index.json` entries for all files within the renamed folder.
   - Sidebar tree updates reflect new folder name.
   - External file watcher handles the move gracefully.

2. **Folder Delete**
   - IPC endpoint: `trama:folder:delete` with `{ path: string }`.
   - Confirmation prompt: `"Delete folder and all X files inside?"`.
   - Removes all contained files from `.trama.index.json`.
   - If any contained file is dirty (unsaved), prompt: `"X unsaved files will be lost. Continue?"`.

3. **Folder Move (Drag to Reparent)**
   - Sidebar drag-and-drop to move folders.
   - IPC endpoint: `trama:folder:move` with `{ sourcePath: string, targetParentPath: string }`.
   - Updates all contained file paths in `.trama.index.json`.

### Files to Create

| File | Purpose |
|------|---------|
| `electron/ipc/handlers/folder-handlers.ts` | Folder rename/delete/move IPC handlers |
| `src/features/project-editor/components/sidebar/sidebar-folder-context-menu.tsx` | Right-click folder menu (Rename, Delete) |
| `src/features/project-editor/components/sidebar/sidebar-folder-dnd.tsx` | Drag-and-drop folder reordering |
| `tests/folder-operations.test.ts` | Folder rename/delete/move unit tests |
| `tests/folder-dnd.test.ts` | Drag-and-drop folder move integration tests |

### Files to Modify

| File | Change |
|------|--------|
| `src/shared/ipc.ts` | Add folder rename/delete/move channels + Zod schemas |
| `electron/preload.cts` | Expose folder operations to `window.tramaApi` |
| `src/types/trama-api.d.ts` | Add folder operation type signatures |
| `electron/services/repo-service.ts` | Add folder rename/delete/move filesystem operations |
| `electron/services/watcher-service.ts` | Handle folder move events |
| `electron/services/index-service.ts` | Update index entries on folder path changes |
| `src/features/project-editor/components/sidebar/sidebar-tree.tsx` | Add drag-and-drop support |
| `src/features/project-editor/components/sidebar/sidebar-rail-icons.tsx` | Add folder context menu trigger |

### Acceptance Criteria

1. Right-click folder → Rename → type new name → folder renames on disk and in sidebar.
2. Right-click folder → Delete → confirmation → folder and all contents removed.
3. Drag folder onto another folder → moves as child.
4. Renaming/moving a folder updates all contained file paths in `.trama.index.json`.
5. Deleting a folder with dirty files prompts warning.
6. All operations pass lint, test, and build.

---

## WS3 - Templates

**Objective**: Allow users to create documents from predefined schemas (character, location, scene) with pre-filled frontmatter.

**Status**: Not started.

### Deliverables

1. **Template Files**
   - Templates stored in `/Plantillas/` folder within project.
   - Default templates bundled: character sheet, location sheet, scene outline.
   - Templates are regular `.md` files with frontmatter placeholders.

2. **Template Placeholders**
   - Special frontmatter keys: `_template: character` (or `location`, `scene`).
   - Placeholders in content: `{{name}}`, `{{description}}`, `{{tags}}` etc.
   - On create, prompt user for placeholder values.

3. **Create-from-Template Dialog**
   - Triggered from sidebar `+` menu or context menu.
   - Shows available templates with icons.
   - Preview of template structure.
   - Fill-in form for placeholders before creating.

4. **Template Management**
   - User can create custom templates via "Save as Template" context menu.
   - Template files excluded from wiki tag link matching.

### Files to Create

| File | Purpose |
|------|---------|
| `electron/services/template-service.ts` | Template parsing, placeholder resolution, file creation |
| `src/features/project-editor/components/sidebar/sidebar-template-dialog.tsx` | Template picker and placeholder form |
| `src/features/project-editor/components/sidebar/sidebar-template-picker.tsx` | Template selection UI in sidebar create menu |
| `example-fantasia/Plantillas/_personaje.md` | Default character template |
| `example-fantasia/Plantillas/_locacion.md` | Default location template |
| `example-fantasia/Plantillas/_escena.md` | Default scene template |
| `tests/template-service.test.ts` | Template parsing and placeholder resolution tests |
| `tests/template-dialog.test.ts` | Template picker UI integration tests |

### Files to Modify

| File | Change |
|------|--------|
| `src/shared/ipc.ts` | Add `getTemplates`, `createFromTemplate` channels + Zod schemas |
| `electron/ipc/handlers/template-handlers.ts` | Template CRUD IPC handlers |
| `electron/preload.cts` | Expose template operations to `window.tramaApi` |
| `src/types/trama-api.d.ts` | Add template operation type signatures |
| `src/features/project-editor/components/sidebar/sidebar-create-dialog.tsx` | Add template option to create menu |
| `electron/services/index-service.ts` | Exclude template files from index |

### Acceptance Criteria

1. User clicks `+` in sidebar → "From Template" → sees template list.
2. User selects "Character" template → fills name/description/tags → file created with populated frontmatter.
3. User can create custom templates via "Save as Template" context menu.
4. Template files are excluded from wiki tag matching.
5. All operations pass lint, test, and build.

---

## WS4 - Corkboard

**Objective**: Provide a card-based drag-and-drop view for planning and reorganizing scenes/ideas.

**Status**: Not started.

### Deliverables

1. **Corkboard View**
   - Toggle between sidebar tree and corkboard view.
   - Cards represent markdown files (scenes, notes, lore).
   - Cards show: title (from frontmatter `nombre` or filename), excerpt (first 100 chars), tags, status.

2. **Drag-and-Drop Reordering**
   - Drag cards to reorder within a section.
   - Drag cards between sections/columns.
   - Visual feedback during drag (drop zone indicators).

3. **Persistence**
   - Card order stored in `.trama.corkboard.json` per section.
   - Restore order on project reopen.
   - Sync with `.trama.index.json` (prune deleted files, add new ones).

4. **Card Actions**
   - Click card → open in editor primary pane.
   - Right-click card → rename, delete, change status.
   - Color-coded labels (user-settable per card).

### Files to Create

| File | Purpose |
|------|---------|
| `src/features/corkboard/corkboard-view.tsx` | Main corkboard layout |
| `src/features/corkboard/corkboard-card.tsx` | Individual card component |
| `src/features/corkboard/corkboard-column.tsx` | Column/section container |
| `src/features/corkboard/corkboard-dnd.ts` | Drag-and-drop logic |
| `src/features/corkboard/corkboard-state.ts` | Corkboard state management and persistence |
| `electron/services/corkboard-service.ts` | Read/write `.trama.corkboard.json` |
| `src/features/project-editor/components/corkboard-toggle.tsx` | Toggle between sidebar and corkboard |
| `tests/corkboard-view.test.ts` | Corkboard rendering and card display tests |
| `tests/corkboard-dnd.test.ts` | Drag-and-drop reordering tests |
| `tests/corkboard-persistence.test.ts` | Order save/restore tests |

### Files to Modify

| File | Change |
|------|--------|
| `src/shared/ipc.ts` | Add `getCorkboard`, `saveCorkboardOrder` channels + Zod schemas |
| `electron/ipc/handlers/corkboard-handlers.ts` | Corkboard IPC handlers |
| `electron/preload.cts` | Expose corkboard operations to `window.tramaApi` |
| `src/types/trama-api.d.ts` | Add corkboard type signatures |
| `src/features/project-editor/project-editor-view.tsx` | Add corkboard toggle alongside sidebar |
| `electron/services/index-service.ts` | Wire corkboard sync with index changes |

### Acceptance Criteria

1. User toggles to corkboard view → sees cards for all files in current section.
2. User drags card to reorder → order persists after restart.
3. User drags card between columns → file moves to new section.
4. Clicking a card opens it in the editor.
5. Deleted files are pruned from corkboard.
6. All operations pass lint, test, and build.

---

## WS5 - AI Import/Export Pipeline

**Objective**: Enable structured import of LLM-generated content and structured export for AI context.

**Status**: In progress (AI import completed, AI export completed).

### Current implementation snapshot

- Completed:
   - Structured parser for clipboard format (`=== FILE: ... ===`).
   - AI import preview + execute services in main process.
   - IPC contracts and handlers for `aiImportPreview`, `aiImport`, and `aiExport`.
   - Renderer import flow with `AiImportDialog` + `useAiImport` hook.
- Pending:
   - Renderer export UX (selection/dialog/clipboard flow).
   - Compilation export flow (single consolidated markdown + options).
   - Dedicated automated tests for AI export/compilation behavior.

### Deliverables

1. **AI Import (Clipboard)**
   - Parse clipboard text in format: `=== FILE: nombre.md ===\n---YAML---\nContenido`.
   - Create/update multiple files from a single clipboard paste.
   - Handle frontmatter extraction and file path resolution.
   - Show preview dialog before creating files.
   - Conflict handling: if file exists, prompt overwrite/skip/rename.

2. **AI Export (Clipboard)**
   - Select files/folders → export to clipboard in same delimited format.
   - Useful for sending project context to LLM chatbots.
   - Options: export all, export selected, export with/without frontmatter.

3. **Compilation Export**
   - Generate single consolidated Markdown document from selected folders.
   - Join content for continuous reading, review, or conversion.
   - Options: include/exclude frontmatter, include table of contents.

### Files to Create

| File | Purpose |
|------|---------|
| `electron/services/ai-import-service.ts` | Parse structured clipboard, create/update files |
| `electron/services/ai-export-service.ts` | Format files into delimited clipboard format |
| `src/features/project-editor/components/ai-import-dialog.tsx` | Import preview and conflict resolution UI |
| `src/features/project-editor/components/ai-export-dialog.tsx` | Export selection and options UI |
| `src/features/project-editor/components/compile-export-dialog.tsx` | Compilation export options |
| `tests/ai-import.test.ts` | Import parsing, conflict handling, file creation tests |
| `tests/ai-export.test.ts` | Export formatting, selection, frontmatter options tests |

### Files to Modify

| File | Change |
|------|--------|
| `src/shared/ipc.ts` | Add `importFromClipboard`, `exportToClipboard`, `compileProject` channels + Zod schemas |
| `electron/ipc/handlers/ai-handlers.ts` | AI import/export IPC handlers |
| `electron/preload.cts` | Expose AI operations to `window.tramaApi` |
| `src/types/trama-api.d.ts` | Add AI operation type signatures |
| `src/shared/workspace-context-menu.ts` | Add import/export commands |

### Progress on planned files

- Already created/modified in current codebase:
   - `electron/services/ai-import-service.ts`
   - `electron/services/ai-export-service.ts`
   - `src/features/project-editor/components/ai-import-dialog.tsx`
   - `electron/ipc/handlers/ai-handlers.ts`
   - `src/shared/ipc.ts`
   - `electron/preload.cts`
   - `src/types/trama-api.d.ts`
- Still pending from this WS:
   - `src/features/project-editor/components/ai-export-dialog.tsx`
   - `src/features/project-editor/components/compile-export-dialog.tsx`
   - Dedicated export/compilation test coverage.

### Acceptance Criteria

1. User copies LLM output in `=== FILE: ===` format → pastes via import dialog → preview shows files → creates all files.
2. Existing files trigger conflict prompt with overwrite/skip/rename options.
3. User selects files → exports to clipboard → paste into LLM chat shows formatted content.
4. Compilation export produces single markdown with optional TOC.
5. All operations pass lint, test, and build.

---

## 6. Proposed Execution Sequence (PR Plan)

**Recommended order**:

1. **PR-1: WS1 - Wiki Tag Links** (foundation for knowledge graph)
   - TagIndexService + IPC + renderer cache.
   - Editor overlay + Ctrl+click navigation.
   - Tests for matching, navigation, edge cases.

2. **PR-2: WS2 - Folder Operations** (prerequisite for corkboard and templates)
   - Folder rename/delete IPC + sidebar context menus.
   - Drag-and-drop folder move.
   - Tests for all operations with conflict safety.

3. **PR-3: WS3 - Templates** (builds on folder operations and create flow)
   - Template files + placeholder system.
   - Create-from-template dialog.
   - Default templates in example project.

4. **PR-4: WS4 - Corkboard** (depends on folder operations for section management)
   - Corkboard view + card rendering.
   - Drag-and-drop reordering.
   - Persistence and sync with index.

5. **PR-5: WS5 - AI Import/Export** (standalone, can be done in parallel with corkboard)
   - Import parser + conflict dialog.
   - Export formatting + compilation.
   - Tests for parsing and formatting.

6. **PR-6: Phase 4 Closure and Docs**
   - Full regression run across all Phase 3 + Phase 4 features.
   - Docs update with final behavior and extension guidance.
   - Explicit Phase 4 completion evidence.

## 7. Risks and Mitigations

**Risk**: Tag matching performance on large documents.
- **Mitigation**: Debounce tag scan on content change; only scan visible viewport; use efficient regex with word boundary assertions.

**Risk**: Quill editor decorator conflicts with existing focus mode overlays.
- **Mitigation**: Tag overlay uses CSS Highlights API (same as focus mode); coordinate priority in `rich-markdown-editor-core.ts`; add combined focus+tag tests.

**Risk**: Corkboard drag-and-drop complexity with existing sidebar DnD.
- **Mitigation**: Use separate DnD implementation per view; corkboard uses its own state model; avoid reusing sidebar tree DnD logic.

**Risk**: AI import creating files outside user intent.
- **Mitigation**: Always show preview dialog before creating; require explicit confirmation; log all import actions.

**Risk**: `.trama.index.json` bloat from folder move operations.
- **Mitigation**: Bulk update index in single transaction; validate all paths post-move; add integrity check.

**Risk**: Monolithic hook growth in `use-project-editor`.
- **Mitigation**: Keep template, corkboard, and AI logic in isolated hooks/modules; enforce `max-lines` and `max-lines-per-function` rules.

## 8. Exit Criteria for Phase 4

Phase 4 is complete when all are true:
- Wiki tag links work end-to-end: tags in frontmatter → implicit matching → Ctrl+click navigation → correct pane.
- Folder rename/delete/move work with full conflict safety and index sync.
- Templates allow creating documents with pre-filled frontmatter from built-in and custom templates.
- Corkboard provides drag-and-drop card view with persistence.
- AI import/export handles structured clipboard format with preview and conflict resolution.
- All Phase 3 behaviors remain intact (split, themes, fullscreen/focus, conflict handling, sidebar).
- Build/lint/test/smoke all pass.
- Documentation reflects the real implementation.

## 9. Immediate Next Step

Start **WS1 - Wiki Tag Links**: implement TagIndexService in main process, add IPC contracts (`getTagIndex`, `resolveTag`), build renderer tag cache hook, and land the editor overlay decorator with Ctrl+click navigation.
