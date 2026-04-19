# Wiki Tag Links - System Guide and Debug Playbook

> Purpose: provide a single operational map for future changes and bugfixes so contributors do not need broad exploratory searches.

Related docs:
- `docs/spec/wiki-tag-links-spec.md` (what the feature should do)
- `docs/plan/done/wiki-tag-links-implementation-plan.md` (what was implemented)
- `docs/live/troubleshooting.md` (cross-feature runtime issues)
- `docs/lessons-learned/README.md` (counter-intuitive facts and effective strategies relevant to this subsystem)

## 1. End-to-end architecture

### 1.1 Source of truth

- Tags are declared in Lore file frontmatter (`tags` array).
- Frontmatter parser: `electron/services/frontmatter.ts`
- Tag index owner: `electron/services/tag-index-service.ts`

Canonical mapping:
- key: lowercase trimmed tag text
- value: project-relative file path

### 1.2 Runtime lifecycle

1. Project opens.
2. Scanner/reconcile builds `markdownFiles` and `metaByPath`.
3. Main process builds in-memory tag index through `TagIndexService.buildIndex(...)`.
4. Renderer fetches tag index via IPC (`getTagIndex`).
5. Rich editor scans document text for matches and computes visual overlays.
6. Ctrl/Cmd+click hit-test resolves clicked match and opens target file in pane.

Critical invariant:
- Any write flow that can change frontmatter tags must rebuild active in-memory tag index before returning success to renderer.

## 2. File map by responsibility

### 2.1 Main process and IPC

- `electron/services/tag-index-service.ts`
  - Build and resolve tag mappings.
  - Longest-match-first + deterministic duplicate handling.
- `electron/ipc-runtime.ts`
  - Holds active `TagIndexService` per active project.
- `electron/ipc/handlers/tag-handlers.ts`
  - `getTagIndex` and `resolveTag` endpoints.
- `electron/ipc/handlers/project-handlers/document-handlers.ts`
  - Rebuild trigger after save/create/delete flows.
- `electron/ipc/handlers/project-handlers/folder-handlers.ts`
  - Rebuild trigger after folder operations that can affect lore files.
- `electron/ipc/handlers/project-handlers/order-handlers.ts`
  - Reconcile/rebuild calls used in reorder/update flows.
- `src/shared/ipc.ts` and `src/shared/ipc-tag.ts`
  - Channel names, schemas, payload/response contracts.
- `electron/preload.cts`
  - Renderer bridge methods (`window.tramaApi`).
- `src/types/trama-api.d.ts`
  - Renderer-side API typings.

### 2.2 Renderer state and editor integration

- `src/features/project-editor/use-tag-index.ts`
  - Fetch/cache/invalidate tag index in renderer.
- `src/features/project-editor/components/rich-markdown-editor-tag-helpers.ts`
  - Pure matching rules (boundaries, overlap, code exclusion).
- `src/features/project-editor/components/rich-markdown-editor-tag-overlay.ts`
  - Build overlay ranges and match bounds.
- `src/features/project-editor/components/rich-markdown-editor-tag-highlights.tsx`
  - Visual underline overlay rendering.
- `src/features/project-editor/components/rich-markdown-editor.tsx`
  - Ctrl/Cmd interaction and click routing.
- `src/features/project-editor/components/workspace-editor-panels.tsx`
  - Tag click target pane behavior.

### 2.3 Tests

- `tests/tag-index-service.test.ts`
  - Build index + resolve behavior.
- `tests/tag-index-ipc-regression.test.ts`
  - Save/update/remove tag index freshness across IPC.
- `tests/rich-markdown-editor-tag-overlay.test.ts`
  - Mapping correctness from text offsets to Quill document indexes.

## 3. Matching and rendering model

### 3.1 Matching pipeline

1. Read plain text from editor (`getText`).
2. Find candidate tag matches (case-insensitive, word boundaries).
3. Remove overlaps with longest-match-first policy.
4. Exclude code block and indented code matches.
5. Convert match offsets to editor positioning model.
6. Render underlines while Ctrl/Cmd is pressed.

### 3.2 Critical Quill indexing rule

Do not assume plain-text offsets are Quill document indexes.

