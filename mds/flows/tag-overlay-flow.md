# Tag Overlay Interaction Flow

## Trigger

User holds `Ctrl` (or `Cmd` on macOS) to reveal wiki tag underlines in the rich editor.

## Entry point

`src/features/project-editor/components/rich-markdown-editor.tsx` — `ctrlPressed` state and `TagHighlights` rendering.

## Why this flow matters

Tag underlines are rendered via geometric overlays, not document mutation. They must appear only while Ctrl is held, update instantly as the user types, and not interfere with typing performance. The architecture separates text matching (what tags exist and where) from geometric bounds computation (where to draw the underline).

## Sequence

1. User holds `Ctrl`.
2. `useCtrlKeyState()` sets `ctrlPressed = true` via `keydown`/`keyup` listeners on `document`.
3. `RichMarkdownEditor` re-renders with `ctrlPressed = true`.
4. `useTagOverlay({ editorRef, tagIndex, ctrlPressed, tagOverlayRecalcRef, tagOverlayMatchesRef })` is called:
   - On each render, returns `tagOverlayMatchesRef.current` without recomputing
   - Only recomputes when `ctrlPressed === true` AND (dirty flag is set OR matches array is empty)
   - On recompute: reads `editor.getText()`, runs `findTagMatchesInText(text, tagIndex)`, filters code blocks, stores in `tagOverlayMatchesRef.current`
   - Clears dirty flag after recomputing
5. **Lazy performance model** — matching is deferred until Ctrl is actually held, avoiding per-keystroke overhead in large documents.
6. `TagHighlights` receives `matches` and `editor` instance:
   - Calls `resolveBounds(editor, matches)` on every render (never memoized)
   - Maps each plain-text offset to a Quill index via `mapPlainTextIndexToQuillIndex`
   - Calls `getTagMatchRects(editor, quillStart, quillEnd)` to get per-line pixel coordinates
   - Uses `editor.scroll.leaf()` + `Range.getClientRects()` so wrapped tags produce one rect per visual line
   - Renders absolute-positioned `<div class="tag-link-highlight">` below each matched term (one per line when wrapped)
6b. `useTagOverlayScrollEffect` attaches a `scroll` listener on the editor container while Ctrl is held. On scroll, it increments `setTagScrollTick`, forcing a re-render so `TagHighlights` re-computes fresh bounds. Without this, underlines would stay fixed in viewport coordinates while the text scrolls.
7. User releases `Ctrl` → `ctrlPressed = false` → `TagHighlights` unmounts, scroll listener removed.

## State reads

| Kind | Source | Why |
|------|--------|-----|
| Ctrl modifier state | `useCtrlKeyState()` | Triggers overlay visibility and deferred recompute |
| Dirty flag | `tagOverlayRecalcRef.current` | Set by `text-change` handler; signals matches need refresh |
| Cached matches | `tagOverlayMatchesRef.current` | Stores computed `TagMatch[]` between Ctrl presses |
| Quill text content | `editor.getText()` | Only read when recomputing (on Ctrl press + dirty) |
| Tag index | `tagIndex` prop (from `useTagIndex` hook) | Tag → file path lookup |

## State writes

| Target | File / layer | What changes |
|--------|--------------|--------------|
| `tagOverlayRecalcRef.current` | `rich-markdown-editor-serialization.ts` | Set to `true` on every `text-change` (typing) |
| `tagOverlayMatchesRef.current` | `rich-markdown-editor-tag-overlay.ts` | Stores computed `TagMatch[]` when Ctrl held and dirty |
| `tagOverlayRecalcRef.current` | `rich-markdown-editor-tag-overlay.ts` | Set to `false` after recompute on Ctrl press |

## Side effects

| Side effect | File |
|-------------|------|
| Tag matching (plain text offsets) | `rich-markdown-editor-tag-helpers.ts` |
| Plain-text → Quill index mapping | `rich-markdown-editor-tag-overlay.ts` |
| Geometric bounds computation | `rich-markdown-editor-tag-highlights.tsx` |
| Ctrl key state tracking | `rich-markdown-editor-ctrl-key.ts` |

## Files to inspect

| File | Why |
|------|-----|
| `src/features/project-editor/components/rich-markdown-editor.tsx` | Ctrl state, `useTagOverlay` call site, `TagHighlights` rendering |
| `src/features/project-editor/components/rich-markdown-editor-tag-overlay.ts` | `useTagOverlay` (text matching), `mapPlainTextIndexToQuillIndex` |
| `src/features/project-editor/components/rich-markdown-editor-tag-highlights.tsx` | `resolveBounds` (fresh per render), underline rendering |
| `src/features/project-editor/components/rich-markdown-editor-tag-helpers.ts` | `findTagMatchesInText`, `filterMatchesOutsideCode` |
| `src/features/project-editor/use-tag-index.ts` | Tag index fetch/cache/invalidation |

## Common failure modes

| Symptom | Usual cause | First file to inspect |
|---------|-------------|-----------------------|
| Underlines don't appear on Ctrl press | `tagOverlayRecalcRef` never set, or matches empty on first press | `rich-markdown-editor-serialization.ts` (ensure dirty flag is set on text-change) |
| Underlines at wrong position after typing | Dirty flag set but `useTagOverlay` didn't trigger on Ctrl press | `rich-markdown-editor-tag-overlay.ts` |
| Underlines at wrong position after resize/split | `getBounds()` cached across layout changes | `rich-markdown-editor-tag-highlights.tsx` (ensure no memoization of bounds) |
| Tags not matched inside bold/italic | Code block filter too aggressive or boundary rule wrong | `rich-markdown-editor-tag-helpers.ts` |
| Ctrl+click opens wrong file | Hit-test using wrong coordinate reference or stale bounds | `rich-markdown-editor.tsx` click handler |
| Performance lag while typing | Matching computed on every keystroke instead of deferred to Ctrl press | `rich-markdown-editor-serialization.ts` (text-change handler) |

## High-value notes

- `useTagOverlay` recomputes only when `ctrlPressed === true` AND (dirty flag is set OR matches array is empty). This defers the O(n) regex matching to the Ctrl press event instead of running on every keystroke.
- Dirty flag (`tagOverlayRecalcRef.current`) is set by the `text-change` handler in `rich-markdown-editor-serialization.ts` on every keystroke, marking that matches need refresh.
- On document change, `resetTagOverlayOnDocChange` effect clears `tagOverlayMatchesRef.current`, sets `tagOverlayRecalcRef.current = true`, and calls a `useState` counter to force a re-render — because ref mutations alone do not trigger React re-renders. Without this, the dirty flag would remain unread until the next Ctrl press.
- `TagHighlights` calls `getTagMatchRects()` fresh on every render, never memoized, because bounds are layout-dependent. `getTagMatchRects` prefers `Range.getClientRects()` via `editor.scroll.leaf()` for multi-line accuracy, falling back to `getBounds()` when needed.
- Tag matching is case-insensitive, longest-match-first, with word-boundary rules. Accents are normalized — "canción", "cancion", and "canción" all match the same tag. Inline formatting (bold, italic, headers) does NOT exclude a tag from matching.
- Code block exclusion uses line-count heuristics (triple backticks, indented lines, inline backticks).

## Related docs

- `mds/architecture/wiki-tag-links-architecture.md`
- `mds/lessons-learned/tag-overlay-stale-bounds-on-layout-change.md`
- `mds/flows/rich-editor-typing-flow.md`