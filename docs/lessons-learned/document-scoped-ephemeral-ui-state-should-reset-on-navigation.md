# Document-scoped ephemeral UI state should reset on navigation

## What looked tempting

When navigation closes a document-scoped panel, keep its hidden target path and selection around so reopening can reuse prior state.

## What actually works better

If the panel is scoped to one document, closing it because the user navigated away should reset its target document, preview selection, and confirmation state back to empty.

## Why

- Hidden state that still points at the previous document is easy to accidentally reuse on reopen.
- Renderer navigation already knows the panel is no longer valid for the new document, so this is the safest reset point.
- Full reset is simpler than trying to preserve only some fields while remembering to retarget others.

## Apply this next time

For compare panels, revision rails, transient previews, and similar document-local UI, treat navigation-triggered close as a teardown, not a hide.
