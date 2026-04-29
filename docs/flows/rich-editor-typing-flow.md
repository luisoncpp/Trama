# Rich Editor Typing Flow

## Trigger

The user types in the rich editor.

## Entry point

Quill `text-change` handler registered in `src/features/project-editor/components/rich-markdown-editor-serialization.ts` (debounced serialization session).

## Why this flow matters

This is the main path where several subtle rules meet:

- dirty state must become `true` immediately
- markdown serialization must be deferred for performance
- image-bearing documents must stay in one canonical in-memory form
- external-value sync must not re-apply equivalent content and wipe in-flight typing

The canonical equivalence rule now lives in `src/features/project-editor/components/rich-markdown-editor-value-sync.ts`.

## Sequence

1. `RichMarkdownEditor` mounts and creates refs in `useRichEditorRefs()`.
2. `useRichEditorLifecycle()` initializes Quill through `useInitializeEditor()`.
3. `registerEditorTextChangeHandler()` attaches a Quill `text-change` listener.
4. User types.
5. Quill fires `text-change`.
6. `syncCenteredLayoutArtifacts(editor)` runs immediately.
7. `onDirtyRef.current()` runs immediately.
8. The pending serialization timer is cleared if one exists.
9. A new 1-second timer is scheduled to call `flush()`.
10. `flush()` serializes `editor.root.innerHTML` to placeholder-markdown through `serializeEditorMarkdownFromRef(...)`.
11. `flush()` stores placeholder-markdown in `lastEditorValueRef.current` (lightweight internal tracking).
12. `flush()` hydrates the placeholder-markdown to `![uuid](data:image/...)` and calls `onChangeRef.current(hydratedMarkdown)`.
13. `onChangeRef.current()` updates pane content in renderer state with fully-hydrated markdown.
14. Future `useSyncExternalValue()` checks compare the incoming value against `lastEditorValueRef.current` through `areEquivalentEditorValues(...)`.
15. If the incoming value is only a different representation of the same image-bearing document, Quill is not re-applied.

## State reads

| Kind | Source | Why |
|------|--------|-----|
| Editor DOM | `editor.root.innerHTML` | Source for markdown serialization |
| Current document identity | closure-captured `documentId` | Needed for image placeholder cache and canonical serialization |
| External-apply flag | `isApplyingExternalValueRef.current` | Prevent feedback loops and zombie serialization |
| Latest editor value | `lastEditorValueRef.current` | Prevent external sync from re-applying the same content |
| Dirty callback | `onDirtyRef.current` | Marks pane dirty immediately |
| Change callback | `onChangeRef.current` | Pushes serialized markdown into pane state |

## State writes

| Target | File / layer | What changes |
|--------|--------------|--------------|
| `lastEditorValueRef.current` | editor component refs | Updated to the serialized placeholder-markdown (lightweight) |
| Pane dirty flag | `use-project-editor-ui-actions-helpers.ts` | `isDirty` becomes `true` immediately |
| Pane content | `use-project-editor-ui-actions-helpers.ts` | Debounced hydrated markdown replaces previous pane content |

## Side effects

| Side effect | File |
|-------------|------|
| Centering artifact synchronization | `rich-markdown-editor-layout-centering.ts` |
| Debounced serialization | `rich-markdown-editor-serialization.ts` |
| Image placeholder extraction + hydration before onChange | `rich-markdown-editor-serialization.ts` |
| Markdown ↔ HTML conversion and image placeholder logic | `rich-markdown-editor-quill.ts` |
| Canonical value equivalence for later external sync | `rich-markdown-editor-value-sync.ts` |
| UI state update for the current pane | `use-project-editor-ui-actions-helpers.ts` |

## Files to inspect

| File | Why inspect it |
|------|----------------|
| `src/features/project-editor/components/rich-markdown-editor.tsx` | Ref creation and top-level editor orchestration |
| `src/features/project-editor/components/rich-markdown-editor-core.ts` | Quill lifecycle, external-value sync, enable/disable, spellcheck |
| `src/features/project-editor/components/rich-markdown-editor-serialization.ts` | Debounce handler, `flush()` with image hydration, `text-change` listener |
| `src/features/project-editor/components/rich-markdown-editor-value-sync.ts` | Canonical placeholder-based normalization/equality used by external sync |
| `src/features/project-editor/components/rich-markdown-editor-quill.ts` | Markdown <-> HTML conversion and image placeholder logic |
| `src/features/project-editor/use-project-editor-pane-persistence.ts` | Where later save/switch callers consume `flush()` safely by pane |
| `src/features/project-editor/use-project-editor-ui-actions-helpers.ts` | Pane state updates through `updateEditorValue(...)` |
| `docs/lessons-learned/editor-debounce-closure-capture.md` | Non-obvious debounce invariants |
| `docs/lessons-learned/quill-render-keypress-image-loss.md` | Canonical image representation rule |
| `docs/architecture/rich-editor-hotspots.md` | Fast routing if the symptom maps better to a known fragile seam |
| `docs/flows/rich-editor-external-sync-flow.md` | Follow the later decision to re-apply or skip incoming values |

## Common failure modes

| Symptom | Usual cause | First file to inspect |
|---------|-------------|-----------------------|
| Typed text disappears | Timer serialized the wrong editor/document or external sync re-applied equivalent content | `rich-markdown-editor-serialization.ts` |
| Images disappear after typing | Placeholder markdown leaked into parent state without hydration, cascading re-renders destroyed images | `rich-markdown-editor-serialization.ts` |
| Dirty badge appears on wrong pane | Change callback used inferred active pane instead of explicit pane identity | `workspace-editor-panels.tsx` and `use-project-editor-ui-actions-helpers.ts` |
| Typing becomes very slow | Base64 image payloads leaked back into the hot serialization path | `rich-markdown-editor-quill.ts` |

## High-value notes

- `flush()` must return placeholder-markdown and callers must use that returned value directly. The parent receives hydrated markdown via `onChange`.
- Debounce cleanup clears the timer only; it must not serialize during React cleanup.
- The editor compares canonical placeholder-based markdown, not raw base64 image markdown, when deciding whether external sync should re-apply content.
- Image hydration happens at the serialization boundary (`rich-markdown-editor-serialization.ts`) — `onChange` always delivers fully-hydrated markdown with `![uuid](data:image/...)` syntax, while `lastEditorValueRef` stays as lightweight `<!-- IMAGE_PLACEHOLDER -->` comments.

## Related hotspot

- `docs/architecture/rich-editor-hotspots.md` -> `Debounced serialization`
- `docs/architecture/rich-editor-hotspots.md` -> `Canonical external-value sync`
