# Rich Editor Centered Image Flow

## Trigger

An image exists inside a `<!-- trama:center:start -->` / `<!-- trama:center:end -->` block in the rich editor.

## Entry points

- Initial document load: `applyMarkdownToEditor()` in `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-quill.ts`
- Later editor mutations: Quill `text-change` handler in `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-serialization.ts`

## Why this flow matters

Centered images in the editor depend on an end-to-end chain, not one file:

- markdown directives become editor artifacts before Quill ingest
- images must survive markdown → HTML → Quill rendering
- centered boundaries must be reinterpreted after Quill normalization
- CSS must center both text blocks and block-level images

If any step breaks, text may still center while images remain left-aligned.

## Sequence

1. `RichMarkdownEditor` mounts and `useRichEditorLifecycle()` initializes Quill.
2. `applyMarkdownToEditor()` receives the current markdown.
3. `hydrateMarkdownImages()` expands any cached image placeholders before rendering.
4. `renderDirectiveArtifactsToMarkdown()` rewrites center directives into boundary artifact `<div>` nodes.
5. `marked.parse()` converts the markdown body into HTML.
6. `restoreImagesAfterMarkedparsing()` restores legacy image placeholders when present.
7. `editor.clipboard.dangerouslyPasteHTML()` lets Quill ingest and normalize the generated HTML.
8. `syncCenteredLayoutArtifacts(editor)` walks `editor.root.children` in document order.
9. When it sees `trama-center-boundary` with `data-trama-role="start"`, it enters centered mode.
10. For each non-directive block while centered mode is active, it adds `.trama-centered-content`.
11. The same centering sync also marks descendant `<img>` nodes with `.trama-centered-media`.
12. When it sees the matching `center:end` boundary, it exits centered mode.
13. CSS applies `text-align: center` to `.trama-centered-content` and `display:block; margin-inline:auto` to `.trama-centered-media`.
14. On later edits, the Quill `text-change` handler reruns `syncCenteredLayoutArtifacts(editor)` immediately so centered image classes stay in sync.

## State reads

| Kind | Source | Why |
|------|--------|-----|
| Markdown value | `value` prop / external sync path | Source document being rendered into Quill |
| Cached image map | `markdown-image-placeholder.ts` | Needed to hydrate image placeholders before render |
| Editor child blocks | `editor.root.children` | Used to recompute which blocks live between center boundaries |
| Boundary metadata | `data-trama-role`, directive classes | Determines when centering turns on/off |
| Descendant images | `block.querySelectorAll('img')` | Needed to apply explicit image-centering class |

## State writes

| Target | File / layer | What changes |
|--------|--------------|--------------|
| Quill DOM | `rich-markdown-editor-quill.ts` | Replaces editor content through `dangerouslyPasteHTML()` |
| Block classes | `rich-markdown-editor-layout-centering.ts` | Adds/removes `.trama-centered-content` |
| Image classes | `rich-markdown-editor-layout-centering.ts` | Adds/removes `.trama-centered-media` |

## Side effects

| Side effect | File |
|-------------|------|
| Directive preprocessing before Quill ingest | `src/shared/markdown-layout-directives.ts` |
| Markdown/HTML rendering for editor load | `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-quill.ts` |
| Center-boundary scan and class synchronization | `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-centering.ts` |
| CSS block and image centering | `src/index.css` |
| Re-sync after edits | `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-serialization.ts` |

## Files to inspect

| File | Why inspect it |
|------|----------------|
| `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-quill.ts` | Load path from markdown into Quill and the call site for centering sync |
| `src/shared/markdown-layout-directives.ts` | How center directives become temporary editor artifact nodes |
| `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-centering.ts` | Boundary scan, centered block marking, and descendant image marking |
| `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-serialization.ts` | Why centering sync reruns after each Quill text change |
| `src/index.css` | The actual centering behavior applied to text blocks and images |
| `tests/rich-markdown-editor.test.ts` | Regression coverage for centered text and centered images |

## Common failure modes

| Symptom | Usual cause | First file to inspect |
|---------|-------------|-----------------------|
| Text centers but image does not | Only block `text-align:center` was applied; image never received block-level centering | `rich-markdown-editor-layout-centering.ts`, `src/index.css` |
| Image alignment becomes stale after editing near boundaries | `syncCenteredLayoutArtifacts()` did not rerun or missed descendant images | `rich-markdown-editor-serialization.ts` |
| Center directives visible as raw comments | Directive artifact pre-pass failed before Quill ingest | `src/shared/markdown-layout-directives.ts` |
| Images disappear instead of misaligning | Image hydration / canonical image flow broke before centering logic ran | `rich-markdown-editor-quill.ts`, `markdown-image-placeholder.ts` |

## Focused tests

- `npm run test -- tests/rich-markdown-editor.test.ts`
- `npm run lint`
- `npm run build`

## Related docs

- `docs/architecture/rich-markdown-editor-core-architecture.md`
- `docs/flows/rich-editor-typing-flow.md`
- `docs/lessons-learned/quill-centered-images-need-block-level-centering.md`
