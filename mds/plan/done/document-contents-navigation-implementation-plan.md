# Document Contents Navigation — Implementation Plan (Slice 1)

> **Status:** Complete (slice 1, 2026-07-21) — all acceptance criteria pass. Gates: `npm run lint` ✅ · full suite 117/117 files, 950/950 tests ✅ (`scripts/run-tests.ps1`) · `npm run build` ✅.
> Spec: `mds/spec/document-contents-navigation-spec.md` · Architecture: `mds/architecture/document-contents-architecture.md`

## 1. Goal and scope

Deliver slice 1 of the Contents feature: a **Contents** sidebar rail section listing the active pane's H1–H3 headings, with click-to-navigate (centered scroll + caret placement). Deferred slices (scroll-spy, palette, drag-reorder) are explicitly out of scope.

## 2. Constraints and conventions

- `max-lines: 200` / `max-lines-per-function: 50` — keep parser, scan, and panel in small focused files.
- Hook naming convention: every `useEffect`/`useMemo`/`useCallback` gets a `/* descriptiveName */` comment and `/*Inputs for ...*/` dependency docs.
- Deep modules: new code lives in `document-contents/` (facade only) and `sidebar-panel/private/`; no cross-imports of private files.
- Tests must be `tests/*.test.ts` (`.test.tsx` is silently excluded by the Vitest glob — see `mds/lessons-learned/vitest-include-pattern-can-skip-test-tsx-files.md`). Follow existing `.test.ts` render patterns (`h()` calls, `getQuillInstance(container)`).
- Sidebar `.tsx` imports keep the explicit `.tsx` extension.
- Do **not** add `editorValue` to `SidebarProjectState` / `useProjectEditorShellState` (keystroke-churn regression — see architecture doc § State subscription constraint).

## 3. Files to create

| File | Responsibility |
|------|----------------|
| `src/features/project-editor/document-contents/index.ts` | Facade: parser + reveal helpers + types |
| `src/features/project-editor/document-contents/private/document-headings-parser.ts` | `parseDocumentHeadings(markdown): DocumentHeading[]` |
| `src/features/project-editor/document-contents/private/quill-heading-reveal.ts` | `scanQuillHeadings(editor)`, `revealQuillHeading(host, editor, target)` |
| `src/features/project-editor/components/sidebar/sidebar-panel/private/sidebar-contents-content.tsx` | Panel: rows, indentation, empty/unavailable states, click dispatch |
| `src/features/project-editor/components/sidebar/document-contents-context.tsx` | Narrow `DocumentContentsContext` provider + `useDocumentContentsState()` |
| `tests/document-contents-parser.test.ts` | Parser coverage (spec §4) |
| `tests/document-contents-reveal.test.ts` | Scan + ordinal clamp + reveal on a real Quill instance |
| `tests/sidebar-contents-panel.test.ts` | Panel wiring: states, rows, click dispatch |

## 4. Files to modify

| File | Change |
|------|--------|
| `src/features/project-editor/project-editor-types.ts` | `SidebarSection` += `'contents'`; core `EditorSession` += `revealHeading(target: HeadingRevealTarget): void`; `ProjectEditorActions` += `revealDocumentHeading` |
| `src/features/project-editor/components/sidebar/sidebar-section-roots.ts` | `ContentSidebarSection` Exclude += `'contents'` |
| `src/features/project-editor/components/sidebar/sidebar-panel/private/sidebar-rail.tsx` | Rail item after Manuscript explorer: `{ section: 'contents', title: 'Document contents', icon: ContentsIcon }` |
| `src/features/project-editor/components/sidebar/sidebar-panel/private/sidebar-rail-icons.tsx` | New `ContentsIcon` (indented list glyph) |
| `src/features/project-editor/components/sidebar/sidebar-panel/private/sidebar-panel-body.tsx` | Branch: `sidebarActiveSection === 'contents'` → `<SidebarContentsContent />` |
| `src/features/project-editor/pane/pane-workspace.ts` | `revealHeadingInPane(pane, target)` mirroring `flushPaneContent` |
| `src/features/project-editor/workspace-actions.ts` | `revealDocumentHeading(target)`: resolve `activePane` from layout state → `paneWorkspace.revealHeadingInPane` |
| `src/features/project-editor/pane/rich-markdown-editor/editor-session/editor-session-private/editor-session-lifecycle.ts` | `EditorSessionImpl.revealHeading()` using `document-contents` reveal helpers |
| `src/features/project-editor/pane/rich-markdown-editor/editor-session/editor-session-private/editor-session-orchestration.ts` | Expose `revealHeading` on the session facade |
| `src/features/project-editor/project-editor-view.tsx` | Mount `DocumentContentsProvider` beside `SidebarStateProvider` |
| `src/styles/…` sidebar stylesheet | Row/indentation/empty-state styles (locate the sidebar styles file during S3; follow existing naming) |

