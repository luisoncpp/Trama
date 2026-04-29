# Rich Editor Refactor Plan

## Status

Slices 1, 2, and 3 implemented on 2026-04-27 through 2026-04-28. The remaining slices are still planned. This document proposes a low-risk refactor of the rich editor and its split-pane persistence wiring without changing user-facing behavior in the first slices.

## Why this plan exists

Recent fixes in the rich editor solved real bugs, but they also concentrated several fragile rules across multiple files:

- Quill lifecycle and external-value sync
- Debounced serialization with flush-before-switch
- Canonical image placeholder representation
- Split-pane pane-targeted dirty/save behavior

The code works, but the mental model is now spread across refs, effects, and action helpers. The goal of this refactor is to make the model visible in the file structure and API shape.

This plan complements:

- `docs/architecture/rich-markdown-editor-core-architecture.md`
- `docs/architecture/image-handling-architecture.md`
- `docs/architecture/editor-serialization-debounce-architecture.md`
- `docs/architecture/split-pane-coordination.md`

## Current flow to preserve

### Edit flow

1. User types in Quill.
2. `rich-markdown-editor-core.ts` handles Quill `text-change`.
3. Centering artifacts are synchronized immediately.
4. Dirty state is marked immediately through `onDirtyRef.current()`.
5. Serialization is debounced for 1 second.
6. `flush()` serializes HTML to canonical markdown and forwards it to state through `onChangeRef.current(markdown)`.

### Save / switch flow

1. A UI action or effect decides that pending edits must be persisted.
2. The caller invokes the pane serialization ref `flush()`.
3. The caller must use the returned markdown directly.
4. The caller invokes `saveDocumentNow(path, content, meta)`.
5. Save clears the dirty flag by matching pane state by path.

### External-value sync flow

1. Renderer state changes from a document load, reopen, or pane switch.
2. The editor compares the incoming value against `lastEditorValueRef.current`.
3. The comparison must use the canonical in-memory image-placeholder form.
4. Only real content changes should trigger `applyMarkdownToEditor`.

## Core problems

### 1. One subsystem, too many hidden entry points

The editor lifecycle is split across:

- `src/features/project-editor/components/rich-markdown-editor.tsx`
- `src/features/project-editor/components/rich-markdown-editor-core.ts`
- `src/features/project-editor/components/rich-markdown-editor-quill.ts`
- `src/features/project-editor/use-project-editor.ts`
- `src/features/project-editor/use-project-editor-ui-actions-helpers.ts`
- `src/features/project-editor/use-project-editor-layout-actions.ts`
- `src/features/project-editor/use-project-editor-close-effect.ts`

This is technically valid, but a contributor debugging "type, switch pane, save, reload" must reconstruct the behavior from several files.

### 2. Important invariants are encoded as conventions, not APIs

Examples:

- `flush()` must return content and callers must use it directly.
- Debounce cleanup cancels only and never flushes.
- Image-bearing documents must use one canonical in-memory representation.
- Split-pane actions triggered from a pane-local UI must receive explicit pane identity.

These rules currently live mostly in lessons and architecture docs rather than in the names and boundaries of the modules themselves.

### 3. The current files mix lifecycle and policy

`rich-markdown-editor-core.ts` currently decides:

- when Quill is created
- when external sync should apply
- how debounce works
- what counts as canonical editor markdown
- how the serialization ref is exposed

That makes the file a hotspot for unrelated bugs.

## Refactor goals

1. Preserve behavior during the first extraction slices.
2. Make editor session concepts explicit: dirty mark, flush, external sync, canonical value.
3. Reduce how often callers need to know about ref mutation details.
4. Keep split-pane routing explicit at pane boundaries.
5. Keep lint compliance and avoid moving complexity into one larger file.

## Target structure

### Renderer editor session files

- `src/features/project-editor/components/rich-markdown-editor.tsx`
  - Keep as orchestration and view-only shell.
- `src/features/project-editor/components/rich-markdown-editor-session.ts`
  - Own the editor session contract and refs.
- `src/features/project-editor/components/rich-markdown-editor-lifecycle.ts`
  - Own Quill initialization, cleanup, and runtime sync effects.
- `src/features/project-editor/components/rich-markdown-editor-serialization.ts`
  - Own debounce registration, `flush()`, and serialization-ref mutation.
- `src/features/project-editor/components/rich-markdown-editor-value-sync.ts`
  - Own canonical value normalization and external-value application rules.

### Project editor persistence files

- `src/features/project-editor/use-project-editor-pane-persistence.ts`
  - Own pane-targeted `flushPane`, `savePaneIfDirty`, and `saveAllDirtyPanes`.
- `src/features/project-editor/use-project-editor-pane-selectors.ts`
  - Optional follow-up extraction for `activePane` vs pane-specific state reads.

These filenames are suggested targets, not mandatory names. The important part is the responsibility split.

## Proposed slices

### Slice 1: Extract pane persistence helpers with no behavior change

Create a single renderer-side helper hook or module that owns:

