# Rich Editor Hotspots

## Purpose

This document is the fast map of the fragile areas around the rich editor and split-pane editor wiring.

Use it when:

- you already know the editor subsystem broadly
- you need to find the risky seam before changing code
- you are debugging a regression and want the shortest path to the likely hotspot

This is not the canonical full architecture guide. For the full subsystem design, read:

- `docs/architecture/rich-markdown-editor-core-architecture.md`
- `docs/architecture/image-handling-architecture.md`
- `docs/architecture/editor-serialization-debounce-architecture.md`
- `docs/architecture/split-pane-coordination.md`

## How to use this doc

1. Match your symptom to a hotspot below.
2. Open the listed files in the given order.
3. If the issue is action-oriented rather than subsystem-oriented, follow the linked flow doc.

## Hotspot Index

| Hotspot | Symptom | Open these first |
|---------|---------|------------------|
| Debounced serialization | Last typed text disappears, save misses final keystrokes, cross-document contamination, images vanish after typing | `docs/architecture/editor-serialization-debounce-architecture.md` -> `src/features/project-editor/components/rich-markdown-editor-serialization.ts` |
| Canonical external-value sync | Images blink or vanish after first edit, equivalent content gets re-applied | `src/features/project-editor/components/rich-markdown-editor-external-sync.ts` -> `src/features/project-editor/components/rich-markdown-editor-value-sync.ts` -> `docs/flows/rich-editor-external-sync-flow.md` |
| Pane-targeted persistence | Save, switch, or close hits the wrong pane | `src/features/project-editor/use-project-editor-pane-persistence.ts` -> `src/features/project-editor/use-project-editor-layout-actions.ts` |
| Layout path vs loaded pane path | Sidebar highlights wrong file or goes blank after pane changes | `docs/architecture/split-pane-coordination.md` -> `src/features/project-editor/use-project-editor-state.ts` |
| Quill lifecycle / re-init | Cursor jumps, editor remounts unexpectedly, runtime toggle acts like full re-create | `src/features/project-editor/components/rich-markdown-editor-core.ts` -> `docs/lessons-learned/rich-editor-effect-deps-remount.md` |
| Focus-mode geometry / scroll | Active line is miscentered, EOF spacing behaves strangely, selection desync after scroll | `src/features/project-editor/components/rich-markdown-editor-focus-scope-scroll.ts` -> `src/features/project-editor/components/rich-markdown-editor-focus-scope-geometry.ts` |
| Workspace command bridge | Context-menu command or editor command does nothing | `src/shared/workspace-context-menu.ts` -> `src/features/project-editor/components/rich-markdown-editor-commands.ts` |

## 1. Debounced serialization

### Why it is fragile

The timer must serialize the exact editor/document captured at registration time. If it reads mutable refs at fire time, it can serialize the wrong pane or a destroyed editor instance.

### Main files

- `src/features/project-editor/components/rich-markdown-editor-serialization.ts`
- `docs/architecture/editor-serialization-debounce-architecture.md`
- `docs/lessons-learned/editor-debounce-closure-capture.md`
- `docs/lessons-learned/editor-onchange-image-hydration.md`

### Invariants

- debounce callback captures `editor` and `documentId` in closure
- cleanup cancels only; it never flushes
- `flush()` returns placeholder-markdown and callers must use it directly
- `lastEditorValueRef.current` stores placeholder-markdown (lightweight)
- `onChangeRef.current()` receives hydrated markdown with `![uuid](data:image/...)`

### Follow this flow

- `docs/flows/rich-editor-typing-flow.md`

## 2. Canonical external-value sync

### Why it is fragile

The same document can appear as hydrated base64 markdown or placeholder markdown. Raw string comparison will treat them as different and trigger destructive re-renders.

### Main files

- `src/features/project-editor/components/rich-markdown-editor-external-sync.ts`
- `src/features/project-editor/components/rich-markdown-editor-value-sync.ts`
- `src/features/project-editor/components/rich-markdown-editor-core.ts`
- `src/shared/markdown-image-placeholder.ts`
- `docs/architecture/image-handling-architecture.md`

### Invariants

- compare editor values through canonical placeholder normalization
- `lastEditorValueRef` is editor-canonical, not necessarily disk-canonical
- re-apply uses `'silent'`
- selection must be preserved around real re-apply

