# Implementation Plan: Map Document with Interactive Markers

This plan details the code slices, targets, and modifications required to introduce the Map Document feature into the Trama workspace.

## Phase Baseline Checklist
* Shared IPC definitions updated.
* Frontend view switcher integrated into `EditorPanel`.
* Canvas/interactive container module built supporting pan and zoom.
* Custom markers layer with tooltips added.
* Modal dialogues for marker creation and amendment integrated.
* Verification tests written.

## Slice 1: Shared Contracts & IPC Types
* **Target File:** `src/shared/ipc.ts`
* **Changes:** Add `'map'` to the type enum under `documentMetaSchema`. Ensure `catchall(z.unknown())` gracefully captures `mapConfig` records.
* **Verification:** Run `npm run test -- tests/ipc-contract.test.ts`.

## Slice 2: Presentational Map Workspace (`MapEditor` Component)
* **Target File:** `src/features/project-editor/pane/map-editor/map-editor.tsx` (New Component)
* **Changes:**
  * Create a standard Preact component that tracks local zoom/pan state (`scale`, `offset`).
  * Add mouse wheel listeners to adjust scale anchored to the mouse coordinate position.
  * Add pointer down/move/up tracking to shift the translation offset bounds during drag-panning.
  * Render the background base layer using the project-relative `res/` image URL resolved via `window.tramaApi`.
  * Group components neatly and follow lint restrictions (`max-lines: 200`).

## Slice 3: Marker Rendering and Navigation Interaction
* **Target File:** `src/features/project-editor/pane/map-editor/map-markers-layer.tsx` (New Component)
* **Changes:**
  * Map through `mapConfig.markers` and render absolute positioned circle overlays styled with the marker's `color`.
  * Attach a hover wrapper displaying tooltips for labels and short descriptions.
  * Bind click actions to look up the target path via `tagIndex` and dispatch the navigation event to `model.actions.openFileInPane` honoring workspace split mode.

## Slice 4: Contextual Forms and Modals for Management
* **Target File:** `src/features/project-editor/pane/map-editor/map-marker-dialog.tsx` (New Component)
* **Changes:**
  * Provide a compact modal dialogue to fill out marker attributes (`label`, `destinationTag`, `color`, `description`).
  * Integrate right-click context menu triggers over the map background canvas and marker dots.
  * Wire the save sequence to rebuild the YAML frontmatter dictionary and submit it upward using `onEditorChange(serializedMarkdown)`.

## Slice 5: Editor Panel Switcher Wiring
* **Target File:** `src/features/project-editor/pane/editor-panel.tsx`
* **Changes:**
  * Extract document type check from `props.meta.type`.
  * If the type matches `'map'`, render `<MapEditor>` instead of `<RichMarkdownEditor>`.
  * Ensure `editorValue` content parsing safely feeds frontmatter into the map state.
