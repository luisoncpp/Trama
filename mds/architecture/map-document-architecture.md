# Map Document Architecture

Goal: document the renderer-side map document subsystem that replaces the rich markdown surface for `type: map` files while preserving Trama's existing pane/meta/save contracts.

## Why This Exists

Map documents are not a second file format. They are standard markdown files whose behavior is driven by frontmatter `type: map` plus `mapConfig`. The subsystem needs its own architecture doc because it spans more than 3 files and depends on a non-obvious rule: the renderer must update pane `meta` directly for marker edits instead of trying to encode frontmatter changes into the editor body string.

## End-to-End Data Flow

### Map creation from the sidebar

1. `SidebarFooterActions` exposes `Create map` behind the `+ Article` split-button chevron.
2. `SidebarCreateDialog` opens in `map` mode and asks for folder, name, and map image.
3. The image is chosen through IPC `selectMapImage`, so the renderer never reads arbitrary filesystem paths directly.
4. The renderer calls `createMapDocument(path, name, sourceImagePath)`.
5. `documentRepository.createMapDocument()` copies the chosen source image into `res/` using a collision-safe file name.
6. The repository writes the markdown file with frontmatter:
   - `type: map`
   - `name: <user supplied name>`
   - `mapConfig.backgroundImage: res/...`
   - `mapConfig.markers: []`
7. The normal open-project incremental refresh path selects the new markdown file in the sidebar/editor.

### Map editing after creation

1. Project open or file selection reads markdown through `documentRepository.readDocument()`.
2. Main process parses YAML frontmatter and returns `{ content, meta }` separately.
3. `PaneWorkspace.loadPaneDocument()` stores markdown body in `content` and frontmatter in `meta`.
4. `EditorPanel` checks `editorMeta.type`.
5. Rich documents render `RichMarkdownEditor`; map documents render `MapEditor`.
6. `MapEditor` reads `meta.mapConfig`, renders image + markers, and updates only `meta` via `actions.updateEditorMeta(...)`.
7. Existing pane save flow persists current pane `content` plus current pane `meta` through `saveDocument(path, content, meta)`.
8. `documentRepository.saveDocument()` recombines both parts through `serializeMarkdownWithFrontmatter()`.

## Core Invariant

Map marker edits are meta-only pane edits.

- Do not inject YAML frontmatter into the renderer `editorValue`.
- Do not create a second save pipeline for maps.
- Mark the pane dirty by mutating pane `meta` in `PaneWorkspace` and let the existing save/revert flows handle persistence.
- Map creation is a main-process-owned filesystem operation: the renderer may choose the source image, but only Electron copies it into `res/` and writes the markdown file.

## Renderer Structure

### `EditorPanel` switch

- `src/features/project-editor/pane/editor-panel.tsx`
- Uses `props.editorMeta.type === 'map'` as the document-type switch.
- Passes `projectRoot`, `editorMeta`, current `layoutMode`, and pane-targeted navigation/meta callbacks into `MapEditor`.

### `MapEditor`

- `src/features/project-editor/pane/map-editor/map-editor.tsx`
- Owns local ephemeral view state only:
  - `scale`
  - `offset`
  - transient notice/context menu/dialog state
- Pan/zoom never touch pane dirty state.
- Marker create/edit/delete rebuilds `meta.mapConfig.markers` and calls `onMetaChange(...)`.

### `map-editor-helpers.ts`

- `src/features/project-editor/pane/map-editor/map-editor-helpers.ts`
- Canonical parser/normalizer for `meta.mapConfig`.
- Guards against malformed marker entries from user-edited YAML.
- Resolves project-local `res/...` paths to Base64 data URLs via IPC `readImageFile` for secure `<img>` rendering.
- Resolves marker destination tags through the renderer tag index.

### `map-markers-layer.tsx`

- Presentational overlay for positioned marker buttons and hover tooltips.
- Keeps marker DOM separate from pan/zoom logic.

### `map-marker-dialog.tsx`

- Modal for create/edit marker fields.
- Uses the same modal styling family as sidebar/import dialogs for consistency.

## Pane and Navigation Contracts

Map documents still obey split-pane rules from `mds/architecture/split-pane-coordination.md`.

- Marker navigation never infers a pane from incidental focus.
- `MapEditor` receives current `layoutMode` and current `pane`.
- In split mode, marker navigation targets `secondary`.
- In single mode, marker navigation targets the current pane.

