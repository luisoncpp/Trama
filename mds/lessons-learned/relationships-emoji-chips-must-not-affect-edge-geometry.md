# Relationships Emoji Chips Must Not Affect Edge Geometry

**Date:** 2026-06-18

## Context

Adding Discord/Slack-style emoji decoration chips to relationship-chart character nodes introduced a layout pitfall: the chips render below the pill, so if they participate in the node's normal flow the anchor box grows taller. `estimateNodeHalfExtents` (and therefore `anchorOnNodeBoundary`) keys edge endpoint shortening off the **label width and a fixed half-height** only — it knows nothing about the emoji row. A taller anchor would shift the pill's visual center upward away from the stored `(x, y)`, so edges would no longer meet the pill border cleanly.

## What I learned

Keep the emoji chip row **absolutely positioned below the pill** (`position: absolute; top: 100%`) inside `.relationships-node-anchor`, never in normal flow. The anchor keeps `translate(-50%, -50%)` centered on `(x, y)` and its layout height stays equal to the pill alone, so:

- `estimateNodeHalfExtents(label)` continues to match the real pill border.
- Edge endpoints (`anchorOnNodeBoundary`) still land on the pill, not floating in the chip row.
- The `+` add button can be revealed on hover (`opacity: 0` → `1`) without changing layout even for empty nodes — pair it with a zero-size `.relationships-node__emojis--empty` container so empty nodes keep identical geometry to pre-emoji nodes.

## Applies to

Any future overlay/decoration added to a node (badges, counts, status dots): if edge geometry or hit-testing assumes a specific node box, the decoration must be out-of-flow so the assumed box does not change.