- `getSerializationRefForPane(pane)`
- `getPaneStateForPane(pane)`
- `flushPane(pane): string | null`
- `savePaneIfDirty(pane): Promise<void>`
- `saveAllDirtyPanes(): Promise<void>`

Current call sites to migrate:

- `use-project-editor-ui-actions-helpers.ts`
- `use-project-editor-layout-actions.ts`
- `use-project-editor-close-effect.ts`
- optionally `use-project-editor-autosave-effect.ts`

Expected result:

- the repeated `flush -> fallback content -> saveDocumentNow` sequence exists in one place
- split-pane rules become easier to audit

Implementation note:

- Landed in `src/features/project-editor/use-project-editor-pane-persistence.ts`
- Current migrated call sites:
  - `use-project-editor-ui-actions-helpers.ts`
  - `use-project-editor-layout-actions.ts`
  - `use-project-editor-close-effect.ts`
  - `use-project-editor-autosave-effect.ts`

Manual verification:

1. In split mode, open one file in `primary` and a different file in `secondary`.
2. Edit only `secondary` and confirm only `secondary` shows dirty.
3. Switch active pane with click or `Ctrl/Cmd+Shift+Tab` and confirm the outgoing pane saves and clears dirty.
4. Edit `secondary`, click a different file in the sidebar, and confirm the previous file is persisted before the new one loads.
5. With unsaved changes in the active pane, press the pane-local save button and confirm the correct pane is saved.
6. Note: manual validation of "`Guardar y cerrar` saves both panes while both are dirty" is not realistic in the current UX, because switching panes saves the outgoing pane. Keep `window-close.test.ts` as the primary verification for `saveAllDirtyPanes()`.

### Slice 2: Extract canonical value normalization

Move the canonical editor-value rule behind one named API.

Current implicit rule:

- strip base64 image markdown to placeholder markdown before equality comparisons

Target API examples:

- `normalizeEditorDocumentValue(value, documentId)`
- `areEquivalentEditorValues(a, b, documentId)`

Current logic lives in:

- `rich-markdown-editor-core.ts`
- `rich-markdown-editor-quill.ts`

Expected result:

- the image-placeholder representation becomes a first-class concept
- future changes stop re-embedding image normalization knowledge in multiple hooks

Implementation note:

- Landed in `src/features/project-editor/components/rich-markdown-editor-value-sync.ts`
- Current adopted API:
  - `normalizeEditorDocumentValue(value, documentId)`
  - `areEquivalentEditorValues(a, b, documentId)`
- Current migrated call sites:
  - `rich-markdown-editor.tsx` for initial `lastEditorValueRef`
  - `rich-markdown-editor-core.ts` for init-time sync state and external-value comparisons

Manual verification:

1. Open a document that contains inline base64 images.
2. Type a few characters near image-heavy sections and confirm images remain visible.
3. Save, switch away, and switch back; confirm the text and images match what was just edited.
4. Reopen the document from disk and confirm no text is lost and no image placeholders leak into visible content.
5. If available, repeat once with a document that mixes text-only paragraphs and image blocks to catch canonicalization drift.

### Slice 3: Extract serialization session

Move debounce and serialization-ref mutation out of `rich-markdown-editor-core.ts`.

Target responsibilities:

- register `text-change`
- immediate dirty mark
- debounce timer lifecycle
- `flush()` closure capture
- in-place `serializationRef.current.flush = flush`

Expected result:

- one small module becomes the source of truth for debounce semantics
- `rich-markdown-editor-core.ts` stops mixing Quill lifecycle with save/switch policy

Implementation note:

- Landed in `src/features/project-editor/components/rich-markdown-editor-serialization.ts`
- Migrated `registerEditorTextChangeHandler` from `rich-markdown-editor-core.ts`
- `core.ts` reduced from 131 to 100 lines
- `flush()` now hydrates image placeholders to `![uuid](data:image/...)` before calling `onChangeRef.current`, while keeping `lastEditorValueRef` as placeholder-markdown for lightweight internal comparison

Manual verification:

1. Type rapidly for a few seconds in a normal document and confirm the editor stays responsive.
2. Type and immediately save; confirm the last typed characters are included in the saved result.
3. Type and immediately switch pane or switch file; confirm the last typed characters are preserved.
4. Open a large or image-heavy document and verify that typing does not cause visible text rollback or cursor-jump regressions.
5. Repeat the same checks in both single-pane and split-pane mode.

### Slice 4: Extract external-value sync

Move `useSyncExternalValue` into a dedicated file with a tighter API and explicit contract:

- compares canonical values only
- sets `isApplyingExternalValueRef`
- preserves Quill selection
- never owns debounce logic

Expected result:

- easier debugging of "why did Quill re-render?"
- clearer boundary between inbound sync and outbound serialization

Manual verification:

1. Open a document, make an edit, and confirm the editor does not visibly re-render or wipe the new text.
2. Switch to another file and back; confirm the editor reloads only real document changes.
3. If possible, trigger an external file change and confirm:
   - dirty document -> conflict path
   - clean document -> auto reload