## Save / Revert Behavior

- Meta-only edits call `updateEditorMeta(meta, pane)`.
- `PaneWorkspace.updatePaneMetaForPane()` sets the pane `meta` and marks it dirty.
- `saveNow()` persists the unchanged markdown body plus updated frontmatter.
- `revertChanges()` reloads from disk and restores both content and `meta`.

## Tag Resolution Rule

Map marker navigation reuses the same renderer tag index contract as wiki-tag links.

- `destinationTag` is normalized to lowercase before lookup.
- Duplicate tag behavior remains defined by `TagIndexService`.
- Missing tags do not navigate; `MapEditor` shows a transient notice.

## File Map By Responsibility

| File | Role |
|------|------|
| `src/features/project-editor/pane/editor-panel.tsx` | Document-type switch between rich editor and map editor |
| `src/features/project-editor/components/sidebar/sidebar-footer-actions.tsx` | Split-button create affordance (`+ Article` default + chevron menu for `Create map`) |
| `src/features/project-editor/components/sidebar/sidebar-create-dialog.tsx` | Shared create modal with map-image browse field in `map` mode |
| `src/features/project-editor/components/sidebar/sidebar-dialog-hooks.ts` | Sidebar create-dialog state plus IPC-backed map-image browse action |
| `src/features/project-editor/pane/map-editor/map-editor.tsx` | Pan/zoom, marker interactions, context menu, dialog orchestration |
| `src/features/project-editor/pane/map-editor/map-editor-helpers.ts` | `mapConfig` normalization, asset URL resolution, tag lookup helpers |
| `src/features/project-editor/pane/map-editor/map-markers-layer.tsx` | Marker overlay rendering and tooltips |
| `src/features/project-editor/pane/map-editor/map-marker-dialog.tsx` | Marker create/edit modal |
| `src/features/project-editor/workspace-actions.ts` | New `updateEditorMeta(...)` pane action |
| `src/features/project-editor/pane/pane-workspace.ts` | `updatePaneMetaForPane(...)` dirty-tracked meta mutation |
| `electron/ipc/handlers/project-handlers/document-handlers.ts` | `createMapDocument` and `selectMapImage` IPC handlers |
| `electron/services/document-repository.ts` | Copies selected source image into `res/` and creates map markdown with empty markers |
| `src/shared/ipc.ts` | Adds map-create/map-image-picker IPC payloads plus `'map'` document meta type |
| `tests/map-editor-helpers.test.ts` | Pure helper coverage for map config parsing and tag resolution |
| `tests/map-document-create-repository.test.ts` | Repository coverage for image copy + initial empty-marker map frontmatter |
| `tests/pane-workspace.test.ts` | Meta-only pane dirty update coverage |

## Debug Playbook

1. Map file opens as rich editor instead of map:
   - Check `meta.type` from `readDocument()` response.
   - Check `EditorPanel` type switch.
2. Marker edits do not mark pane dirty:
   - Check `actions.updateEditorMeta(...)` wiring in `PaneEditor` / `WorkspaceEditorPanels`.
   - Check `PaneWorkspace.updatePaneMetaForPane()`.
3. Marker click opens wrong pane:
   - Check `layoutMode` passed into `MapEditor`.
   - Check pane target passed to `openFileInPane(...)`.
4. Map image does not render:
   - Check `mapConfig.backgroundImage` is project-relative under `res/`.
   - Check IPC `readImageFile` response structure.
   - Check missing SVG `width` or `height` attributes (SVGs missing dimensions collapse when rendered as data URLs).
5. Tag exists in YAML but marker cannot navigate:
   - Check normalized lookup key in renderer tag index.
   - Re-run tag index regression tests if the issue is not map-specific.
6. New map creation succeeds but image is missing:
   - Check `createMapDocument` returned `imagePath` under `res/`.
   - Check source file extension and collision-safe `res/...` destination naming in `documentRepository.createMapDocument()`.
   - Check the dialog picked a real file path through `selectMapImage`.

## Focused Tests

```bash
npm run test -- tests/ipc-contract.test.ts tests/pane-workspace.test.ts tests/map-editor-helpers.test.ts tests/map-document-create-repository.test.ts tests/sidebar-panels.test.ts
npm run build
```