## 5. Execution slices

### S1 — Parser module

1. Create `document-contents/` deep module (facade + private parser) with `DocumentHeading` / `HeadingRevealTarget` types.
2. Implement `parseDocumentHeadings` per architecture doc § Heading extraction contract.
3. `tests/document-contents-parser.test.ts`: frontmatter, ` ``` `/`~~~` fences, closed ATX, inline formatting, empty headings, duplicates, H4 ignored, `#nospace` rejected, ordinal sequence.
4. Gate: `npm run test -- tests/document-contents-parser.test.ts` + `npm run lint`.

### S2 — Reveal path (session → PaneWorkspace → action)

1. Implement `scanQuillHeadings` + `revealQuillHeading` in `document-contents/private/quill-heading-reveal.ts` (find-visual centering math + 150 ms settle re-assert).
2. Core `EditorSession` interface += `revealHeading`; implement in `EditorSessionImpl`; expose via orchestration facade.
3. `PaneWorkspace.revealHeadingInPane(pane, target)` mirroring `flushPaneContent`.
4. Workspace action `revealDocumentHeading(target)` resolving `activePane` from layout state; register in `ProjectEditorActions`.
5. `tests/document-contents-reveal.test.ts`: real Quill mount (`getQuillInstance(container)` pattern), ordinal resolution, clamp on out-of-range, caret placement, no dirty mark.
6. Gate: focused tests + `npm run lint`.

### S3 — Panel + sidebar plumbing

1. `DocumentContentsContext` + provider in `project-editor-view.tsx`.
2. `SidebarSection`/`ContentSidebarSection` type updates, rail item + `ContentsIcon`, `SidebarPanelBody` branch.
3. `SidebarContentsContent`: heading rows with level indentation, ellipsis + tooltip, empty/unavailable states per spec §5.3, click → `revealDocumentHeading`.
4. Styles in the sidebar stylesheet (row, indentation, empty state).
5. `tests/sidebar-contents-panel.test.ts`: states render, rows render in order, click dispatches the action with the right ordinal.
6. Manual checks: split mode (panel follows active pane), revision preview (navigation works), focus mode enter/exit (no stale rendering).
7. Gate: focused tests + `tests/project-editor-view-render-split.test.ts` + `tests/sidebar-panels.test.ts` + `npm run lint`.

### S4 — Quality gates + docs

1. `npm run lint`, `npm run test` (full), `npm run build`.
2. Documentation checklist (mandatory — see §8).

## 6. Test plan

| Test file | Covers |
|-----------|--------|
| `tests/document-contents-parser.test.ts` | Spec §4 extraction rules |
| `tests/document-contents-reveal.test.ts` | Ordinal identity, clamp, caret/scroll, no dirty |
| `tests/sidebar-contents-panel.test.ts` | States, rows, click dispatch |
| `tests/project-editor-view-render-split.test.ts` | No shell re-render regression from the new context |
| `tests/sidebar-panels.test.ts` | Rail/section regression |

## 7. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Keystroke churn: sidebar re-renders on every debounced flush | Narrow `DocumentContentsContext` consumed only by the panel; verified by `project-editor-view-render-split` test |
| Ordinal drift between parser and Quill inside the debounce window | Clamp per spec §6.3; never match by text |
| Scroll offset bugs from `getBounds` coordinate space | Reuse find-visual centering math; cite `quill-getbounds-container-reference` lesson |
| Reveal undone by late image hydration | 150 ms settle re-assert (find-visual pattern) |
| Lint limits force mid-work file splits | Files are pre-split by design (parser / scan / panel / context) |

## 8. Documentation checklist (mandatory before closing)

1. `mds/live/file-map.md` — register every new TS/TSX file with its responsibility.
2. `mds/architecture/README.md` — index row for `document-contents-architecture.md`.
3. `mds/plan/README.md` — index row for this plan.
4. `mds/START-HERE.md` — update the routing row to the full spec → architecture → plan chain (replace the "pending" note).
5. `mds/spec/document-contents-navigation-spec.md` §10 — link the architecture doc and this plan.
6. `mds/live/current-status.md` — mark the feature implemented with the focused-test baseline.
7. `mds/lessons-learned/` — add entries for any counter-intuitive discovery made during implementation.
8. Move this plan to `mds/plan/done/` once acceptance criteria pass.

## 9. Acceptance

Mirror of spec §8: all 10 criteria, including quality gates. Slice 1 is done when they pass and §8 checklist is complete.