4. Toggle runtime editor-affecting settings such as spellcheck and confirm the editor instance does not behave like a full remount unless document identity actually changed.

### Slice 5: Reduce projected active-pane coupling

Follow-up refactor on the project editor side:

- keep `selectedPath`, `editorValue`, `isDirty` as UI-facing projections
- stop using those projected values for multi-step pane persistence logic where pane identity matters

Priority call sites:

- `use-project-editor-ui-actions-helpers.ts`
- `use-project-editor-layout-actions.ts`
- `use-project-editor.ts`

Expected result:

- pane-local actions depend less on global projection state
- fewer regressions from timing between `activePane` and async pane load state

Manual verification:

1. In split mode, assign different files to each pane and switch active pane repeatedly.
2. Confirm the sidebar highlight follows the layout-assigned active file immediately, even before async load completes.
3. Edit the non-default pane and confirm save, dirty state, and selected file all stay attached to that pane.
4. Open a file directly into `secondary` and confirm subsequent actions still target `secondary` explicitly.
5. Watch for any regression where a UI alias such as `selectedPath` or `isDirty` appears to describe the wrong pane.

## Detailed file responsibilities after refactor

### `rich-markdown-editor.tsx`

Should keep:

- shell refs
- tag overlay wiring
- toolbar sync
- focus-mode hook
- find UI hook

Should not own:

- debounce semantics
- canonical value rules
- pane persistence decisions

### `rich-markdown-editor-lifecycle.ts`

Should own:

- Quill creation
- command listener registration
- typography handler registration
- spellcheck runtime sync
- disabled-state sync

Should not own:

- policy about when to save
- canonical comparison rules

### `rich-markdown-editor-serialization.ts`

Should own:

- `registerEditorTextChangeHandler`
- debounce timer lifetime
- `flush()` implementation
- `lastEditorValueRef.current` update before `onChange`

Should not own:

- document loading
- pane switching

### `rich-markdown-editor-value-sync.ts`

Should own:

- canonical markdown normalization
- external-value comparison
- re-apply-to-Quill decision

Should not own:

- save policy
- text-change handling

### `use-project-editor-pane-persistence.ts`

Should own:

- pane-to-ref lookup
- pane-to-state lookup
- `flushPane`
- `savePaneIfDirty`
- `saveAllDirtyPanes`

Should not own:

- open-project orchestration
- sidebar actions

## Invariants to preserve

These are non-negotiable and any slice that breaks them should be rolled back or split smaller:

1. Debounce timer must capture `editor` and `documentId` in closure, never read mutable refs at fire time.
2. Debounce cleanup clears the timer only and never flushes.
3. `flush()` must return the serialized markdown, and save/switch callers must use the returned value directly.
4. `serializationRef.current` must be mutated in place, not replaced.
5. Dirty mark must remain immediate and independent from serialization timing.
6. Canonical editor value must remain placeholder-based for image-bearing documents.
7. Pane-local split actions must continue to pass explicit pane identity.

## Suggested execution order

1. Implement Slice 1 first.
2. Run focused split-pane and debounce tests.
3. Implement Slice 2 and re-run editor/image regressions.
4. Implement Slice 3 and re-run debounce tests.
5. Implement Slice 4 only after Slice 3 stabilizes.
6. Treat Slice 5 as optional cleanup, not a prerequisite.

## Focused test playbook

Run after each slice:

```powershell
npm test -- tests/project-editor-debounce-regression.test.ts
npm test -- tests/project-editor-conflict-flow.test.ts
npm test -- tests/rich-markdown-editor.test.ts
npm test -- tests/window-close.test.ts
```

Also re-run when changing canonical image handling:

```powershell
npm test -- tests/paste-markdown.test.ts
npm test -- tests/rich-markdown-editor-tag-overlay.test.ts
```

Manual spot checks:

1. Open a document with inline images.
2. Type several characters quickly.
3. Switch panes.
4. Save from secondary pane while primary is also dirty.
5. Reopen the document and verify text and images remain intact.

## Fast debug playbook

### If typing causes text or image loss

Check in order:

1. `rich-markdown-editor-value-sync.ts` or its predecessor for canonical comparison drift.
2. `rich-markdown-editor-serialization.ts` or its predecessor for stale timer closure bugs.
3. `rich-markdown-editor-quill.ts` for hydration/placeholder normalization mismatch.

### If save hits the wrong pane

Check in order:

1. pane-local UI wiring in `workspace-editor-panels.tsx`
2. pane persistence helper lookup
3. any fallback to `workspaceLayout.activePane`

### If switching panes reloads or blanks the wrong file

Check in order:

1. layout state vs pane document state reads
2. projected selectors in `use-project-editor-state.ts`
3. pane persistence helper behavior before switch

## Success criteria

This refactor is successful when:

1. A contributor can localize save/switch persistence logic in one pane-persistence module.
2. A contributor can localize editor debounce behavior in one serialization module.
3. Canonical image-placeholder rules are expressed through named APIs, not hidden in hook internals.
4. Existing split-pane and debounce regressions keep passing without weakened coverage.
