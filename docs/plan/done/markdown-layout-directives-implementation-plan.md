# Markdown Layout Directives - Implementation Plan

Date: 2026-04-12  
Status: Complete (vertical slice hardened and quality gates green)  
Related: `docs/markdown-layout-directives-spec.md`, `docs/ai-import-export-implementation-map.md`

## 1. Goal

Implement invisible Markdown layout directives (`center`, `spacer`, `pagebreak`) with safe round-trip through Quill and preservation in current export outputs.

## 2. Current baseline (important)

Implemented export surfaces today:

1. AI export for multiple files (`=== FILE: ... ===` format).
2. Copy as Markdown from Quill editor context menu.

Notes for planning:

- AI export reads from files on disk, so preserved directives must be saved in markdown source.
- Copy as Markdown currently serializes editor HTML back to markdown using Turndown in renderer flow.
- EPUB/MOBI direct exporter is not implemented yet in product flow; spec mapping remains forward-compatible design work.

## 2.1 Current implementation progress (2026-04-12)

Done already:

1. Shared directive utilities created in `src/shared/markdown-layout-directives.ts`.
2. Parser behaviors covered in tests (`tests/markdown-layout-directives.test.ts`):
   - valid directives parse correctly
   - invalid `spacer lines` falls back to `1` with warning
   - unknown `trama:*` directives preserved for serialization
3. Editor load path now runs directive artifact pre-pass before Markdown HTML ingestion:
   - `src/features/project-editor/components/rich-markdown-editor-core.ts`
4. Turndown rule added to serialize directive artifacts back to canonical comments:
   - `src/features/project-editor/components/rich-markdown-editor.tsx`
5. Focused regression tests executed successfully for current baseline:
   - `tests/markdown-layout-directives.test.ts`
   - `tests/paste-markdown.test.ts`
   - `tests/ai-export-service.test.ts`
6. Quill-native layout directive model wired for current vertical slice:
   - registered `BlockEmbed` layout directive blot in `src/features/project-editor/components/rich-markdown-editor-layout-blots.ts`
   - registered clipboard matcher mapping directive artifact nodes -> embed Delta ops in `src/features/project-editor/components/rich-markdown-editor-layout-clipboard.ts`
7. Copy-as-markdown directive preservation regression assertion re-enabled:
   - `tests/paste-markdown.test.ts`
8. Editor behavior and round-trip hardening tests added:
   - atomic pagebreak embed length/delete behavior in `tests/rich-markdown-editor.test.ts`
   - source -> editor -> source preservation with user edit in `tests/rich-markdown-editor.test.ts`
9. Center directive visual behavior hardened in editor:
   - boundary-aware centered styling sync for blocks between `center:start/end` in `src/features/project-editor/components/rich-markdown-editor-layout-centering.ts`
   - regression check in `tests/rich-markdown-editor.test.ts`
10. Copy-as-markdown behavior aligned with selection semantics:
   - copy uses current selection when present and falls back to full document otherwise
   - regression checks for selection-only copy and selection crossing a pagebreak directive in `tests/paste-markdown.test.ts`
11. Pagebreak keyboard traversal semantics now explicitly hardened:
   - dedicated ArrowLeft/ArrowRight bindings for atomic embed traversal in `src/features/project-editor/components/rich-markdown-editor-layout-keyboard.ts`
   - explicit traversal regression checks in `tests/rich-markdown-editor.test.ts`
12. Richer round-trip ordering regression added:
   - multi-paragraph insert/remove near directive boundaries keeps directive ordering stable in `tests/rich-markdown-editor.test.ts`
13. Full quality gates executed and passing for this vertical slice:
   - `npm run lint`
   - `npm run test` (via `scripts/run-tests.ps1` / task `Run Tests & Report`)
   - `npm run build`


Status by phase:

- Phase 1 (Shared parser/serializer): Mostly complete.
- Phase 2 (Quill in-editor model): Complete (blot + matcher + keyboard traversal semantics).
- Phase 3 (Serialization back to markdown): Complete for current product surfaces.
- Phase 4 (Export integration): AI export path already transparent; copy-as-markdown directive regression now covered in tests.
- Phase 5 (Hardening/tests): Complete.

## 3. Scope and non-scope

In scope now:

1. Parse directives from markdown before loading into Quill.
2. Represent directives as semantic editor objects using Quill/Parchment custom blots (not raw DOM-only markers).
3. Serialize editor state back to canonical markdown directives.
4. Preserve directives in Copy as Markdown and AI export outputs.
5. Add test coverage for parser, round-trip, copy-as-markdown, and AI export preservation.

Implementation note (decision):

- Quill Clipboard does not guarantee exact preservation of input HTML (`dangerouslyPasteHTML` runs matchers and canonicalization).
- Arbitrary custom nodes/attributes can be dropped unless mapped into Quill's document model.
- Therefore, directive persistence must rely on registered blots + clipboard matchers + deterministic serializer.

Out of scope for this implementation pass:

1. Shipping EPUB/MOBI exporter pipeline.
2. New user-facing toolbar controls for inserting directives.
3. Alignment variants beyond center.

## 4. Implementation phases

## Phase 1 - Shared directive parser/serializer

Deliverables:

1. Create shared directive utilities with strict canonical tokens.
2. Parse markdown into:
   - plain markdown (without directive comments)
   - directive node list with position anchors
3. Serializer to reconstruct canonical markdown from editor artifacts.

Files:

- Create: `src/shared/markdown-layout-directives.ts`
- Create tests: `tests/markdown-layout-directives.test.ts`

