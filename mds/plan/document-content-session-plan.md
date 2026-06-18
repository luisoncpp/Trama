# Document Content Session — Implementation Plan

Date: 2026-06-16  
Status: Implemented  
Scope: Deepen the markdown image / broken-image round-trip into one renderer `Document content session` module per open document, with a matching main-process disk adapter and shared phase vocabulary  
Related: `CONTEXT.md`, `mds/architecture/image-handling-architecture.md`, `mds/architecture/editor-serialization-debounce-architecture.md`, `mds/architecture/rich-editor-hotspots.md`, `mds/plan/done/rich-editor-session-deepening-plan.md`

## 1. Problem statement

Trama keeps **four markdown representations** in play during a normal edit cycle (disk `res/*.png`, IPC portable with embedded data URLs, editor-internal placeholder comments + `imageMapCache`, and hydrated portable in pane state after flush). The primitives in `src/shared/markdown-image-placeholder.ts` are correct and well-tested; the **orchestration** is scattered across seven call sites that must remember phase order independently.

**Deletion test:** removing `markdown-image-placeholder.ts` would force complexity back into callers — the primitives earn their keep. Removing the scattered hydrate/strip calls in `actions.ts`, `editor-session-content.ts`, `rich-markdown-editor-value-sync.ts`, `conflict-actions.ts`, and `file-crud.ts` without a replacement would **concentrate** bugs at every save/load boundary — that is the signal for a deepening module.

Integration regressions (image blink, placeholder leak on save, false external-sync reload, conflict save-as-copy missing images) appear at **call order**, not inside any single pure function.

## 2. Design decisions (locked)

| Fork | Choice | Rationale |
|------|--------|-----------|
| Seam scope | **A — renderer session + main disk adapter** | One deep module per process tier; shared phase **names**, not shared implementation |
| Pane state representation | **Editor-internal only; hydrate at save** | Pane `content` always placeholder markdown; portable form only at IPC save boundary |
| Cache ownership | **Façade over global `imageMapCache` (migration path)** | `DocumentContentSession` wraps existing cache API keyed by document path; no behavior change in slice 1 |
| Quill boundary | **Markdown-string phases only** | HTML strip, turndown, `applyMarkdownToEditor` stay in `rich-markdown-editor-quill.ts` |
| Broken images | **Same module, internal sub-track** | Shared load/save entry points; separate broken-image phases beside inline-image phases |
| Tests | **Primitives unchanged; add session phase + round-trip tests** | Interface is the test surface for orchestration |
| Migration | **Incremental façade-first, seven slices** | No big-bang; verification gate after each slice |

## 3. Goals

1. Introduce **`DocumentContentSession`** — one renderer module per document path owning markdown phase transitions and cache access.
2. Introduce **`DiskContentAdapter`** (main process) — rename/group existing `resolveMarkdownImageSources` + `materializeMarkdownImages` under the same phase vocabulary.
3. Make **pane state editor-internal** end-to-end (load, debounced `onChange`, flush return value, conflict copy).
4. Centralize save-time hydration (`hydrateMarkdownImages` + `hydrateBrokenImageComments` + `ensureMarkdownEmbeddedImagesArePng`) behind `forIpcSave`.
5. Add glossary terms to `CONTEXT.md` and update `image-handling-architecture.md` so future work does not re-scatter orchestration.

## 4. Non-goals

1. Do not change Quill blot formats, turndown rules, or debounce timing (1 s).
2. Do not change disk materialization semantics (`res/*.png` naming, orphan cleanup) — only rename/group behind `DiskContentAdapter`.
3. Do not change IPC envelope schemas (`readDocument` / `saveDocument` still carry a markdown string).
4. Do not move PNG canvas conversion to main process (`ensureMarkdownEmbeddedImagesArePng` stays renderer-only).
5. Do not merge book-export or Git-history image hydration into this module (separate consumers of portable markdown).
6. Do not replace global `imageMapCache` with per-session storage in v1 — only wrap it.

## 5. Glossary (to add to `CONTEXT.md`)