- `getText()` omits embeds.
- Quill document indexes count embeds as length `1`.

Always map plain-text offsets through Delta ops before calling APIs expecting Quill indexes (`getBounds`, selection APIs, hit-tests derived from bounds).

See:
- `docs/lessons-learned/quill-getbounds-container-reference.md`
- `docs/lessons-learned/quill-text-vs-delta-index-mismatch.md`

### 3.3 Coordinate reference rule

`quill.getBounds()` is relative to `quill.container`, not `quill.root`.

If converting to shell/viewport coordinates, use `editor.container.getBoundingClientRect()` as the reference rectangle.

## 4. Fast debug playbook (Wiki Tags)

Use this sequence to avoid broad searches.

### Step 1: classify symptom

- Navigation stale/missing after save -> likely index freshness (main process rebuild path).
- Underline misplaced/too wide -> likely Quill index or coordinate reference mismatch.
- Ctrl/Cmd click intermittent -> likely modifier event timing/race handling.
- Tag exists but not matched -> likely boundaries/code exclusion/tag normalization.

### Step 2: check minimal files by symptom

Stale index after save:
- `electron/ipc/handlers/project-handlers/document-handlers.ts`
- `electron/ipc-runtime.ts`
- `electron/services/tag-index-service.ts`
- `src/features/project-editor/use-tag-index.ts`

Underline offset/line spill:
- `src/features/project-editor/components/rich-markdown-editor-tag-overlay.ts`
- `src/features/project-editor/components/rich-markdown-editor.tsx`
- `src/features/project-editor/components/rich-markdown-editor-tag-highlights.tsx`

Matching false positives/negatives:
- `src/features/project-editor/components/rich-markdown-editor-tag-helpers.ts`
- `electron/services/tag-index-service.ts`

Modifier-click issues:
- `src/features/project-editor/components/rich-markdown-editor.tsx`
- `src/features/project-editor/components/rich-markdown-editor-ctrl-key.ts`
- `docs/lessons-learned/wiki-tag-modifier-click-race.md`

### Step 3: run focused tests

- `npm run test -- tests/tag-index-service.test.ts`
- `npm run test -- tests/tag-index-ipc-regression.test.ts`
- `npm run test -- tests/rich-markdown-editor-tag-overlay.test.ts`

### Step 4: manual validation script

1. Ensure lore file has frontmatter tags (for example `aina`, `lirio`).
2. Open a book scene containing those words in normal text.
3. Hold Ctrl/Cmd and verify underline starts/ends exactly on tagged word.
4. Verify no underline inside fenced or indented code.
5. Ctrl/Cmd+click tag and confirm correct pane open behavior.
6. Edit tags in lore frontmatter, save, and repeat steps 2-5 without restart.

## 5. Known failure modes and where they were solved

- Stale tag index after save:
  - fixed by rebuilding active in-memory tag index in write flows.
  - lesson: `docs/lessons-learned/tag-index-stale-after-save.md`

- Ctrl/Cmd click race:
  - fixed by using event modifier state in click path.
  - lesson: `docs/lessons-learned/wiki-tag-modifier-click-race.md`

- Bounds drift due to wrong rectangle reference:
  - fixed by using `quill.container` coordinate reference.
  - lesson: `docs/lessons-learned/quill-getbounds-container-reference.md`

- Underline shifted or line-wide after embeds:
  - fixed by mapping text offsets to Quill indexes via Delta ops.
  - lesson: `docs/lessons-learned/quill-text-vs-delta-index-mismatch.md`

## 6. Change checklist for future Wiki Tag work

Before coding:
1. Read this guide + spec + relevant lessons learned files.
2. Identify whether change touches matching, indexing, IPC, or rendering.
3. List exact files to touch before implementation.

During implementation:
1. Keep matching helpers pure and separately testable.
2. Keep Quill index and coordinate conversions explicit.
3. Update both preload bridge and typings when IPC contract changes.
4. Ensure write flows refresh active tag index when tags may change.

Before merge:
1. Focused tests above pass.
2. Relevant docs updated (`spec`, this guide, troubleshooting/lessons as needed).
3. Fast routing in `docs/START-HERE.md` remains accurate.