Acceptance checks:

1. Valid `center/spacer/pagebreak` parsed correctly.
2. Invalid spacer `lines` falls back to `1` with warning.
3. Unknown `trama:*` preserved as raw comment on serialize.

## Phase 2 - Quill integration (load + in-editor model)

Deliverables:

1. Before `marked.parse`, run directive pre-pass.
2. Register custom block embed blot(s) for directive objects (`pagebreak`, `spacer`, `center:start/end`, `unknown`).
3. Add Clipboard matcher(s) that convert directive artifact nodes into embed Delta ops.
4. Render pagebreak as atomic object in Quill (single cursor step, delete as one unit).

Files:

- Modify: `src/features/project-editor/components/rich-markdown-editor-core.ts`
- Create: `src/features/project-editor/components/rich-markdown-editor-layout-blots.ts`
- Create: `src/features/project-editor/components/rich-markdown-editor-layout-clipboard.ts`
- Optional create (if split needed for lint):
   - `src/features/project-editor/components/rich-markdown-editor-layout-directives.ts`

Acceptance checks:

1. Opening markdown with directives does not show raw comments in editor.
2. Pagebreak appears as tall separator.
3. Cursor crosses pagebreak as one object.
4. Deleting pagebreak removes full object.
5. Reloading editor preserves directive objects across Quill normalization.

## Phase 3 - Quill serialization back to markdown

Deliverables:

1. Extend HTML -> markdown conversion to detect directive blots/artifacts and re-emit canonical comments.
2. Re-emit canonical comments:
   - `<!-- trama:center:start -->`
   - `<!-- trama:center:end -->`
   - `<!-- trama:spacer lines=N -->`
   - `<!-- trama:pagebreak -->`
3. Preserve unknown `trama:*` directives as raw canonical comments when possible.
4. Maintain existing markdown normalization behavior.

Files:

- Modify: `src/features/project-editor/components/rich-markdown-editor-core.ts`
- Optional create: `src/features/project-editor/components/rich-markdown-editor-markdown-serialize.ts`

Acceptance checks:

1. Round-trip preserves directives (source -> editor -> source).
2. Non-directive markdown formatting remains stable.
3. Unknown directives are not silently lost.

## Phase 4 - Export integration (current product surfaces)

Deliverables:

1. Copy as Markdown includes directives from current Quill content.
2. AI export includes directives from file content unchanged.
3. No sanitizer step removes `trama:*` comments in export paths.

Files:

- Verify/modify: `src/features/project-editor/components/rich-markdown-editor-core.ts`
- Verify/modify: `electron/services/ai-export-service.ts`
- Verify/modify: `src/features/project-editor/use-ai-export.ts`

Acceptance checks:

1. Copy as Markdown output contains directives when present.
2. AI export output contains directives for selected files.
3. `includeFrontmatter=false` does not affect directive comments in body.

## Phase 5 - Tests and hardening

Deliverables:

1. Unit tests for parser/serializer edge cases.
2. Editor behavior tests for pagebreak atomic traversal.
3. Regression tests for copy-as-markdown and AI export preservation.

Files:

- Create/modify: `tests/rich-markdown-editor-layout-directives.test.ts`
- Modify: `tests/rich-markdown-editor.test.ts`
- Modify: `tests/ai-export-service.test.ts`
- Modify/add: `tests/use-ai-export.test.ts`

Acceptance checks:

1. `npm run lint` passes.
2. `npm run test` passes.
3. `npm run build` passes.

## 5. Detailed task checklist

1. Build `extractDirectives()` with line/offset anchors.
2. Build `renderDirectiveArtifactsToHtml()` for editor load.
3. Register Quill blot/embed for directive objects (start with pagebreak vertical slice).
4. Add Clipboard matcher mapping directive artifact nodes -> Delta embeds.
5. Add serializer rule for directive blots/artifacts.
6. Wire serialization path used by `copy-as-markdown`.
7. Confirm save flow writes canonical directives back to disk.
8. Verify AI export copy path is transparent (no stripping).
9. Add warnings for malformed directive structure.

## 6. Risks and mitigations

Risk 1: Turndown drops unknown nodes.

- Mitigation: add explicit custom Turndown rules before default conversion.

Risk 1b: Quill canonicalization drops arbitrary custom DOM markers during Clipboard ingest.

- Mitigation: avoid DOM-only persistence; map directives into registered blots via Clipboard matchers.

Risk 2: Quill cursor behavior inconsistent for custom objects.

- Mitigation: implement pagebreak as block embed blot with `contenteditable=false` and dedicated key handling tests.

Risk 3: Directive order drift after edit operations.

- Mitigation: canonical serializer plus deterministic placement rules around block boundaries and embed indices.

Risk 4: Mismatch between expected copy scope and actual scope in Copy as Markdown.

- Mitigation: add explicit test for current behavior and decide product rule (selection-only vs full-document) before release.

## 7. Rollout order recommendation

1. Phase 1 shared parser/serializer baseline.
2. Phase 2 pagebreak vertical slice using blot + matcher + atomic UX tests.
3. Extend Phase 2/3 to spacer + center + unknown directive preservation.
4. Phase 4 export verification.
5. Phase 5 full regression suite and docs update.

## 8. Done criteria

Feature is done when all are true:

1. Directives are invisible in unsupported markdown renderers.
2. Quill displays semantic artifacts, including atomic pagebreak behavior.
3. Saved markdown preserves canonical directives.
4. Copy as Markdown preserves directives.
5. AI export preserves directives across multiple files.
6. Lint, test, and build quality gates are green.
