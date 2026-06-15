# Relationships Document Architecture

Goal: document the renderer-side relationships-chart subsystem that replaces the rich markdown surface for `type: relationships` files while preserving Trama's existing pane/meta/save contracts.

## Why This Exists

Relationships charts are standard markdown files whose behavior is driven by frontmatter `type: relationships` plus `relationshipsConfig`. They reuse the map-document architecture (meta-only pane edits, pan/zoom viewport, context-menu interactions) but add a graph layer: nodes (characters) connected by typed, colored, directional edges, plus reusable edge presets.

## Data Model

```yaml
type: relationships
name: Character Relationships
relationshipsConfig:
  nodes:
    - id: aldren            # unique slug, generated from the label on creation
      x: 600                # stage coordinates (fixed 2400x1600 logical canvas)
      y: 300
      label: "Aldren"
      destinationTag: "aldren"   # optional wiki tag; click navigates like map markers
      color: "#e74c3c"
      description: "The King."   # optional hover tooltip
  edges:
    - from: aldren          # node id
      to: cael              # node id
      label: "sent on quest" # optional, rendered at the edge midpoint
      color: "#3498db"
      style: solid          # solid | dashed | dotted
      direction: forward    # forward | both | none
  edgePresets:              # reusable relationship types, applied from the edge dialog
    - name: Allies
      color: "#2ecc71"
      style: solid
      direction: both
```

- Edges reference nodes by `id`, not by tag, so a node can exist without a tag and tags can change freely.
- `getRelationshipsConfig()` drops edges whose endpoints are missing or identical, and normalizes unknown styles/directions/colors to defaults.
- New documents are seeded with four default presets (Family, Allies, Enemies, Romance).

## End-to-End Data Flow

### Chart creation from the sidebar

1. `SidebarFooterActions` exposes `Create relationships chart` behind the `+ Article` split-button chevron (next to `Create map`).
2. `SidebarCreateDialog` opens in `relationships` mode and asks for folder and name only (no image).
3. The renderer calls `createRelationshipsDocument(path, name)`.
4. `documentRepository.createRelationshipsDocument()` writes the markdown file with `type: relationships`, empty `nodes`/`edges`, and the default `edgePresets`.
5. The normal open-project incremental refresh path selects the new file.

### Chart editing

Same contract as maps: `EditorPanel` switches on `editorMeta.type === 'relationships'` and renders `RelationshipsEditor`, which edits **meta only** via `onMetaChange(...)` → `updateEditorMeta(...)`. The markdown body is untouched; the existing pane save/revert flow persists frontmatter.

## Editor Interactions

- **Pan/zoom**: identical to the map editor (drag background, wheel zoom 0.25x–4x). Never marks the pane dirty.
- **Add character**: right-click empty stage → `Add a character` → node dialog (name, optional tag, color, description). Node `id` is a uniqueness-suffixed slug of the label.
- **Move character**: left-drag a node (4px threshold distinguishes drag from click); position commits to meta on pointer-up.
- **Navigate**: plain click on a node resolves `destinationTag` through the tag index and opens the document (secondary pane in split mode), exactly like map markers. Missing/unset tags show a transient notice.
- **Add relationship**: right-click a node → `Add relationship` enters linking mode (crosshair cursor, HUD hint); clicking a second node opens the edge dialog with from/to prefilled. Escape or clicking the background cancels.
- **Edit/delete**: right-click a node or an edge line for context-menu edit/delete. Deleting a node also deletes its edges.
- **Presets**: the edge dialog offers an `Apply a preset...` select (fills color/style/direction and default label) and a `Save as reusable preset` checkbox that stores the current edge styling under a name (same-name presets are replaced).

## Rendering

- Nodes are absolutely-positioned HTML pill buttons (`relationships-nodes-layer.tsx`), so labels are always visible.
- Edges are an SVG layer under the nodes (`relationships-edges-layer.tsx`): quadratic paths with dash arrays for styles, a wide transparent hit path for right-click targeting, and the label at the curve midpoint.
- Arrowheads render in a second SVG layer above the node pills (`RelationshipsEdgeMarkersLayer` in `relationships-edges-layer.tsx`) so bidirectional markers stay visible when nodes overlap the line ends.
- Parallel edges between the same pair bow out on alternating sides (`getParallelEdgeIndex` + `buildEdgeGeometry`).
- Edge endpoints are shortened to the pill border using label-width estimates (`estimateNodeHalfExtents` + `anchorOnNodeBoundary`), not a fixed radius.

## File Map By Responsibility

| File | Role |
|------|------|
| `src/features/project-editor/pane/editor-panel.tsx` | Document-type switch including `relationships` |
| `src/features/project-editor/pane/relationships-editor/relationships-editor.tsx` | Pan/zoom, node drag, linking mode, context menus, dialog orchestration |
| `src/features/project-editor/pane/relationships-editor/relationships-editor-types.ts` | Node/edge/preset/config interfaces |
| `src/features/project-editor/pane/relationships-editor/relationships-config-serialization.ts` | `relationshipsConfig` normalization and meta write-back |
| `src/features/project-editor/pane/relationships-editor/relationships-editor-helpers.ts` | Node id slugs, edge geometry, dash arrays, stage constants; re-exports map clamping/tag helpers |
| `src/features/project-editor/pane/relationships-editor/relationships-nodes-layer.tsx` | Node pill overlay and tooltips |
| `src/features/project-editor/pane/relationships-editor/relationships-edges-layer.tsx` | SVG edge rendering with arrow markers |
| `src/features/project-editor/pane/relationships-editor/relationships-node-dialog.tsx` | Character create/edit modal |
| `src/features/project-editor/pane/relationships-editor/relationships-edge-dialog.tsx` | Relationship create/edit modal with preset apply/save |
| `src/features/project-editor/components/sidebar/sidebar-footer-actions.tsx` | Split-button menu entry |
| `src/features/project-editor/sidebar-file-actions/private/file-create.ts` | `createRelationships` action |
| `electron/ipc/handlers/project-handlers/relationships-document-handler.ts` | `createRelationshipsDocument` IPC handler |
| `electron/services/document-repository.ts` | Writes the initial relationships markdown with default presets |
| `src/shared/ipc.ts` | `'relationships'` meta type plus create-request schema |
| `tests/relationships-editor-helpers.test.ts` | Config parsing/normalization, slug ids, edge geometry indexes |
| `tests/relationships-document-create-repository.test.ts` | Repository coverage for initial chart frontmatter |
| `example-fantasy/lore/relationships.md` | Working example chart |

## Focused Tests

```bash
npm run test -- tests/relationships-editor-helpers.test.ts tests/relationships-document-create-repository.test.ts tests/ipc-contract.test.ts tests/sidebar-panels.test.ts
```
