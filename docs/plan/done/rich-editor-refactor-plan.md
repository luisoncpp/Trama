# Rich Editor Refactor Plan

**Status:** All slices implemented (2026-04-28)

## Summary

Rich editor refactor across 5 slices extracting focused modules from the original monolithic `rich-markdown-editor-core.ts`.

## Implemented Slices

### Slice 1 — Extract pane persistence helpers

**Landed:** `src/features/project-editor/use-project-editor-pane-persistence.ts`

Migrated call sites:
- `use-project-editor-ui-actions-helpers.ts`
- `use-project-editor-layout-actions.ts`
- `use-project-editor-close-effect.ts`
- `use-project-editor-autosave-effect.ts`

**Manual verification:** Split pane dirty routing, pane switch save, sidebar click save, window-close parallel save.

### Slice 2 — Extract canonical value normalization

**Landed:** `src/features/project-editor/components/rich-markdown-editor-value-sync.ts`

Adopted API:
- `normalizeEditorDocumentValue(value, documentId)`
- `areEquivalentEditorValues(a, b, documentId)`

Migrated call sites:
- `rich-markdown-editor.tsx` for initial `lastEditorValueRef`
- `rich-markdown-editor-core.ts` for init-time sync state and external-value comparisons

**Manual verification:** Image-bearing documents, type near images, save/switch/reopen.

### Slice 3 — Extract serialization session

**Landed:** `src/features/project-editor/components/rich-markdown-editor-serialization.ts`

Migrated `registerEditorTextChangeHandler` from `rich-markdown-editor-core.ts`. `core.ts` reduced from 131 to 100 lines.

`flush()` now hydrates image placeholders to `![uuid](data:image/...)` before calling `onChangeRef.current`, while keeping `lastEditorValueRef` as placeholder-markdown for lightweight internal comparison.

**Manual verification:** Rapid typing, immediate save, immediate switch, image-heavy documents, single and split mode.

### Slice 4 — Extract external-value sync

**Landed:** `src/features/project-editor/components/rich-markdown-editor-external-sync.ts`

Extracted `useSyncExternalValue` from `rich-markdown-editor-core.ts`. `core.ts` reduced from 100 to 80 lines.

Hook contract:
- compares canonical values via `normalizeEditorDocumentValue` + `areEquivalentEditorValues`
- preserves Quill selection
- sets/resets `isApplyingExternalValueRef`
- never owns debounce logic

**Manual verification:** All 72 tests pass, lint clean.

### Slice 5 — Reduce projected active-pane coupling

**Landed:** `use-project-editor-layout-actions.ts` + `use-project-editor-ui-actions.ts`

Fixed `useOpenFileInPaneAction`:
1. Primary pane case uses `panePersistence.getPaneStateForPane('primary')` for dirty check instead of projected `isDirty`.
2. Secondary pane case uses `values.secondaryPane.path` instead of `workspaceLayout.secondaryPath` for `shouldLoad`.
3. Added `panePersistence` parameter to `UseWorkspaceLayoutActionParams`.

## Invariants preserved

1. Debounce timer captures `editor` and `documentId` in closure, never reads mutable refs at fire time.
2. Debounce cleanup clears the timer only and never flushes.
3. `flush()` returns serialized markdown and callers use it directly.
4. `serializationRef.current` mutated in place, not replaced.
5. Dirty mark immediate and independent from serialization timing.
6. Canonical editor value placeholder-based for image-bearing documents.
7. Pane-local split actions pass explicit pane identity.

## Files after refactor

### Renderer editor session files

| File | Responsibility |
|------|----------------|
| `rich-markdown-editor.tsx` | Orchestration and view-only shell |
| `rich-markdown-editor-core.ts` | Lifecycle orchestration (init, sync delegation, disable, spellcheck) — 80 lines |
| `rich-markdown-editor-external-sync.ts` | External-value sync hook |
| `rich-markdown-editor-serialization.ts` | Debounce + serialization ref mutation |
| `rich-markdown-editor-value-sync.ts` | Canonical value normalization + equivalence |

### Project editor persistence files

| File | Responsibility |
|------|----------------|
| `use-project-editor-pane-persistence.ts` | `flushPane`, `savePaneIfDirty`, `saveAllDirtyPanes` |

## Related docs

- `docs/architecture/rich-markdown-editor-core-architecture.md`
- `docs/architecture/editor-serialization-debounce-architecture.md`
- `docs/architecture/image-handling-architecture.md`
- `docs/architecture/split-pane-coordination.md`
- `docs/flows/rich-editor-external-sync-flow.md`
- `docs/flows/rich-editor-typing-flow.md`