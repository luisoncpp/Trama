# Wiki Tag Links - Implementation Plan

Date: 2026-04-11
Status: **Implemented**
Related: `docs/wiki-tag-links-spec.md`, `docs/phase-4-detailed-plan.md`, `docs/current-status.md`

## 1. Goal

Implement implicit wiki tag links in editor body text, based on Lore frontmatter `tags`, with Ctrl/Cmd+click navigation and longest-match-first resolution.

## 2. Scope and non-scope

In scope:
- Tag extraction from Lore frontmatter (`tags` array).
- Main-process tag index service and resolve logic.
- Typed IPC contract for index fetch and tag resolve.
- Renderer tag index cache hook.
- Editor integration: Ctrl/Cmd hold visual state + Ctrl/Cmd+click navigation.
- Tests for index, matching, and navigation.

Out of scope (later workstreams):
- Graph visualization panel.
- Backlinks panel.
- Tag editor UX beyond frontmatter.

## 3. Functional rules (from spec)

- Tags are case-insensitive.
- Tags can include spaces.
- Word boundaries required (`magia` does not match `magiaoscura`).
- Longest match wins (`norte salvaje` over `norte`).
- Tie-breaker: alphabetically first path.
- Ignore matches inside code blocks and inline code.
- Visual highlight only while Ctrl/Cmd is pressed.

## 4. Architecture changes

### 4.1 Main process

**Created:**
- `electron/services/tag-index-service.ts`
  - Build and maintain `Map<string, string>` (`lowerTag -> filePath`).
  - Resolve runtime text to file path with longest-match-first.
  - Handle duplicates deterministically (alphabetically first path wins).

- `electron/ipc/handlers/tag-handlers.ts`
  - Handlers for `tag:getIndex` and `tag:resolve` IPC channels.

**Modified:**
- `electron/ipc-runtime.ts`
  - Added `TagIndexService` instance management.
  - `setActiveProject()` now also builds tag index.
  - Added `getActiveTagIndexService()`.

- `electron/ipc/handlers/project-handlers/project-open-handler.ts`
  - Passes markdown files and meta to `setActiveProject()` for tag index building.

- `electron/ipc.ts`
  - Register tag handlers.

- `electron/preload.cts`
  - Expose `getTagIndex()` and `resolveTag()`.

### 4.2 IPC contract

**Created:**
- `src/shared/ipc-tag.ts`
  - Contains Zod schemas: `tagGetIndexResponseSchema`, `tagResolveRequestSchema`, `tagResolveResponseSchema`.
  - Types: `TagGetIndexResponse`, `TagResolveRequest`, `TagResolveResponse`.
  - (Extracted to separate file to avoid lint max-lines errors)

- `src/types/trama-api.d.ts`
  - Added bridge typings for `getTagIndex()` and `resolveTag()`.

### 4.3 Renderer

**Created:**
- `src/features/project-editor/use-tag-index.ts`
  - Fetch/cache tag index from main process.
  - Subscribes to external file events for index refresh.

- `src/features/project-editor/components/rich-markdown-editor-tag-helpers.ts`
  - Pure matching helpers: `findTagMatchesInText()`, `isInsideCodeBlock()`, `filterMatchesOutsideCode()`.
  - Case-insensitive, word boundaries, longest-match logic.

- `src/features/project-editor/components/rich-markdown-editor-tag-overlay.ts`
  - `useTagOverlay()` hook for computing tag matches with bounds.
  - `findMatchAtPosition()` for click detection.

- `src/features/project-editor/components/rich-markdown-editor-ctrl-key.ts`
  - `useCtrlKeyState()` hook for tracking Ctrl/Meta key press state.

- `src/features/project-editor/components/rich-markdown-editor-tag-highlights.tsx`
  - `TagHighlights` component for rendering visual overlays on matched tags.

**Modified:**
- `src/features/project-editor/components/rich-markdown-editor.tsx`
  - Added `tagIndex` and `onTagClick` props.
  - Integrated `useTagOverlay()` and Ctrl key handling.

- `src/features/project-editor/components/workspace-editor-panels.tsx`
  - Uses `useTagIndex()` to fetch tag index.
  - Added `openFileInPane` action for tag click navigation.

- `src/features/project-editor/components/editor-panel.tsx`
  - Added `tagIndex` and `onTagClick` props to interface.

- `src/features/project-editor/use-project-editor-layout-actions.ts`
  - Added `useOpenFileInPaneAction()` for opening files in specific panes without flicker.

- `src/features/project-editor/project-editor-types.ts`
  - Added `openFileInPane: (filePath: string, pane: WorkspacePane) => void` to `ProjectEditorActions`.

## 5. Implementation sequence (completed in order)

1. Built `tag-index-service.ts` + unit tests.
2. Added IPC channels (`ipc-tag.ts`) + preload + typings.
3. Added `use-tag-index.ts` and connected to project open lifecycle.
4. Added pure matching helpers (`tag-helpers.ts`) and tested edge cases.
5. Added overlay + Ctrl/Cmd interaction in editor (`tag-overlay.ts`, `tag-highlights.tsx`, `ctrl-key.ts`).
6. Integrated into editor panels with `openFileInPane` for split-mode navigation.
7. Ran full quality gates.

## 6. Test plan

**Created:**
- `tests/tag-index-service.test.ts`
  - Build index, duplicate tags (alphabetical tie-breaker), resolve path, word boundaries, case insensitivity, longest match.

**Passed:**
- All 129 existing tests pass.
- `npm run lint` passes.
- `npm run build` succeeds.

## 7. Quality gates

✅ All completed:
1. `npm run lint`
2. `npm run test` (129 tests passing)
3. `npm run build`
4. `npm run test:smoke` (electron smoke test passing)

## 8. Example project updates

Updated `example-fantasia/` with sample lore files containing tags:
- `lore/characters/Elio.md` - Tags: elio, guardian, sabio, selle
- `lore/characters/Nix.md` - Tags: nix, artesana, mecanica, custodia
- `lore/places/bosque-encantado.md` - Tags: bosque, rio, muntana
- `lore/places/ciudad-principal.md` - Tags: lirio, costa, puerto, comercio
- `lore/systems/magia.md` - Tags: magia, runas, vinculos, corrupcion

## 9. Done criteria

All criteria met:
- ✅ Lore tags in frontmatter are discoverable and resolvable from editor text.
- ✅ Ctrl/Cmd hold shows link highlight only for valid tag matches.
- ✅ Ctrl/Cmd+click opens resolved Lore target in secondary pane (split mode) or primary pane (single mode).
- ✅ Longest-match and boundary rules pass tests.
- ✅ Build, lint, test, smoke are green.
