# Document Contents Navigation Architecture

> **Last updated:** 2026-07-21. Status: slice 1 complete — parser, reveal path, and Contents rail panel implemented; all quality gates pass (lint, full suite 117 files / 951 tests, build).
> Spec: `mds/spec/document-contents-navigation-spec.md`

Goal: explain how the Contents feature turns the active pane's markdown into a clickable heading index — extraction, heading identity, reveal mechanics, command path, and the state-subscription constraint that keeps typing cheap.

## Scope

Slice 1: Contents rail panel + click-to-reveal navigation. Deferred slices (scroll-spy, quick-jump palette, drag-reorder) are listed at the end with their reuse notes.

## Data flow

```
Quill document (per pane)
  → debounced serialization (editor-session-content)          [existing]
  → PaneDocumentState.content (placeholder markdown)
  → deriveActivePaneDocument → state.editorValue              [existing projection]
  → DocumentContentsContext (narrow: editorValue, documentType, selectedPath)   [new]
  → parseDocumentHeadings() → DocumentHeading[]               [new pure parser]
  → SidebarContentsContent rows                               [new panel]

Row click
  → actions.revealDocumentHeading({ ordinal, level, text })   [new workspace action]
  → paneWorkspace.revealHeadingInPane(activePane, target)     [new PaneWorkspace method]
  → editorSessionRefs[activePane].current?.revealHeading()    [new EditorSession method]
  → scanQuillHeadings(editor) → ordinal clamp → quill index   [new helper]
  → setSelection + focus + centered scroll (settle re-assert)
```

## Module layout (new deep module)

`src/features/project-editor/document-contents/` — sibling of `pane/` and `components/`, so both the sidebar panel and the editor session may import its facade (deep-module rules: only `index.ts` is imported from outside).

| File | Responsibility |
|------|----------------|
| `index.ts` | Facade: `parseDocumentHeadings`, `scanQuillHeadings`, `revealQuillHeading`, types `DocumentHeading`, `HeadingRevealTarget` |
| `private/document-headings-parser.ts` | Markdown → `DocumentHeading[]` (pure, unit-testable) |
| `private/quill-heading-reveal.ts` | Quill delta scan + ordinal resolution + centered-scroll math |

Consumers: `sidebar-contents-content.tsx` (parser) and `editor-session-lifecycle.ts` (reveal helpers). Neither imports the private files. `HeadingRevealTarget` is declared in `project-editor-types.ts` (the Electron build reaches that file via `src/shared/sidebar-utils.ts`, so it must stay free of Quill/DOM types) and re-exported by the facade; `editor-session-find-visual.ts` imports `computeCenteredScrollTop` from the facade, keeping one centering implementation (invariant 5).

## Heading extraction contract (parser)

1:1 with spec §4:

- Strip YAML frontmatter before scanning.
- Track fenced code blocks (` ``` ` and `~~~`); lines inside fences are never headings.
- ATX only: `^(#{1,3})\s+` (a space is required after the marker; `#nospace` is not a heading). H4+ ignored.
- Strip closing hashes (`## Title ##` → `Title`).
- Strip inline markers from display text: `**`, `*`, `__`, `_`, `~~`, backticks.
- Omit headings whose text is empty after stripping.
- Output: `[{ level: 1|2|3, text, ordinal }]` where `ordinal` is the 0-based position in the full heading list.

## Quill heading identity

- Quill stores `header` as a **line attribute on the newline op**. `scanQuillHeadings(editor)` walks `editor.getContents().ops`, accumulating line-start indexes; when an op is `\n` carrying `attributes.header` in `{1,2,3}`, it records `{ index: lineStart, level, text }`.
- **Ordinal identity**: the parser list and the Quill list are both in document order, so panel row N maps to the Nth Quill heading. This is the only robust key — duplicate texts are common and image placeholders shift raw offsets.
- **Drift tolerance** (spec §6.3): within the debounce window the two lists can disagree. Clamp the ordinal to `[0, count-1]`; never throw. Text is display-only plus a sanity fallback, never the primary key.

## Reveal mechanics

- **Bounds**: `editor.getBounds(index, 1)` returns live DOM coordinates relative to `quill.container`. Because those coordinates move as the container scrolls, convert them to a stable content offset by adding the current `container.scrollTop` (see `mds/lessons-learned/quill-getbounds-container-reference.md`).
- **Centered scroll**: `target = clamp(container.scrollTop + bounds.top - (container.clientHeight / 2 - bounds.height / 2), 0, maxScroll)` — the same math as `handleFocusModeMatch` in `editor-session-find-visual.ts`. Reuse it; do not invent a second centering formula.
- **Settle re-assert**: re-run the scroll after ~150 ms (the `REVEAL_SETTLE_DELAY_MS` pattern from `editor-session-find-visual.ts`) — image hydration can shift layout after the first pass and undo the reveal.
- **Caret + focus**: `editor.setSelection(index, 0, 'silent')` then `editor.focus({ preventScroll: true })`. Preventing Quill's automatic nearest-edge scroll is required so the custom centered scroll owns the final position. Selection changes never mark the document dirty (spec §6.4). When the editor is disabled (read-only revision preview), skip `focus()`; the scroll still applies (spec §5.4).
- **Focus mode**: unreachable from the panel in slice 1 (sidebar hidden/locked). The helper is deliberately mode-agnostic so slice 3 (palette) can reuse it under focus mode, where the centering matches focus-mode scroll behavior.

## Command path and split-pane rules

1. The panel calls `useEditorActions().revealDocumentHeading(target)` — the actions context is a stable facade (see `mds/lessons-learned/stable-context-facade-prevents-preact-consumer-rerenders.md`), so consumers do not re-render on unrelated state changes.
2. The workspace action reads `workspaceLayout.activePane` from **layout state** (synchronous, decisional) — never infers the pane from document state (rule from `mds/architecture/split-pane-coordination.md`).
3. `PaneWorkspace.revealHeadingInPane(pane, target)` mirrors `flushPaneContent`: `getEditorSessionRefForPane(pane, this.editorSessionRefs).current?.revealHeading(target)`. The inactive pane's session is never touched.
4. The core `EditorSession` interface (`project-editor-types.ts`) gains `revealHeading(target: HeadingRevealTarget): void` — keeping the minimal Electron-safe seam (see `mds/lessons-learned/editor-session-electron-type-seam.md`); the full renderer interface (`editor-session-types.ts`) inherits it. `HeadingRevealTarget` is a plain type (`{ ordinal, level, text }`) with no Quill imports, safe for the shared types file.
5. Implemented in `EditorSessionImpl` (`editor-session-lifecycle.ts`) using the `document-contents` facade helpers; exposed through the orchestration facade (`editor-session-orchestration.ts`).

## State subscription constraint (critical)

Do **NOT** add `editorValue` to `SidebarProjectState` or `useProjectEditorShellState`. That memoized shell boundary was deliberately narrowed so typing only re-renders pane/editor surfaces (`mds/plan/done/use-project-editor-keystroke-churn-plan.md`, issue #4). `editorValue` changes on every debounced flush (~1 s while typing); putting it in shell state would re-render the entire sidebar on every flush.

Instead:

- A new narrow `DocumentContentsContext` (`{ editorValue, documentType, selectedPath }`, memoized on those three values) is provided in `project-editor-view.tsx`, next to `SidebarStateProvider`.
- Only `SidebarContentsContent` consumes it. Context propagation bypasses the `memo()`'d `ProjectEditorSidebarShell` without re-rendering it (stable props at the call site — see `mds/lessons-learned/memo-boundaries-need-stable-props-at-the-call-site.md`).
- The panel re-render on each flush is cheap: one `O(lines)` parse on a debounced cadence.

## Sidebar plumbing

- `SidebarSection` gains `'contents'` (`project-editor-types.ts`).
- `ContentSidebarSection` Exclude gains `'contents'` (`sidebar-section-roots.ts`) — Contents has no folder root, like `search`/`settings`/`transfer`.
- Rail item + `ContentsIcon` in `sidebar-rail.tsx` / `sidebar-rail-icons.tsx`; positioned right after the Manuscript explorer (closest kin to the current document; trivial to reorder).
- `SidebarPanelBody` branch renders `SidebarContentsContent` (in `sidebar-panel/private/`), the same pattern as `SidebarSearchContent`.
- Panel states per spec §5.3: no document / no headings / non-text document (`documentType` from context; `map` and `relationships` → unavailable state).
- The panel derives everything from state on each render; no cached heading list survives a document switch.

## Invariants

1. Heading identity is ordinal-based; text is display-only plus sanity fallback.
2. Reveal never mutates content, never marks the pane dirty, never touches the inactive pane.
3. `editorValue`/`documentType` reach the panel **only** through the narrow `DocumentContentsContext`.
4. Parser and Quill scan share one heading definition (levels 1–3); the parser ignores anything Quill would not render as a header line (fences, frontmatter). The two must not drift apart.
5. Reveal scroll math is shared with the find/focus centering formula — one centering implementation, no copies.

## Regression hotspots

| Symptom | Likely cause | First check |
|---------|--------------|-------------|
| Whole sidebar re-renders while typing | `editorValue` leaked into shell state/context | `DocumentContentsContext` has exactly one consumer; run `tests/project-editor-view-render-split.test.ts` |
| Click lands one heading off | ordinal drift inside the debounce window | clamp logic; compare parser count vs `scanQuillHeadings` count |
| Scroll lands near the top or at a wrong offset | Current `scrollTop` omitted when converting live `getBounds` coordinates, or focus auto-scroll ran first | Add `container.scrollTop` in the centering formula and focus with `{ preventScroll: true }` |
| Reveal jumps back after images load | layout shift after the first pass | 150 ms settle re-assert |
| Panel test silently not running | `.test.tsx` excluded by the Vitest glob | tests must be `.test.ts` (see `mds/lessons-learned/vitest-include-pattern-can-skip-test-tsx-files.md`) |

## Focused tests

```bash
npm run test -- tests/document-contents-parser.test.ts tests/document-contents-reveal.test.ts tests/sidebar-contents-panel.test.ts
# Regression neighbors:
npm run test -- tests/project-editor-view-render-split.test.ts tests/sidebar-panels.test.ts tests/editor-session.test.ts
```

## Deferred slices (reuse notes)

- **Slice 2 — scroll-spy**: `EditorSession` publishes the active heading ordinal on selection/scroll; requires a small event seam out of the session. Design it here before building.
- **Slice 3 — quick-jump palette**: reuses the parser + `revealQuillHeading` under focus mode; keyboard shortcut registration follows `mds/architecture/keyboard-shortcuts-architecture.md`.
- **Slice 4 — drag-reorder**: moves whole text blocks; needs serialization-level section extraction. Not designed yet.

## See also

- `mds/spec/document-contents-navigation-spec.md` — behavior and acceptance criteria
- `mds/plan/done/document-contents-navigation-implementation-plan.md` — slice 1 execution plan
- `mds/architecture/sidebar-architecture.md` — rail/panel extension points
- `mds/architecture/split-pane-coordination.md` — active-pane rules, `PaneWorkspace` facade
- `mds/architecture/editor-serialization-debounce-architecture.md` — debounce, session refs, `EditorSession` seam
- `mds/architecture/focus-mode-architecture.md` — sidebar lock invariant, scroll centering
