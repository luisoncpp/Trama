# Wiki Tag Links Architecture

Goal: document the tag-based lookup system that lets readers open Lore articles by clicking tagged terms with `Ctrl`/`Cmd`. This doc encodes the end-to-end data flow, the matching model, and the critical rules discovered during implementation.

## Why This Exists

Wiki Tag Links required three separate bugfixes during implementation: stale index after save, Ctrl/Cmd click race, and underline offset drift from Quill index mismatch. None of these were documented. This guide serves as the single operational reference so future contributors do not need broad exploratory searches.

## End-to-End Data Flow

```
Lore file save (frontmatter parse)
         │
         ▼
TagIndexService (main process)
  tag → filePath map, longest-match-first
         │
         ▼
IPC: getTagIndex() → renderer cache
         │
         ▼
Editor overlay (Ctrl hold → underline, Ctrl+click → navigate)
```

### Lifecycle Sequence

1. Project opens → scanner/reconcile builds `markdownFiles` and `metaByPath`.
2. `TagIndexService.buildIndex(...)` constructs in-memory map.
3. Renderer fetches tag index via `getTagIndex` IPC.
4. Rich editor scans document text for matches, computes visual overlays.
5. `Ctrl/Cmd+click` hit-test resolves clicked match and opens target file.

**Critical invariant:** Any write flow that can change frontmatter tags must rebuild the active in-memory tag index before returning success to the renderer.

## TagIndexService (Main Process)

**Location:** `electron/services/tag-index-service.ts`

**Responsibilities:**
- Build `Map<lowercaseTag, filePath>` on project scan.
- Update incrementally on file save/create/delete.
- Expose `getTagIndex()` and `resolveMatches(text)` for finding all tag matches in a text string.
- Longest-match-first policy for overlapping matches; alphabetical tie-breaking for duplicate tags.

**Canonical mapping:**
- key: lowercase trimmed tag text
- value: project-relative file path

**Lifecycle:** Rebuilt on project open; incrementally updated via watcher events.

## IPC Contract

New endpoints in `src/shared/ipc.ts`:

| Channel | Direction | Payload | Response |
|---------|-----------|---------|----------|
| `getTagIndex` | Renderer → Main | — | `{ tags: Record<string, string> }` |
| `tagResolve` | Renderer → Main | `{ text: string }` | `{ matches: Array<{ tag: string, start: number, end: number, filePath: string }> }` |

Handlers: `electron/ipc/handlers/tag-handlers.ts`

## Renderer State

**Hook:** `src/features/project-editor/use-tag-index.ts`

- Fetches full tag index on project open.
- Stores in `Map<string, string>` for O(1) lookups.
- Invalidates via `externalFileEvent` IPC event (watcher-driven) and internal `TAG_INDEX_REFRESH_EVENT`.

## Matching Rules

### Longest-Match-First

When text at cursor could match multiple tags:
1. Gather all tags appearing at that position.
2. Pick the one with greatest character length (longest match wins).
3. Duplicate tags (same tag declared in multiple files): alphabetically first path wins.

**Example:**
- Tags: `norte`, `norte salvaje`
- Text: `"...las montañas del norte salvaje..."`
- Result: resolves to file declaring `norte salvaje`.

### Word Boundaries

`magia` does **not** match inside `magiaoscura`.

### Case Insensitivity

`Magia`, `MAGIA`, `magia` all resolve to the same tag.

### Code Block Exclusion

Tags inside `` `code` `` or ` ```code blocks``` ` are excluded from matching.

### Inline Formatting Inclusion

Tags inside **bold**, *italic*, or # headers **are** matched — they represent conceptual references.

## Editor Integration

### Detection Strategy (Geometric Overlay Approach)

Does not mutate document content. Uses absolute-positioned `<div>` elements rendered below matched text:

1. On each content change, scan editor text for tag matches (case-insensitive, word boundaries).
2. Compute geometric bounds for each match via `quill.getBounds()`.
3. Render `<div class="tag-link-highlight">` overlays at computed positions **only while Ctrl is held**.
4. On `Ctrl` + mousedown on a matched tag, hit-test resolved match via click coordinates and invoke `onTagClick(filePath)` prop.

Tags are implicit, not wrapped in `[[...]]`.

### Interaction Matrix

| Action | Behavior |
|--------|----------|
| `Ctrl` hold | Underline all matched terms |
| `Ctrl` + click on tag | Open associated Lore file via `onTagClick(filePath)` prop callback |
| `Ctrl` + click on non-tag | No-op |
| `Ctrl` + click with no secondary pane | Auto-enable split mode, open in secondary |

### Visual Styling

Underlines are rendered via absolute-positioned `<div>` elements with class `.tag-link-highlight`:

```css
.tag-link-highlight {
  position: absolute;
  z-index: 4;
  pointer-events: none;
  border-radius: 999px;
  background: color-mix(in oklab, var(--editor-link) 72%, transparent);
  opacity: 0.92;
}
```