| Term | Definition |
|------|------------|
| **Editor-internal markdown** | In-memory markdown using `<!-- IMAGE_PLACEHOLDER:uuid -->` and `<!-- TRAMA_BROKEN_IMAGE:… -->`; image bytes live in `imageMapCache`. Not portable across processes without hydration. |
| **Portable markdown** | Standard markdown safe at IPC and save boundaries: `![alt](data:image/…)` and/or `![alt](res/….png)`. |
| **Document content session** | Per-document-path renderer module that owns phase transitions between editor-internal and portable markdown, including broken-image round-trip. |
| **Disk content adapter** | Main-process module owning disk ↔ portable transitions (`fromDiskRead`, `toDiskWrite`). |

## 6. Phase vocabulary (shared names, separate implementations)

| Phase | Input → output | Tier | Current owner |
|-------|----------------|------|---------------|
| `fromDiskRead` | disk markdown → portable | main | `resolveMarkdownImageSources` |
| `forEditorLoad` | portable → editor-internal | renderer | `stripBase64ImagesFromMarkdown` in `actions.ts` |
| `fromEditorSerialize` | Quill HTML → editor-internal | renderer | `serializeEditorMarkdown` in `rich-markdown-editor-quill.ts` (calls session after turndown) |
| `forCanonicalCompare` | any → editor-internal normalized | renderer | `normalizeEditorDocumentValue` |
| `forIpcSave` | editor-internal (or already-portable) → portable + PNG-normalized | renderer | `hydrate*` + `ensureMarkdownEmbeddedImagesArePng` in `actions.ts` / `conflict-actions.ts` |
| `toDiskWrite` | portable → disk markdown + file writes | main | `materializeMarkdownImages` |

**Broken-image sub-track** (same session, parallel methods or flags):

| Phase | Role |
|-------|------|
| `preserveBrokenOnSerialize` | editor-internal broken comment unchanged through serialize |
| `expandBrokenForSave` | `hydrateBrokenImageComments` before IPC |
| `renderBrokenForEditor` | stays in Quill apply path (`renderBrokenImageCommentsAsHtml`) |

## 7. Behavior change — pane state editor-internal

### Today

```
flush() → lastEditorValueRef = placeholder
       → onChange(parent) = hydrateMarkdownImages(placeholder)  ← pane gets portable
save   → hydrateMarkdownImages(pane content) again
```

Pane `content` is **hydrated** after the first debounced flush but **placeholder** immediately after `loadDocument` — asymmetric and confusing for external sync.

### Target

```
flush() → lastEditorValueRef = placeholder
       → onChange(parent) = placeholder                        ← pane always editor-internal
save   → session.forIpcSave(pane content)                     ← single hydration point
```

### Callers affected

| Caller | Change |
|--------|--------|
| `EditorContentLoop.flush` | Stop calling `hydrateMarkdownImages` before `onChange` |
| `useLoadDocument` / `actions.ts` | Use `session.forEditorLoad(ipcContent)` |
| `saveDocumentNow` | Use `session.forIpcSave(content)` |
| `resolveConflictSaveAsCopy` | Use `session.forIpcSave(editorValue)` |
| `rich-markdown-editor-value-sync.ts` | Delegate to `session.forCanonicalCompare` |
| Conflict compare UI | Ensure disk side is normalized to editor-internal before diff (or compare both as portable — pick one rule and document) |

### Invariants after change

1. `PaneDocumentState.content` is always editor-internal markdown.
2. `EditorContentLoop.getCanonicalValue()` and pane `content` stay in sync after every successful flush (both placeholder form).
3. `forIpcSave` is the **only** renderer path that calls `hydrateMarkdownImages` and `hydrateBrokenImageComments`.
4. `imageMapCache` must be populated before `forIpcSave` when content still contains `IMAGE_PLACEHOLDER` comments (serialize path responsibility — unchanged).

## 8. Target module structure

### Renderer

```
src/features/project-editor/document-content/
  document-content-session.ts           # public class + factory getDocumentContentSession(path)
  document-content-session-private/
    document-content-phases.ts          # forEditorLoad, forCanonicalCompare, forIpcSave
    document-content-broken-track.ts    # broken-image phase helpers (thin wrappers)
```

