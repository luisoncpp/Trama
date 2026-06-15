# Relationships chart: arrowheads must render above node pills

## What happened

Bidirectional edges looked uni-directional when node pills overlapped the SVG arrow markers. A fixed 26px anchor inset from node center also failed for wide labels on horizontal links (scale collapsed to 0 when `deltaY === 0`).

## What to do next time

1. Keep edge lines and hit targets in the bottom SVG layer; render `<marker>` arrowheads in a separate SVG layer **after** the HTML node layer (`z-index` + `pointer-events: none`).
2. Anchor edge endpoints with a ray–box intersection using estimated pill half-width from label length, not a constant radius.
3. Handle axis-aligned rays explicitly (`deltaX === 0` or `deltaY === 0`) when computing the intersection scale.

## Files

- `relationships-editor-helpers.ts` — `estimateNodeHalfExtents`, `anchorOnNodeBoundary`
- `relationships-edges-layer.tsx` — `RelationshipsEdgeMarkersLayer`
- `08-component-cosmetics.css` — layer z-index
