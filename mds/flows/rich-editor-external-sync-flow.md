# Rich Editor External Sync Flow

## Trigger

Renderer state provides a new `value` prop to `RichMarkdownEditor` after a document load, reopen, pane switch, or external reload.

## Entry point

`useEditorSessionOrchestration()` in `src/features/project-editor/pane/rich-markdown-editor/editor-session/editor-session-private/editor-session-orchestration.ts` — a Preact effect calls `EditorSessionImpl.applyExternalValue(value, forceApplyVersion)`.

## Why this flow matters

This is the boundary where the editor decides whether an incoming value is:

- a real document change that must be applied into Quill
- or only another representation of the same document and must be ignored

That distinction is what prevents image-bearing documents from re-rendering destructively while the user is typing.

## Sequence

1. Some renderer action updates the active pane value.
2. `RichMarkdownEditor` re-renders with a new `value` prop.
3. The orchestration effect runs `lifecycleSession.applyExternalValue(props.value, props.forceApplyVersion ?? 0)`.
4. `EditorContentLoop.applyExternalValue()` computes `nextNormalized = normalizeEditorDocumentValue(value, documentId)`.
5. It compares `lastEditorValueRef.current` and the incoming `value` through `areEquivalentEditorValues(...)`.
6. If the two values are canonically equivalent:
   - stop immediately
   - do not touch Quill
   - preserve in-flight typing and current rendered images
7. If the two values are not equivalent (or `forceApplyVersion` advanced):
   - set `isApplyingExternalValueRef.current = true`
   - capture the current Quill selection and scroll position
   - call `applyMarkdownToEditor(editor, value, 'silent', documentId)`
   - convert each layout-directive artifact to one `BlockEmbed` operation; the clipboard matcher does not add a newline
   - restore selection, focus, and scroll
   - set `lastEditorValueRef.current = nextNormalized`
   - clear `isApplyingExternalValueRef.current` on `setTimeout(..., 0)`

## Canonicalization rule

`rich-markdown-editor-value-sync.ts` is the single source of truth for editor-value equivalence (shared with pane snapshot and Git history callers):

- `normalizeEditorDocumentValue(value, documentId)` converts base64 markdown images into placeholder markdown and normalizes line endings.
- `areEquivalentEditorValues(a, b, documentId)` compares two values using that canonical placeholder-based form.

Example:

- `![img_0](data:image/...)`
- `<!-- IMAGE_PLACEHOLDER:img_0 -->`

These must be treated as the same editor document value.

## State reads

| Kind | Source | Why |
|------|--------|-----|
| Quill instance | `EditorSessionImpl` private editor | Required to apply or skip the incoming value |
| Current canonical editor value | `EditorContentLoop.lastEditorValueRef` | Baseline for equivalence comparison |
| Incoming prop value | `value` prop | Candidate external document state |
| Document identity | `documentId` | Needed for placeholder cache and canonical normalization |
| Apply-lock flag | `EditorContentLoop.isApplyingExternalValueRef` | Prevents outbound serialization from reacting to the re-apply |

## State writes

| Target | File / layer | What changes |
|--------|--------------|--------------|
| Quill DOM | `rich-markdown-editor-quill.ts` | Replaced only when the incoming value is a real change |
| `isApplyingExternalValueRef` | `editor-session-content.ts` | Temporarily locks outbound `text-change` handling |
| `lastEditorValueRef` | `editor-session-content.ts` | Updated to canonical incoming value after a real re-apply |

## Side effects

| Side effect | File |
|-------------|------|
| Canonical normalization and equality check | `rich-markdown-editor-value-sync.ts` |
| Markdown -> Quill re-apply | `rich-markdown-editor-quill.ts` |
| Selection preservation | `editor-session-content.ts` |

## Files to inspect

| File | Why inspect it |
|------|----------------|
| `editor-session/editor-session-private/editor-session-orchestration.ts` | Preact effect that triggers external apply |
| `editor-session/editor-session-private/editor-session-content.ts` | **Editor content loop**: apply/skip decision, apply-lock, flush |
| `editor-session/editor-session-private/editor-session-lifecycle.ts` | Delegates to content loop; owns Quill instance |
| `rich-markdown-editor-value-sync.ts` | Canonical normalization and equivalence API |
| `rich-markdown-editor-quill.ts` | Real document re-apply into Quill |
| `src/shared/markdown-image-placeholder.ts` | Base64 <-> placeholder conversion and image cache |
| `mds/architecture/image-handling-architecture.md` | Canonical image representation and hydration model |
| `mds/lessons-learned/quill-render-keypress-image-loss.md` | Root cause behind the equivalence rule |
| `mds/architecture/rich-editor-hotspots.md` | Fast routing for equivalence, re-apply, and lifecycle seams |

## Common failure modes

| Symptom | Usual cause | First file to inspect |
|---------|-------------|-----------------------|
| Typed text disappears after state update | External sync re-applied an equivalent value or debounce flushed placeholder-markdown to parent state | `editor-session-content.ts` |
| Images blink or disappear after first keystroke | Placeholder-markdown corrupted parent state, cascading re-render destroyed images | `editor-session-content.ts` → `mds/lessons-learned/editor-onchange-image-hydration.md` |
| Cursor jumps on reload | Selection was not preserved around a real re-apply | `editor-session-content.ts` |
| Placeholder comments become visible content | Hydration/re-apply boundary drifted | `rich-markdown-editor-quill.ts` and `markdown-image-placeholder.ts` |
| One blank line becomes two after reopen | Layout-directive clipboard matcher appended `\n` after a `BlockEmbed`, creating `<p><br></p>` beside the spacer | `layout-directive-clipboard.ts` and `tests/blank-line-spacer-bug.test.ts` |

## High-value notes

- `lastEditorValueRef.current` is an editor-canonical value, not a guaranteed copy of on-disk markdown.
- External sync should compare through the named API, never by raw string equality.
- A real apply uses `'silent'` so Quill history does not treat external reloads as user edits.
- Outbound flush updates `lastEditorValueRef` **before** calling parent `onChange` so the subsequent inbound prop is recognized as equivalent (round-trip immunity).

## Focused tests

```bash
npm run test -- tests/editor-session.test.ts
npm run test -- tests/rich-markdown-editor-value-sync.test.ts
npm run test -- tests/blank-line-spacer-bug.test.ts
```

## Related hotspot

- `mds/architecture/rich-editor-hotspots.md` -> `Canonical external-value sync`
- `mds/architecture/rich-editor-hotspots.md` -> `Quill lifecycle and remount boundaries`
