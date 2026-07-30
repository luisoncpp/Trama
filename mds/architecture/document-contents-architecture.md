# Document Contents Navigation Architecture

> **Last updated:** 2026-07-23. Status: Contents navigation plus invisible spacer/page-break labels implemented.
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
  → DocumentContentsContext (narrow: editorValue, documentType, selectedPath, canEdit)   [new]
  → parseDocumentHeadings() → DocumentHeading[]               [new pure parser]
  → SidebarContentsContent rows                               [new panel]

Row click
  → actions.revealDocumentHeading({ ordinal, level, text })   [new workspace action]
  → paneWorkspace.revealHeadingInPane(activePane, target)     [new PaneWorkspace method]
  → editorSessionRefs[activePane].current?.revealHeading()    [new EditorSession method]
  → scanQuillHeadings(editor) → ordinal clamp → quill index   [new helper]
  → setSelection + focus + centered scroll (settle re-assert)

Directive label save
  → actions.setDocumentContentsLabel({ ordinal, type, label })
  → paneWorkspace.setLayoutDirectiveLabelInPane(activePane, target)
  → live EditorSession Delta replacement, or source fallback for a blank-line spacer
  → canonical `<!-- trama:spacer/pagebreak ... label="..." -->`
```

## Module layout (new deep module)

`src/features/project-editor/document-contents/` — sibling of `pane/` and `components/`, so both the sidebar panel and the editor session may import its facade (deep-module rules: only `index.ts` is imported from outside).

| File | Responsibility |
|------|----------------|
| `index.ts` | Facade: parser, Quill scan/reveal, and source fallback for directive labels |
| `private/document-headings-parser.ts` | Markdown → `DocumentHeading[]` (pure, unit-testable) |
| `private/document-layout-label.ts` | Source-level label update; converts a labeled blank-line spacer into a canonical spacer directive |
| `private/quill-heading-reveal.ts` | Quill delta scan + ordinal resolution + centered-scroll math |

Consumers: `sidebar-contents-content.tsx` (parser) and `editor-session-lifecycle.ts` (reveal helpers). Neither imports the private files. `HeadingRevealTarget` is declared in `project-editor-types.ts` (the Electron build reaches that file via `src/shared/sidebar-utils.ts`, so it must stay free of Quill/DOM types) and re-exported by the facade; `editor-session-find-visual.ts` imports `computeCenteredScrollTop` from the facade, keeping one centering implementation (invariant 5).

## Heading and layout directive extraction contract (parser)

1:1 with spec §4:

- Strip YAML frontmatter before scanning.
- Track fenced code blocks (` ``` ` and `~~~`); lines inside fences are never extracted.
- ATX headings: `^(#{1,3})\s+` (a space is required after the marker; `#nospace` is not a heading). H4+ ignored.
- Page breaks: `<!-- trama:pagebreak [label=JSON-string] -->` or `<div data-trama-directive="pagebreak">` → `type: 'pagebreak'`; `label`, when present, replaces only the Contents display text.
- Spacers: `<!-- trama:spacer lines=N [label=JSON-string] -->` or `<div data-trama-directive="spacer">` or consecutive blank lines (>= 2) → `type: 'spacer'`; `label`, when present, replaces only the Contents display text.
- Strip closing hashes (`## Title ##` → `Title`).
- Strip inline markers from display text: `**`, `*`, `__`, `_`, `~~`, backticks.
- Omit headings whose text is empty after stripping.
- Output: `[{ level: 1|2|3, text, ordinal, type?: 'heading' | 'pagebreak' | 'spacer', lines?: number, label?: string }]` where `ordinal` is the 0-based position in the full item list. Filter toggles omit rows but never compact these document-global ordinals.

## Quill item identity

- Quill stores `header` as a **line attribute on the newline op**, and layout directives as **block embed blots** (`LayoutDirectiveBlot` under blot name `LAYOUT_DIRECTIVE_BLOT_NAME = 'trama-directive'`).
- `scanQuillHeadings(editor)` walks `editor.getContents().ops`, accumulating line-start indexes. It extracts headers, page break embeds, spacer embeds, and consecutive blank lines.
- **Ordinal identity**: the parser list and the Quill list share identical document ordering, including currently filtered-out page breaks/spacers, so panel row N maps to its document-global Quill item. This is the only robust key — duplicate texts are common and directive embeds shift raw offsets.
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
6. Label updates use the same active-pane rule. A live directive is replaced atomically in Quill so its label never becomes editor text. A source-only blank-line spacer has no Quill embed, so `PaneWorkspace` applies the pure source fallback, marks that pane dirty through the normal content mutation, and the next value sync renders the explicit spacer embed.

