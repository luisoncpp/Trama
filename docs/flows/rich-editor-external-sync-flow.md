# Rich Editor External Sync Flow

## Trigger

Renderer state provides a new `value` prop to `RichMarkdownEditor` after a document load, reopen, pane switch, or external reload.

## Entry point

`useSyncExternalValue()` in `src/features/project-editor/components/rich-markdown-editor-core.ts`.

## Why this flow matters

This is the boundary where the editor decides whether an incoming value is:

- a real document change that must be applied into Quill
- or only another representation of the same document and must be ignored

That distinction is what prevents image-bearing documents from re-rendering destructively while the user is typing.

## Sequence

1. Some renderer action updates the active pane value.
2. `RichMarkdownEditor` re-renders with a new `value` prop.
3. `useSyncExternalValue()` runs.
4. It reads the current Quill instance from `editorRef.current`.
5. It computes `nextNormalized = normalizeEditorDocumentValue(value, documentId)`.
6. It compares `lastEditorValueRef.current` and the incoming `value` through `areEquivalentEditorValues(...)`.
7. If the two values are canonically equivalent:
   - stop immediately
   - do not touch Quill
   - preserve in-flight typing and current rendered images
8. If the two values are not equivalent:
   - set `isApplyingExternalValueRef.current = true`
   - capture the current Quill selection
   - call `applyMarkdownToEditor(editor, value, 'silent', documentId)`
   - restore the selection if one existed
   - set `lastEditorValueRef.current = nextNormalized`
   - clear `isApplyingExternalValueRef.current` on `setTimeout(..., 0)`

## Canonicalization rule

`rich-markdown-editor-value-sync.ts` is the single source of truth for editor-value equivalence:

- `normalizeEditorDocumentValue(value, documentId)` converts base64 markdown images into placeholder markdown and normalizes line endings.
- `areEquivalentEditorValues(a, b, documentId)` compares two values using that canonical placeholder-based form.

Example:

- `![img_0](data:image/...)`
- `<!-- IMAGE_PLACEHOLDER:img_0 -->`

These must be treated as the same editor document value.

## State reads

| Kind | Source | Why |
|------|--------|-----|
| Quill instance | `editorRef.current` | Required to apply or skip the incoming value |
| Current canonical editor value | `lastEditorValueRef.current` | Baseline for equivalence comparison |
| Incoming prop value | `value` | Candidate external document state |
| Document identity | `documentId` | Needed for placeholder cache and canonical normalization |
| Apply-lock flag | `isApplyingExternalValueRef.current` | Prevents outbound serialization from reacting to the re-apply |

## State writes

| Target | File / layer | What changes |
|--------|--------------|--------------|
| Quill DOM | `rich-markdown-editor-quill.ts` | Replaced only when the incoming value is a real change |
| `isApplyingExternalValueRef.current` | editor component refs | Temporarily locks outbound `text-change` handling |
| `lastEditorValueRef.current` | editor component refs | Updated to canonical incoming value after a real re-apply |

## Side effects

| Side effect | File |
|-------------|------|
| Canonical normalization and equality check | `rich-markdown-editor-value-sync.ts` |
| Markdown -> Quill re-apply | `rich-markdown-editor-quill.ts` |
| Selection preservation | `rich-markdown-editor-core.ts` |

## Files to inspect

| File | Why inspect it |
|------|----------------|
| `src/features/project-editor/components/rich-markdown-editor-core.ts` | External sync effect and apply/skip decision |
| `src/features/project-editor/components/rich-markdown-editor-value-sync.ts` | Canonical normalization and equivalence API |
| `src/features/project-editor/components/rich-markdown-editor-quill.ts` | Real document re-apply into Quill |
| `src/shared/markdown-image-placeholder.ts` | Base64 <-> placeholder conversion and image cache |
| `docs/architecture/image-handling-architecture.md` | Canonical image representation and hydration model |
| `docs/lessons-learned/quill-render-keypress-image-loss.md` | Root cause behind the equivalence rule |
| `docs/architecture/rich-editor-hotspots.md` | Fast routing for equivalence, re-apply, and lifecycle seams |

## Common failure modes

| Symptom | Usual cause | First file to inspect |
|---------|-------------|-----------------------|
| Typed text disappears after state update | External sync re-applied an equivalent value or debounce flushed placeholder-markdown to parent state | `rich-markdown-editor-serialization.ts` and `rich-markdown-editor-core.ts` |
| Images blink or disappear after first keystroke | Placeholder-markdown corrupted parent state, cascading re-render destroyed images | `rich-markdown-editor-serialization.ts` → `docs/lessons-learned/editor-onchange-image-hydration.md` |
| Cursor jumps on reload | Selection was not preserved around a real re-apply | `rich-markdown-editor-core.ts` |
| Placeholder comments become visible content | Hydration/re-apply boundary drifted | `rich-markdown-editor-quill.ts` and `markdown-image-placeholder.ts` |

## High-value notes

- `lastEditorValueRef.current` is an editor-canonical value, not a guaranteed copy of on-disk markdown.
- External sync should compare through the named API, never by raw string equality.
- A real apply uses `'silent'` so Quill history does not treat external reloads as user edits.

## Related hotspot

- `docs/architecture/rich-editor-hotspots.md` -> `Canonical external-value sync`
- `docs/architecture/rich-editor-hotspots.md` -> `Quill lifecycle and remount boundaries`