Tags are only visually distinguished when `Ctrl` is held.

## Critical Quill Indexing Rule

**Do not assume plain-text offsets are Quill document indexes.**

- `getText()` omits embeds.
- Quill document indexes count embeds as length `1`.

Always map plain-text offsets through Delta ops before calling APIs expecting Quill indexes (`getBounds`, selection APIs, hit-tests from bounds).

**Coordinate reference:** `quill.getBounds()` is relative to `quill.container`, not `quill.root`. If converting to shell/viewport coordinates, use `editor.container.getBoundingClientRect()` as the reference rectangle.

See: `docs/lessons-learned/quill-getbounds-container-reference.md`, `docs/lessons-learned/quill-text-vs-delta-index-mismatch.md`

## File Map by Responsibility

### Main Process and IPC

| File | Role |
|------|------|
| `electron/services/tag-index-service.ts` | Build and resolve tag mappings; longest-match + duplicate handling |
| `electron/ipc-runtime.ts` | Holds active `TagIndexService` per active project |
| `electron/ipc/handlers/tag-handlers.ts` | `getTagIndex` and `tagResolve` endpoints |
| `electron/ipc/handlers/project-handlers/document-handlers.ts` | Rebuild trigger after save/create/delete |
| `electron/ipc/handlers/project-handlers/folder-handlers.ts` | Rebuild trigger after folder operations |
| `electron/ipc/handlers/project-handlers/order-handlers.ts` | Reconcile/rebuild calls in reorder/update flows |
| `src/shared/ipc.ts` and `src/shared/ipc-tag.ts` | Channel names, schemas, envelope contracts |
| `electron/preload.cts` | Renderer bridge methods (`window.tramaApi`) |
| `src/types/trama-api.d.ts` | Renderer-side API typings |

### Renderer State and Editor Integration

| File | Role |
|------|------|
| `src/features/project-editor/use-tag-index.ts` | Fetch/cache/invalidate tag index in renderer |
| `src/features/project-editor/components/rich-markdown-editor-tag-helpers.ts` | Pure matching rules (boundaries, overlap, code exclusion) |
| `src/features/project-editor/components/rich-markdown-editor-tag-overlay.ts` | Build overlay ranges and match bounds |
| `src/features/project-editor/components/rich-markdown-editor-tag-highlights.tsx` | Visual underline overlay rendering |
| `src/features/project-editor/components/rich-markdown-editor.tsx` | Ctrl/Cmd interaction and click routing |
| `src/features/project-editor/components/workspace-editor-panels.tsx` | Tag click target pane behavior |

### Tests

| File | Role |
|------|------|
| `tests/tag-index-service.test.ts` | Build index + resolve behavior |
| `tests/tag-index-ipc-regression.test.ts` | Save/update/remove tag index freshness across IPC |
| `tests/rich-markdown-editor-tag-overlay.test.ts` | Mapping text offsets to Quill document indexes |

## Known Failure Modes

### Stale tag index after save

Fixed by rebuilding active in-memory tag index in write flows.

Lesson: `docs/lessons-learned/tag-index-stale-after-save.md`

### Ctrl/Cmd click race

Fixed by using event modifier state in click path.

Lesson: `docs/lessons-learned/wiki-tag-modifier-click-race.md`

### Bounds drift due to wrong rectangle reference

Fixed by using `quill.container` coordinate reference.

Lesson: `docs/lessons-learned/quill-getbounds-container-reference.md`

### Underline shifted or line-wide after embeds

Fixed by mapping text offsets to Quill indexes via Delta ops.

Lesson: `docs/lessons-learned/quill-text-vs-delta-index-mismatch.md`

## Debug Playbook

### Step 1: Classify Symptom

- **Navigation stale/missing after save** → likely index freshness (main process rebuild path).
- **Underline misplaced/too wide** → likely Quill index or coordinate reference mismatch.
- **Ctrl/Cmd click intermittent** → likely modifier event timing/race handling.
- **Tag exists but not matched** → likely boundaries/code exclusion/tag normalization.

### Step 2: Check Minimal Files by Symptom

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

### Step 3: Run Focused Tests

```bash
npm run test -- tests/tag-index-service.test.ts
npm run test -- tests/tag-index-ipc-regression.test.ts
npm run test -- tests/rich-markdown-editor-tag-overlay.test.ts
```

## Change Checklist

Before coding:
1. Read this guide + spec + relevant lessons-learned files.
2. Identify whether change touches matching, indexing, IPC, or rendering.
3. List exact files to touch before implementation.

During implementation:
1. Keep matching helpers pure and separately testable.
2. Keep Quill index and coordinate conversions explicit.
3. Update both preload bridge and typings when IPC contract changes.
4. Ensure write flows refresh active tag index when tags may change.

Before merge:
1. Focused tests above pass.
2. Relevant docs updated (spec, this guide, troubleshooting/lessons as needed).
3. Fast routing in `docs/START-HERE.md` remains accurate.