**Factory pattern:** `getDocumentContentSession(documentPath: string): DocumentContentSession` — one instance per path, wraps global cache via existing `storeImageMap` / `getImageMap` / `clearImageMap`.

**Quill integration (unchanged location, new call):**

- `serializeEditorMarkdown` → after turndown, optionally notify session to store image map (or session wraps `stripBase64ImagesFromHtml` result storage — prefer session method `fromEditorSerializeResult(markdown)` that stores map if needed).
- `applyMarkdownToEditor` → receives editor-internal value from pane; still calls `hydrateMarkdownImages` **only inside Quill apply** for marked parsing (editor display needs data URLs in HTML). This is a **display** hydration, not pane-state hydration — document explicitly in architecture doc.

### Main process

```
electron/services/
  disk-content-adapter.ts               # fromDiskRead, toDiskWrite — thin rename over document-image-persistence
```

`document-repository.ts` calls adapter methods instead of importing persistence functions directly. No behavior change.

## 9. Implementation slices

Follow in order. Run verification after each slice before continuing.

### Slice 1 — Façade module (no behavior change)

**Goal:** Introduce `DocumentContentSession` delegating to existing functions; zero caller rewires.

**Files — add:**

- `src/features/project-editor/document-content/document-content-session.ts`
- `src/features/project-editor/document-content/document-content-session-private/document-content-phases.ts`
- `src/features/project-editor/document-content/document-content-session-private/document-content-broken-track.ts`
- `tests/document-content-session.test.ts` (phase delegation tests mirroring `markdown-image-placeholder.test.ts` fixtures)

**Files — update:**

- `mds/live/file-map.md`

**Verification:**

```powershell
npm run test -- tests/document-content-session.test.ts tests/markdown-image-placeholder.test.ts
```

### Slice 2 — Rewire load/save in `actions.ts`

**Goal:** `loadDocument` and `saveDocumentNow` are the only production entry points for load/save orchestration; they use session phases.

**Files — modify:**

- `src/features/project-editor/project-editor-private/actions.ts`

**Tasks:**

1. `forEditorLoad` on IPC read response.
2. `forIpcSave` replacing inline `hydrate*` + `ensureMarkdownEmbeddedImagesArePng`.

**Verification:**

```powershell
npm run test -- tests/document-content-session.test.ts tests/project-editor-debounce-regression.test.ts
```

Manual: load document with embedded images, save, reopen — images intact.

### Slice 3 — Pane state editor-internal (`EditorContentLoop`)

**Goal:** `onChange` emits editor-internal markdown only.

**Files — modify:**