### Follow this flow

- `docs/flows/rich-editor-external-sync-flow.md`

## 3. Pane-targeted persistence

### Why it is fragile

Split layout becomes incorrect quickly if save/switch logic infers the target from global active-pane state instead of explicit pane identity.

### Main files

- `src/features/project-editor/use-project-editor-pane-persistence.ts`
- `src/features/project-editor/use-project-editor-ui-actions-helpers.ts`
- `src/features/project-editor/use-project-editor-layout-actions.ts`
- `src/features/project-editor/use-project-editor-close-effect.ts`

### Invariants

- pane-local UI actions should pass explicit pane identity
- `savePaneIfDirty(pane)` is the shared policy boundary for flush + fallback content + save
- `saveAllDirtyPanes()` is primarily test-verified because the current UX saves on pane switch

### Follow these flows

- `docs/flows/switch-pane-flow.md`
- `docs/flows/save-document-flow.md` if present

## 4. Layout path vs loaded pane path

### Why it is fragile

Split-pane UI has two valid layers of truth:

- layout layer: assigned file for each pane
- document layer: file actually loaded in memory for that pane

Using the wrong one at the wrong time causes blank or stale UI.

### Main files

- `src/features/project-editor/use-project-editor-state.ts`
- `docs/architecture/split-pane-coordination.md`
- `docs/lessons-learned/split-pane-sidebar-layout-vs-pane-path.md`

### Invariants

- layout paths drive immediate UI projection during pane switches
- loaded pane state can lag behind due to async document load

### Follow this flow

- `docs/flows/switch-pane-flow.md`

## 5. Quill lifecycle and remount boundaries

### Why it is fragile

Changing initialization dependencies or mixing runtime toggles into init effects can recreate Quill at the wrong time.

### Main files

- `src/features/project-editor/components/rich-markdown-editor-core.ts`
- `docs/lessons-learned/rich-editor-effect-deps-remount.md`

### Invariants

- init effects depend only on identity/lifecycle inputs
- runtime toggles such as spellcheck synchronize in dedicated effects

## 6. Focus-mode geometry and scroll

### Why it is fragile

This area mixes DOM geometry, selection behavior, Quill offsets, scroll updates, and fallback rendering.

### Main files

- `src/features/project-editor/components/rich-markdown-editor-focus-scope-scroll.ts`
- `src/features/project-editor/components/rich-markdown-editor-focus-scope-geometry.ts`
- `src/features/project-editor/components/rich-markdown-editor-focus-scope.ts`
- `src/features/project-editor/components/rich-markdown-editor-focus-scope-helpers.ts`

### Invariants

- preserve selection around programmatic scroll when needed
- do not inject content nodes into `.ql-editor`
- keep paragraph logic separate from line/sentence logic

## 7. Workspace command bridge

### Why it is fragile

Commands may be wired correctly in the native menu but not in the renderer, or vice versa.

### Main files

- `src/shared/workspace-context-menu.ts`
- `electron/main-process/context-menu.ts`
- `src/features/project-editor/use-project-editor-context-menu-effect.ts`
- `src/features/project-editor/components/rich-markdown-editor-commands.ts`

### Invariants

- renderer and native menu must agree on the `WorkspaceContextCommand` union
- command routing must use `WORKSPACE_CONTEXT_MENU_EVENT`

## Fast routing by symptom

| Symptom | Start here |
|---------|------------|
| "I typed and lost text" | Debounced serialization |
| "Images disappear after edit" | Canonical external-value sync or placeholder-markdown leaked into parent state → `docs/lessons-learned/editor-onchange-image-hydration.md` |
| "Wrong pane saved" | Pane-targeted persistence |
| "Sidebar shows wrong file after pane change" | Layout path vs loaded pane path |
| "Spellcheck or some toggle remounted Quill" | Quill lifecycle and remount boundaries |
| "Focus mode scroll feels haunted" | Focus-mode geometry and scroll |
| "Context menu command does nothing" | Workspace command bridge |

## Related docs

- `docs/flows/README.md`
- `docs/plan/rich-editor-refactor-plan.md`
- `docs/lessons-learned/README.md`
