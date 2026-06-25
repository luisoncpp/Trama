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
      emojis: ["👑", "⚔️"]       # optional decoration chips (no counts); max 12, deduped
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
  regions:                    # optional labeled rectangles for grouping (UE5-style comment boxes)
    - id: royal-court
      x: 400                  # top-left corner in stage coordinates
      y: 200
      width: 480
      height: 320
      label: "Royal court"
      color: "#9b59b6"
```

- Edges reference nodes by `id`, not by tag, so a node can exist without a tag and tags can change freely.
- `destinationTag` is optional on nodes. When set, plain click in Select mode navigates to the tagged lore file (same contract as map markers).
- `emojis` is an optional `string[]` on each node — decoration chips rendered below the pill (Discord/Slack-style badges, **no counts**). `normalizeEmojis` dedupes, trims, drops non-strings and overlong glyphs (>31 code points), and caps at `MAX_NODE_EMOJIS` (12). Empty arrays are stripped on write (`withRelationshipsConfig`); missing arrays default to `[]` on read.
- `regions` are optional labeled rectangles rendered behind edges/nodes. They are organizational only — they do not move contained characters automatically.
- `getRelationshipsConfig()` drops edges whose endpoints are missing or identical, drops regions smaller than 40×32px, and normalizes unknown styles/directions/colors to defaults.
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

- **Toolbar** (`relationships-editor-toolbar.tsx`): four tools — **Select / Move** (default), **Region** (drag to draw labeled rectangles), **Add relationship**, **Remove relationship**. Hidden in read-only preview.
- **Select / Move**: pan/zoom (drag background or region body interior, wheel zoom 0.25x–4x, never marks dirty); left-drag a node (4px threshold) commits position on pointer-up; left-drag a region **header label** moves the region; drag region **edges or corners** resizes; plain click navigates via `destinationTag` like map markers.
- **Region**: drag on the stage to draw a rectangle; on release opens the region dialog for label and color. Right-click stage → **Add region** creates a default 320×200 box at the click point. Right-click region **label** → rename or delete; right-click region **body** (empty area behind nodes/edges) → change color or delete. Regions render behind edges and nodes with a solid header strip and semi-transparent body tinted by the chosen color.
- **Add relationship**: sub-toolbar lists `edgePresets` plus **Custom…** (opens the edge dialog in template mode to define color/style/direction/label and optionally save a new preset). After a type is chosen, two node clicks create an edge immediately (no dialog); the tool stays active for repeated additions. Escape or background click cancels a pending first node only.
- **Remove relationship**: click an edge line/arrow to delete it; characters remain.
- **Context menu**: right-click stage → add character / add region; node → add emoji / add relationship (legacy two-click flow opens edge dialog if no toolbar template), edit/delete; edge → edit/delete; region label → rename/delete; region body → change color/delete.
- **Add character dialog** (`relationships-node-dialog.tsx`): **Auto** checkbox (on by default, add mode only). When on, `resolveAutoNodeTag` matches the typed name against `tagIndex`; existing tag → stored as `destinationTag`, no match → empty tag. Tag field is read-only while Auto is on. Uncheck **Auto** to type a tag manually. Edit mode always uses manual tag entry.
- **Emojis** (Discord/Slack-style decoration badges, no counts): hover a node → a `+` button appears below the pill; click it (or right-click node → **Add emoji**) to open `RelationshipsEmojiPicker` — a portaled popover with curated category sections + search. Clicking an emoji toggles it on that node via `toggleNodeEmoji` (add if absent, remove if present, deduped, capped at 12). Existing emoji chips below a node are clickable to remove. Read-only preview hides the `+` and disables chip removal. Emojis are pure decoration — they do not affect edge geometry (chips are absolutely positioned below the pill so the pill center stays at `(x, y)`).
- **Presets**: edge dialog still offers preset apply/save for context-menu and edit flows; toolbar preset buttons mirror `edgePresets` styling.

## Rendering

- Regions are absolutely-positioned HTML boxes (`relationships-regions-layer.tsx`) behind the SVG edge layer. The edges SVG root uses `pointer-events: none` so empty canvas areas pass clicks through to regions; only `.relationships-edge__hit` strokes receive edge pointer events.
- Nodes are absolutely-positioned HTML pill buttons (`relationships-nodes-layer.tsx`), so labels are always visible. Each node is wrapped in a `.relationships-node-anchor` positioned at `(x, y)` via `translate(-50%, -50%)`; the pill sits inside it and an absolutely-positioned emoji chip row floats below the pill so it never affects edge geometry (`estimateNodeHalfExtents` still keys off the label only).
- Edges are an SVG layer under the nodes (`relationships-edges-layer.tsx`): quadratic paths with dash arrays for styles, a wide transparent hit path for right-click targeting, and the label at the curve midpoint.
- Arrowheads render in a second SVG layer above the node pills (`RelationshipsEdgeMarkersLayer` in `relationships-edges-layer.tsx`) so bidirectional markers stay visible when nodes overlap the line ends.
- Parallel edges between the same pair bow out on alternating sides (`getParallelEdgeIndex` + `buildEdgeGeometry`).
- Edge endpoints are shortened to the pill border using label-width estimates (`estimateNodeHalfExtents` + `anchorOnNodeBoundary`), not a fixed radius.

## File Map By Responsibility

The `relationships-editor/` folder is a **deep module** (see `mds/dev-workflow.md` § Deep Modules): `index.ts` is the thin public facade exporting only `RelationshipsEditor` — the sole seam consumed by `editor-panel.tsx`. Everything under `relationships-editor/private/` is implementation and must not be imported from outside the module. Tests white-box `private/` for unit coverage, matching the `editor-session-private` precedent.

| File | Role |
|------|------|
| `src/features/project-editor/pane/relationships-editor/index.ts` | Public facade — exports `RelationshipsEditor` only |
| `src/features/project-editor/pane/editor-panel.tsx` | Document-type switch including `relationships`; imports `RelationshipsEditor` from the facade |
| `src/features/project-editor/pane/relationships-editor/private/relationships-editor.tsx` | Pan/zoom, node/region drag, toolbar tool modes, linking mode, context menus, dialog orchestration |
| `src/features/project-editor/pane/relationships-editor/private/relationships-editor-toolbar.tsx` | Select/Move, Region draw, Add relationship (preset sub-toolbar), Remove relationship tool buttons |
| `src/features/project-editor/pane/relationships-editor/private/relationships-editor-types.ts` | Node/edge/preset/region/config interfaces plus editor tool types |
| `src/features/project-editor/pane/relationships-editor/private/relationships-config-serialization.ts` | `relationshipsConfig` normalization and meta write-back |
| `src/features/project-editor/pane/relationships-editor/private/relationships-editor-helpers.ts` | Node/region id slugs, `resolveAutoNodeTag`, edge/region geometry, dash arrays, stage constants; re-exports map clamping/tag helpers |
| `src/features/project-editor/pane/relationships-editor/private/relationships-regions-layer.tsx` | Labeled region rectangles with resize handles, header drag-to-move, and body/label context targets |
| `src/features/project-editor/pane/relationships-editor/private/relationships-region-dialog.tsx` | Region create/rename modal (label + color) |
| `src/features/project-editor/pane/relationships-editor/private/use-relationships-region-editing.ts` | Region draw/move/resize interaction state and config updates |
| `src/features/project-editor/pane/relationships-editor/private/relationships-region-editing-helpers.ts` | Pure region save/move/resize/draw geometry helpers for the editing hook |
| `src/features/project-editor/pane/relationships-editor/private/relationships-region-pointer-handlers.ts` | Region move/resize/draw pointer handlers wired by the editing hook |
| `src/features/project-editor/pane/relationships-editor/private/relationships-nodes-layer.tsx` | Node pill overlay, tooltips, and emoji decoration chips with hover "+" add |
| `src/features/project-editor/pane/relationships-editor/private/relationships-edges-layer.tsx` | SVG edge rendering with arrow markers |
| `src/features/project-editor/pane/relationships-editor/private/relationships-emoji-data.ts` | Curated static emoji category grid backing the picker |
| `src/features/project-editor/pane/relationships-editor/private/relationships-emoji-helpers.ts` | Pure emoji helpers: `toggleNodeEmoji`, `filterEmojiCategories` |
| `src/features/project-editor/pane/relationships-editor/private/relationships-emoji-picker.tsx` | Portaled emoji picker popover (categories + search + toggle) |
| `src/features/project-editor/pane/relationships-editor/private/relationships-node-dialog.tsx` | Character create/edit modal; add-mode **Auto** tag checkbox and live tag preview |
| `src/features/project-editor/pane/relationships-editor/private/relationships-edge-dialog.tsx` | Relationship create/edit modal with preset apply/save |
| `src/features/project-editor/components/sidebar/sidebar-footer-actions.tsx` | Split-button menu entry |
| `src/features/project-editor/sidebar-file-actions/private/file-create.ts` | `createRelationships` action |
| `electron/ipc/handlers/project-handlers/relationships-document-handler.ts` | `createRelationshipsDocument` IPC handler |
| `electron/services/document-repository.ts` | Writes the initial relationships markdown with default presets |
| `src/shared/ipc.ts` | `'relationships'` meta type plus create-request schema |
| `tests/relationships-editor-helpers.test.ts` | Config parsing/normalization, slug ids, `resolveAutoNodeTag`, edge/region geometry indexes |
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
