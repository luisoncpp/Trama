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
      x: 600                # stage coordinates (-2400..2400 x -1600..1600 logical canvas)
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
- `destinationTag` is optional on nodes. When set, plain click in Select mode navigates to the tagged lore file (same contract as map markers).
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

### Add character with Auto tag

End-to-end flow when the user right-clicks the stage and chooses **Add a character**:

```
Stage context menu (relationships-editor.tsx)
         │
         ▼
RelationshipsNodeDialog (mode: add, autoTag: true)
  live preview + save via resolveAutoNodeTag(label, tagIndex)
         │
         ▼
saveNodeFromDialog → buildNodeId(label) + destinationTag → updateConfig
         │
         ▼
withRelationshipsConfig(meta, config) → pane save/revert persists frontmatter
```

1. `RelationshipsEditor` receives `tagIndex` from `useTagIndex` (same renderer cache as rich-editor wiki links).
2. `RelationshipsNodeDialog` opens in `mode: 'add'` with **Auto** checked. The tag field is read-only and shows the resolved tag as the user types the name.
3. On save, when **Auto** is on, `resolveAutoNodeTag(label, tagIndex)` normalizes the name (`trim` → `toLowerCase` → strip leading `#`) and returns that string only if it exists as a key in `tagIndex`; otherwise returns `''`.
4. When **Auto** is off, the user-edited tag field is saved as-is (same as edit mode).
5. `buildNodeId(label, existingIds)` assigns the node `id` independently — it slugifies the label and does **not** derive from `destinationTag`. See `mds/lessons-learned/relationships-auto-tag-uses-label-not-slug.md`.
6. Edit character dialog has no **Auto** checkbox; `destinationTag` is always manual.

**Invariants:**
- Auto tag lookup uses the same normalization as `resolveNodeDestination` / map markers, not the node-id slug algorithm.
- Auto is add-only UI state; it is not persisted in frontmatter.
- Missing tag index (`null` / empty) yields no auto tag — the node is saved with `destinationTag: ''`.

## Editor Interactions

- **Toolbar** (`relationships-editor-toolbar.tsx`): three tools — **Select / Move** (default), **Add relationship**, **Remove relationship**. Hidden in read-only preview.
- **Select / Move**: pan/zoom (drag background, wheel zoom 0.25x–4x, never marks dirty); left-drag a node (4px threshold) commits position on pointer-up; plain click navigates via `destinationTag` like map markers.
- **Add relationship**: sub-toolbar lists `edgePresets` plus **Custom…** (opens the edge dialog in template mode to define color/style/direction/label and optionally save a new preset). After a type is chosen, two node clicks create an edge immediately (no dialog); the tool stays active for repeated additions. Escape or background click cancels a pending first node only.
- **Remove relationship**: click an edge line/arrow to delete it; characters remain.
- **Context menu**: right-click stage → add character; node → add relationship (legacy two-click flow opens edge dialog if no toolbar template), edit/delete; edge → edit/delete.
- **Add character dialog** (`relationships-node-dialog.tsx`): **Auto** checkbox (on by default, add mode only). When on, `resolveAutoNodeTag` matches the typed name against `tagIndex`; existing tag → stored as `destinationTag`, no match → empty tag. Tag field is read-only while Auto is on. Uncheck **Auto** to type a tag manually. Edit mode always uses manual tag entry.
- **Presets**: edge dialog still offers preset apply/save for context-menu and edit flows; toolbar preset buttons mirror `edgePresets` styling.

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
| `src/features/project-editor/pane/relationships-editor/relationships-editor.tsx` | Pan/zoom, node drag, toolbar tool modes, linking mode, context menus, dialog orchestration |
| `src/features/project-editor/pane/relationships-editor/relationships-editor-toolbar.tsx` | Select/Move, Add relationship (preset sub-toolbar), Remove relationship tool buttons |
| `src/features/project-editor/pane/relationships-editor/relationships-editor-types.ts` | Node/edge/preset/config interfaces |
| `src/features/project-editor/pane/relationships-editor/relationships-config-serialization.ts` | `relationshipsConfig` normalization and meta write-back |
| `src/features/project-editor/pane/relationships-editor/relationships-editor-helpers.ts` | Node id slugs, `resolveAutoNodeTag`, edge geometry, dash arrays, stage constants; re-exports map clamping/tag helpers |
| `src/features/project-editor/pane/relationships-editor/relationships-nodes-layer.tsx` | Node pill overlay and tooltips |
| `src/features/project-editor/pane/relationships-editor/relationships-edges-layer.tsx` | SVG edge rendering with arrow markers |
| `src/features/project-editor/pane/relationships-editor/relationships-node-dialog.tsx` | Character create/edit modal; add-mode **Auto** tag checkbox and live tag preview |
| `src/features/project-editor/pane/relationships-editor/relationships-edge-dialog.tsx` | Relationship create/edit modal with preset apply/save |
| `src/features/project-editor/components/sidebar/sidebar-footer-actions.tsx` | Split-button menu entry |
| `src/features/project-editor/sidebar-file-actions/private/file-create.ts` | `createRelationships` action |
| `electron/ipc/handlers/project-handlers/relationships-document-handler.ts` | `createRelationshipsDocument` IPC handler |
| `electron/services/document-repository.ts` | Writes the initial relationships markdown with default presets |
| `src/shared/ipc.ts` | `'relationships'` meta type plus create-request schema |
| `tests/relationships-editor-helpers.test.ts` | Config parsing/normalization, slug ids, `resolveAutoNodeTag`, edge geometry indexes |
| `tests/relationships-document-create-repository.test.ts` | Repository coverage for initial chart frontmatter |
| `example-fantasy/lore/relationships.md` | Working example chart |

## Focused Tests

```bash
npm run test -- tests/relationships-editor-helpers.test.ts tests/relationships-document-create-repository.test.ts tests/ipc-contract.test.ts tests/sidebar-panels.test.ts
```

## Debug Playbook

### Auto tag not applied after adding a character

1. Confirm the lore file declares the tag in frontmatter `tags:` (lowercase in index — see `wiki-tag-links-architecture.md`).
2. Verify the character **name** matches the tag text exactly after lowercasing (Auto uses the full label, not the node `id` slug). Example: name `Aldren the Bold` looks up `aldren the bold`, not `aldren-the-bold`.
3. Check `tagIndex` is loaded: save a lore file and confirm wiki links work in the rich editor for the same tag.
4. Run `npm run test -- tests/relationships-editor-helpers.test.ts -t resolveAutoNodeTag`.

### Click does not navigate to lore file

1. Confirm `destinationTag` is set in saved frontmatter (Auto off + manual tag, or Auto matched a tag).
2. Trace `resolveNodeDestination(destinationTag, tagIndex)` in `map-editor-helpers.ts` (re-exported as `resolveNodeDestination`).
3. Confirm Select tool is active (other tools intercept node clicks).

### Related docs

- `mds/architecture/map-document-architecture.md` — shared pan/zoom + tag navigation contract
- `mds/architecture/wiki-tag-links-architecture.md` — tag index build/normalization
- `mds/lessons-learned/relationships-auto-tag-uses-label-not-slug.md` — Auto vs `buildNodeId` distinction
