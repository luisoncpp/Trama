# Quill getBounds() is relative to quill.container, not quill.root

Date: 2026-04-11

## Context

Tag underline overlays rendered at the correct vertical position but had a horizontal distortion that grew proportionally with editor width. At minimum width the position was correct; at wider widths it drifted increasingly to the right. The Ctrl+Click hit-test had the same distortion (clicks only worked on the left portion of wide editors).

## Root Cause

`quill.getBounds(index, length)` returns coordinates relative to `quill.container` (the div Quill was mounted on), **not** to `quill.root` (the `.ql-editor` div).

`.ql-editor` has `max-width: 860px; margin: 0 auto`, so when the column is wide:
- `quill.root.left = quill.container.left + centering_offset`
- `bounds.left = text.left - quill.container.left = centering_offset + padding + char_offset`

Using `editorRoot.getBoundingClientRect()` as the overlay reference doubled the centering offset:
```
overlay.left = editorRootRect.left - shellRect.left + bounds.left
             = centering_offset + (centering_offset + padding + char_offset)  ← 2× wrong
```

Using `editor.container.getBoundingClientRect()` gives the correct result because `left - shellRect.left` for the container is 0 (container fills the shell), and `bounds.left` already carries the full offset from the container edge.

## Fix

```ts
// WRONG
const editorRootRect = editorRef.current?.root.getBoundingClientRect()
const tagOffsetLeft = editorRootRect.left - shellRect.left  // doubles centering margin

// CORRECT
const editorContainerRect = editorRef.current?.container.getBoundingClientRect()
const tagOffsetLeft = editorContainerRect.left - shellRect.left  // ~0, cancels cleanly
```

The same fix applies to the hit-test in the click handler:
```ts
// WRONG
const rect = editor.root.getBoundingClientRect()
// CORRECT
const rect = editor.container.getBoundingClientRect()
```

## Rule

Any code that converts Quill `getBounds()` coordinates to viewport or parent-relative coordinates must use `quill.container.getBoundingClientRect()` as the reference, not `quill.root.getBoundingClientRect()`.

## Official documentation

From https://quilljs.com/docs/api#getBounds (v2.0.3, the version used in this project):

> **getBounds** — Retrieves the pixel position **(relative to the editor container)** and dimensions of a selection at a given location.

This is unambiguous and intentional API design. The container is the element passed to `new Quill(container, options)`.

## Symptoms that indicate this bug

- Overlay/highlight positioned correctly at narrow width but drifts right as editor widens.
- Ctrl+Click hit-tests only work on the left side of words when the editor is wide.
- The distortion scales linearly with available horizontal space.
