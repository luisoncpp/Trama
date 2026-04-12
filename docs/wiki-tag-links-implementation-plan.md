# Wiki Tag Links - Implementation Plan

Date: 2026-04-11
Status: Ready for implementation
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
- Visual underline only while Ctrl/Cmd is pressed.

## 4. Architecture changes

### 4.1 Main process

Create:
- `electron/services/tag-index-service.ts`

Responsibilities:
- Build and maintain `Map<string, string>` (`lowerTag -> filePath`).
- Resolve runtime text to file path with longest-match-first.
- Handle duplicates deterministically and log warning.

Modify:
- `electron/services/frontmatter.ts`
  - Ensure `tags` extraction normalized to `string[]`.
- `electron/services/watcher-service.ts`
  - Trigger tag index refresh/invalidation on create/save/delete/rename affecting Lore files.

### 4.2 IPC contract

Modify in strict order:
1. `src/shared/ipc.ts`
   - Add channels:
     - `trama:tag:getIndex`
     - `trama:tag:resolve`
   - Add Zod request/response schemas.
2. `electron/ipc/handlers/` (new `tag-handlers.ts`)
   - Implement handlers using TagIndexService.
3. `electron/ipc.ts`
   - Register new handlers.
4. `electron/preload.cts`
   - Expose `getTagIndex()` and `resolveTag()`.
5. `src/types/trama-api.d.ts`
   - Add bridge typings.

### 4.3 Renderer

Create:
- `src/features/project-editor/use-tag-index.ts`
  - Fetch/cache index.
  - Invalidate on project open and watcher refresh events.
- `src/features/project-editor/components/rich-markdown-editor-tag-helpers.ts`
  - Pure matching helpers (boundaries, case-insensitive, longest-match).
- `src/features/project-editor/components/rich-markdown-editor-tag-overlay.ts`
  - Quill overlay/decorator integration.

Modify:
- `src/features/project-editor/components/rich-markdown-editor.tsx`
  - Wire overlay component.
- `src/features/project-editor/components/rich-markdown-editor-core.ts`
  - Ctrl/Cmd state listener.
  - Ctrl/Cmd+click navigation to matching Lore file.
  - Open in secondary pane in split mode; otherwise primary pane.

## 5. Recommended implementation sequence

1. Build `tag-index-service.ts` + unit tests first.
2. Add IPC channels + preload + typings.
3. Add `use-tag-index.ts` and connect to project open lifecycle.
4. Add pure matching helpers and test edge cases.
5. Add overlay + Ctrl/Cmd interaction in editor core.
6. Add click navigation tests (split/non-split).
7. Run full quality gates.

## 6. Test plan

Create:
- `tests/tag-index-service.test.ts`
  - Build index, update behaviors, duplicate tags, resolve path.
- `tests/tag-matching.test.ts`
  - Longest match, case insensitivity, word boundaries, code exclusion.
- `tests/tag-click-navigation.test.ts`
  - Ctrl/Cmd+click navigation, pane destination, auto-split behavior.

Regression run:
- `tests/rich-markdown-editor.test.ts`
- `tests/use-project-editor.test.ts`
- `tests/ipc-contract.test.ts`

## 7. Quality gates

Required before merge:
1. `npm run lint`
2. `powershell -ExecutionPolicy Bypass -File scripts/run-tests.ps1`
3. `npm run build`
4. `npm run test:smoke` (if IPC/preload/startup touched)

## 8. Risks and mitigations

Risk: performance hit scanning full text on each key event.
Mitigation: process visible blocks only; debounce recompute; cache normalized tags.

Risk: false positives in rich text boundaries.
Mitigation: centralize boundary logic in pure helpers with dedicated tests.

Risk: stale index after file operations.
Mitigation: refresh index via watcher and operation handlers; add integration tests.

Risk: lint max-lines limits in editor modules.
Mitigation: keep overlay and matching in separate files; avoid expanding core files.

## 9. Done criteria

Feature considered done when:
- Lore tags in frontmatter are discoverable and resolvable from editor text.
- Ctrl/Cmd hold shows link affordance only for valid tag matches.
- Ctrl/Cmd+click opens resolved Lore target in expected pane.
- Longest-match and boundary rules pass tests.
- Build, lint, test, smoke are green.
