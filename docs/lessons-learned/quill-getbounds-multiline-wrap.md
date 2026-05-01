# Quill getBounds() does not handle multi-line wrapped ranges

`quill.getBounds(index, length)` returns a single bounding rectangle for the entire range. When text wraps across multiple visual lines, this rectangle spans from the start of the first line to the end of the last line, producing a single wide block that does not match the actual text shape.

## What broke

Tag underlines in the rich editor are rendered as absolute-positioned `div` elements placed via `getBounds()`. When a tag spanned a line break caused by word wrap, the underline was drawn as one continuous bar across the gap between lines, or with incorrect width/position.

## The fix

Instead of relying on `getBounds()` for the full match length, resolve the DOM nodes at the Quill start and end indexes via `editor.scroll.leaf()`, create a native `Range`, and read `range.getClientRects()`. This produces one rectangle per visual line, which can then be positioned individually.

```ts
const scroll = (editor as any).scroll
let [leaf, offset] = scroll.leaf(quillStart)
if (leaf == null) return []

// Quill getBounds logic: if at end of leaf and length > 0, move to next leaf
const length = quillEnd - quillStart
if (length > 0 && offset === leaf.length()) {
  const [next] = scroll.leaf(quillStart + 1)
  if (next) {
    const [line] = scroll.line(quillStart)
    const [nextLine] = scroll.line(quillStart + 1)
    if (line === nextLine) {
      leaf = next
      offset = 0
    }
  }
}

const [startNode, startOffset] = leaf.position(offset, true)
const range = document.createRange()
range.setStart(startNode, startOffset)

let [endLeaf, endOffset] = scroll.leaf(quillEnd)
if (endLeaf == null) return []
const [endNode, endNodeOffset] = endLeaf.position(endOffset, true)
range.setEnd(endNode, endNodeOffset)

const rects = Array.from(range.getClientRects())
// convert each rect to editor.container-relative coordinates
```

If `editor.scroll.leaf()` is unavailable, fall back to `getBounds()` and treat the result as a single-line rectangle.

## Why this matters

Any geometric overlay that must sit directly under or over text — underlines, highlights, strike-throughs — needs per-line geometry when the target text can wrap. `getBounds()` is correct for single-line or block-level positioning, but not for inline ranges that may break across lines.

## See also

- `docs/architecture/wiki-tag-links-architecture.md`
- `docs/lessons-learned/quill-getbounds-container-reference.md`
