# Specification: Map Document with Interactive Markers

This specification outlines the requirements and user-facing behavior for Map Documents featuring interactive markers linked to tagged resources.

## 1. Overview
A Map Document is a special type of writing document within Trama that displays an image base layer rather than a text surface. Users can navigate this map using mouse-driven panning and zooming, place markers that correspond to specific tags within the project, and click these markers to navigate directly to relevant files.

## 2. Document Data Model
Map Documents are stored as standard `.md` files under a Trama-managed project section (e.g., `lore/world-map.md`).

### 2.1 YAML Frontmatter Schema
A Map Document is identified by setting its `type` attribute to `map`. The properties are structured under a `mapConfig` object inside the frontmatter:

```yaml
---
type: map
name: Realm Map
mapConfig:
  backgroundImage: res/world_map.jpg
  markers:
    - x: 250
      y: 400
      label: "Silverwood Forest"
      destinationTag: "#wood-elves"
      color: "#2ecc71"
      description: "Home of the Silvan alliance."
---
```

### 2.2 Fields Definition
* **type**: Must be exactly `map`.
* **backgroundImage**: Project-relative path to an image stored inside the `res/` directory.
* **markers**: An array of marker nodes. Each marker contains:
  * `x`: Horizontal position coordinate in pixels relative to the original base image dimensions.
  * `y`: Vertical position coordinate in pixels relative to the original base image dimensions.
  * `label`: String name shown on hover or within editing context menus.
  * `destinationTag`: A wiki-link style tag string (e.g., `#wood-elves`) utilized to resolve target documents.
  * `color`: Hex color string utilized to tint the marker indicator dot.
  * `description`: (Optional) Short text snippet describing the marker.

## 3. Core Interactions & Navigation

### 3.1 Zoom and Pan
* The map workspace fills the active editor panel area.
* **Zooming**: Controlled via the mouse scroll wheel over the map frame. Zoom is centered around the cursor position.
* **Panning**: Triggered by clicking and dragging with the left or middle mouse button across the map background.
* Zoom and pan properties are stored locally as component view state and do not trigger unsaved document changes.

### 3.2 Marker Rendering & Hover
* Markers are rendered as small colored circles at their respective `(x, y)` coordinate positions.
* Hovering the cursor over a marker reveals a floating tooltip containing the marker's `label` and optional `description`.

### 3.3 Link Resolution & Navigation
* Clicking a marker initiates link resolution:
  1. The system reads the marker's `destinationTag`.
  2. It queries the `tagIndex` for documents carrying that tag.
  3. If a single document matches, that file is loaded.
  4. If multiple files match, the first resolved document path is picked.
  5. If no document carries the tag, a transient notification toast states that the tag is not found.
* **Pane Scope rules**:
  * If the workspace is currently in **split pane mode**, the resolved target file opens in the secondary pane.
  * If the workspace is in **single pane mode**, the target file opens directly within the current active pane.

## 4. Editing Operations

### 4.1 Creating Markers
1. Right-clicking anywhere on the map surface opens a context menu with a single action: `"Add a marker"`.
2. Selecting `"Add a marker"` captures the exact `(x, y)` pixel coordinates under the cursor and opens a Marker Dialog modal.
3. The modal collects the `label`, `destinationTag`, `color`, and `description`.
4. Saving the modal appends the entry to the frontmatter config and marks the document pane as dirty.

### 4.2 Modifying and Removing Markers
1. Right-clicking an existing marker dot opens a context menu with choices: `"Edit marker"` and `"Delete marker"`.
2. Selecting `"Edit marker"` opens the Marker Dialog populated with the marker's current details. Saving updates the frontmatter config and triggers dirty tracking.
3. Selecting `"Delete marker"` removes the marker from the array and marks the workspace pane dirty.
