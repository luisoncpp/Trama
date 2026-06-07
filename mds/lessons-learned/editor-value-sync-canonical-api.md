# Canonical editor-value comparison should live behind one API

## What

When the rich editor supports multiple equivalent markdown representations, the equality rule must live behind one named helper instead of being rebuilt ad hoc in effects.

## Why it's effective

The image-placeholder workflow means the same document may appear as:

- `![img_0](data:image/...)` from disk or save-time hydration
- `<!-- IMAGE_PLACEHOLDER:img_0 -->` in fast in-memory editor state

If each hook normalizes that differently, one path will eventually compare raw strings and trigger a false "document changed" re-apply.

## The durable pattern

- Put canonicalization in one small module near the editor lifecycle boundary.
- Expose a value helper such as `normalizeEditorDocumentValue(value, documentId)`.
- Expose an equality helper such as `areEquivalentEditorValues(a, b, documentId)`.
- Use those helpers for both `lastEditorValueRef` writes and external-value comparisons.

## Why this is better than local helper functions

The hard part is not the normalization itself; it is making the invariant visible. A named API tells future contributors that image-bearing markdown has an editor-specific equivalence rule, so they do not quietly reintroduce raw-string comparisons in other hooks.