- `src/features/project-editor/pane/rich-markdown-editor/editor-session/editor-session-private/editor-session-content.ts`
- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-value-sync.ts` (delegate to session)
- `tests/rich-markdown-editor.test.ts` (adjust expectations: pane/onChange receives placeholder)
- `tests/editor-session.test.ts` if onChange assertions exist

**Tasks:**

1. Remove `hydrateMarkdownImages` from `flush` → `onChange` path.
2. Confirm `flush()` return value and `onChange` payload are identical (placeholder).
3. Update tests that assumed hydrated parent state.

**Verification:**

```powershell
npm run test -- tests/editor-session.test.ts tests/rich-markdown-editor.test.ts tests/rich-markdown-editor-value-sync.test.ts
```

Manual: type with images, wait for debounce, inspect pane state size (should stay small / placeholder).

### Slice 4 — Conflict and sidebar save paths

**Goal:** All renderer IPC saves go through `forIpcSave`.

**Files — modify:**

- `src/features/project-editor/conflict-actions.ts`
- `src/features/project-editor/sidebar-file-actions/private/file-crud.ts` (use `forIpcSave` on content being written; disk-read copy may already be portable — `forIpcSave` must be idempotent on portable input)

**Verification:**

```powershell
npm run test -- tests/project-editor-conflict-flow.test.ts
```

### Slice 5 — Serialize path registration

**Goal:** Image map storage on serialize goes through session; quill module calls session instead of `storeImageMap` directly.

**Files — modify:**

- `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-quill.ts`
- `document-content-session.ts` (add `recordSerializeImageMap` or fold into `fromEditorSerialize`)

**Verification:**

```powershell
npm run test -- tests/rich-markdown-editor.test.ts tests/document-content-session.test.ts
```

### Slice 6 — Main process `DiskContentAdapter`

**Goal:** Group disk phases under shared vocabulary; no behavior change.

**Files — add:**

- `electron/services/disk-content-adapter.ts`

**Files — modify:**

- `electron/services/document-repository.ts`
- `tests/document-image-persistence.test.ts` (if imports change)

**Verification:**

```powershell
npm run test -- tests/document-image-persistence.test.ts
```

### Slice 7 — Documentation and glossary

**Goal:** Docs match implementation; agents stop following stale hydrate-on-onChange guidance.

**Files — modify:**

- `CONTEXT.md` (glossary terms from §5)
- `mds/architecture/image-handling-architecture.md` (orchestration diagram, pane-state invariant, display vs save hydration)
- `mds/architecture/rich-editor-hotspots.md` (point image bugs to `DocumentContentSession`)
- `mds/START-HERE.md` fast-routing row for image pipeline debugging
- `mds/live/file-map.md`

**Verification:** Read-through against slices 1–6; no code change required.

## 10. Test plan

### New tests (`tests/document-content-session.test.ts`)

| Case | Assert |
|------|--------|
| `forEditorLoad` | portable with data URL → placeholder + cache populated |
| `forCanonicalCompare` | portable vs placeholder same document → equal |
| `forIpcSave` | placeholder + cache → portable with data URLs |
| `forIpcSave` idempotent | already-portable input → unchanged except PNG normalize |
| Broken round-trip | broken comment → `forIpcSave` → `![alt](res/…)` |
| Round-trip integration | `forEditorLoad` → `forIpcSave` restores equivalent portable |

### Existing tests to update

- `tests/rich-markdown-editor.test.ts` — onChange expects placeholder, not hydrated
- `tests/rich-markdown-editor-value-sync.test.ts` — may thin to session delegation tests
- Any test asserting `editorValue` contains `data:image` after typing

### Regression manual checklist

- [ ] Split pane: two documents with images; edit both; save each; no cross-pane cache bleed
- [ ] External file change on open document: reload applies without image blink
- [ ] Revert changes: flush + reload preserves images
- [ ] Conflict save-as-copy: copy file contains materialized images on disk
- [ ] Broken `res/missing.png` link: round-trip without drift
- [ ] Paste image + immediate save (before debounce): flush-before-save still hydrates via cache

## 11. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Save before debounce with only placeholder in pane but stale cache | `flush()` before save already returns fresh placeholder and refreshes cache; verify in manual checklist |
| Quill apply still needs display hydration | Keep `hydrateMarkdownImages` inside `applyMarkdownToEditor` only; document as display concern |
| Conflict compare shows portable disk vs placeholder editor | Normalize both sides through `forCanonicalCompare` or compare portable disk vs `forIpcSave` dry-run |
| `file-crud` save path bypasses session | Slice 4 explicit |
| Global cache survives document close | Call `clearImageMap` on pane clear / document unload if not already — audit in slice 3 |

## 12. Success criteria

1. No production file imports `hydrateMarkdownImages` or `stripBase64ImagesFromMarkdown` outside `document-content/` and `markdown-image-placeholder.ts` (Quill apply may still call hydrate for display).
2. Pane `content` never contains `data:image` after load or debounced edit.
3. `image-handling-architecture.md` diagram shows single `forIpcSave` hydration point.
4. All verification commands in §9 pass.
5. `CONTEXT.md` defines editor-internal vs portable markdown.

## 13. Estimated effort

| Slice | Effort |
|-------|--------|
| 1 Façade | Small |
| 2 actions rewiring | Small |
| 3 pane-internal onChange | Medium (test updates) |
| 4 conflict/file-crud | Small |
| 5 serialize registration | Small |
| 6 disk adapter | Small |
| 7 docs | Small |

Total: **~1–2 focused sessions**, with slice 3 carrying the most test churn.