## State subscription constraint (critical)

Do **NOT** add `editorValue` to `SidebarProjectState` or `useProjectEditorShellState`. That memoized shell boundary was deliberately narrowed so typing only re-renders pane/editor surfaces (`mds/plan/done/use-project-editor-keystroke-churn-plan.md`, issue #4). `editorValue` changes on every debounced flush (~1 s while typing); putting it in shell state would re-render the entire sidebar on every flush.

Instead:

- A new narrow `DocumentContentsContext` (`{ editorValue, documentType, selectedPath, canEdit }`, memoized on those values) is provided in `project-editor-view.tsx`, next to `SidebarStateProvider`. `canEdit` is false while loading or viewing a read-only revision preview.
- Only `SidebarContentsContent` consumes it. Context propagation bypasses the `memo()`'d `ProjectEditorSidebarShell` without re-rendering it (stable props at the call site — see `mds/lessons-learned/memo-boundaries-need-stable-props-at-the-call-site.md`).
- The panel re-render on each flush is cheap: one `O(lines)` parse on a debounced cadence.

## Sidebar plumbing

- `SidebarSection` gains `'contents'` (`project-editor-types.ts`).
- `ContentSidebarSection` Exclude gains `'contents'` (`sidebar-section-roots.ts`) — Contents has no folder root, like `search`/`settings`/`transfer`.
- Rail item + `ContentsIcon` in `sidebar-rail.tsx` / `sidebar-rail-icons.tsx`; positioned below the Templates section with a visual rail separator (`.sidebar-rail__separator`). Eyebrow label in header is `"TABLE OF CONTENTS"` (`"Table of contents"` transformed via CSS uppercase).
- `SidebarPanelBody` branch renders `SidebarContentsContent` (in `sidebar-panel/private/`), the same pattern as `SidebarSearchContent`.
- Panel states per spec §5.3: no document / no headings / non-text document (`documentType` from context; `map` and `relationships` → unavailable state).
- The panel derives everything from state on each render; no cached heading list survives a document switch.

## Invariants

1. Heading identity is ordinal-based; text is display-only plus sanity fallback.
2. Reveal never mutates content, never marks the pane dirty, never touches the inactive pane.
3. `editorValue`/`documentType` reach the panel **only** through the narrow `DocumentContentsContext`.
4. Parser and Quill scan share one heading definition (levels 1–3); the parser ignores anything Quill would not render as a header line (fences, frontmatter). The two must not drift apart.
5. Reveal scroll math is shared with the find/focus centering formula — one centering implementation, no copies.
6. Labels are data, not editor text: labels are present in canonical comments and Contents only, and must be ignored by reader-facing export renderers.
7. Filtered rows retain document-global ordinals; never use the filtered array index for reveal or mutation.

## Regression hotspots

| Symptom | Likely cause | First check |
|---------|--------------|-------------|
| Whole sidebar re-renders while typing | `editorValue` leaked into shell state/context | `DocumentContentsContext` has exactly one consumer; run `tests/project-editor-view-render-split.test.ts` |
| Click lands one heading off | ordinal drift inside the debounce window | clamp logic; compare parser count vs `scanQuillHeadings` count |
| Scroll lands near the top or at a wrong offset | Current `scrollTop` omitted when converting live `getBounds` coordinates, or focus auto-scroll ran first | Add `container.scrollTop` in the centering formula and focus with `{ preventScroll: true }` |
| Reveal jumps back after images load | layout shift after the first pass | 150 ms settle re-assert |
| Panel test silently not running | `.test.tsx` excluded by the Vitest glob | tests must be `.test.ts` (see `mds/lessons-learned/vitest-include-pattern-can-skip-test-tsx-files.md`) |
| Label edits the wrong item after a toggle | filter compacted ordinal identity | ensure parser and Quill scanner increment ordinal even for omitted item types |
| Blank-line spacer label appears as text | source fallback was bypassed | use `setMarkdownLayoutDirectiveLabel`; it converts the blank run to one canonical spacer comment |

## Focused tests

```bash
npm run test -- tests/document-contents-parser.test.ts tests/document-contents-reveal.test.ts tests/sidebar-contents-panel.test.ts tests/markdown-layout-directives.test.ts
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
