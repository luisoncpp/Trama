# ADR-0001: Deepen PaneDocumentState into PaneWorkspace module

> **DISCONTINUED** — Esta ADR ya no debe considerarse. El enfoque descrito fue reemplazado por la tarea del agente: PaneWorkspace de solo lectura (read-only), sin reemplazar estado de Preact. Es una fachada de consulta nomas.

## Status

Proposed (2026-04-30)

## Context

Pane state — primary and secondary document content, dirty flags, loading/saving indicators, and status messages — is modeled as 13 bare `useState` atoms spread across `use-project-editor-core-state.ts`. Fields like `selectedPath`, `editorValue`, and `isDirty` are derived from whichever pane is the active one, creating timing hazards when:
- A pane switch races with an autosave debounce
- A close event needs to know which panes are dirty
- An external file change triggers conflict handling

The persistence flush sequence (save-before-switch, save-before-close, autosave) is duplicated across `use-project-editor-pane-persistence.ts`, `use-project-editor-autosave-effect.ts`, and `use-project-editor-close-effect.ts`. Seven lessons-learned entries document split-pane bugs caused by this scattering.

The **deletion test**: removing any of the 13 atoms forces the save-before-action invariant to reappear across N callers independently. The complexity doesn't vanish; it just relocates with less coordination.

## Decision

Consolidate `primaryPane`, `secondaryPane`, `loadingDocument`, `saving`, `statusMessage` atoms — plus the autosave debounce and flush-before-action orchestration — into a single `PaneWorkspace` class with:
- A **pull-based snapshot** for Preact reactivity (`getSnapshot() + subscribe(onChange)`)
- **Injected `saveDocument` and `readDocument`** functions so the module owns save/load orchestration but remains decoupled from IPC
- A thin **`usePaneWorkspace` hook adapter** for the Preact component tree

The interface exposes `openFile`, `updateContent`, `switchActivePane`, `saveDocument`, `saveAll`, `markSaved`, and `destroy`. Autosave debounce is internal to the module. External conflict detection remains outside the module.

## Consequences

**Positive**:
- **Locality**: All pane-state invariants (flush-before-switch, debounce-on-dirty, save-all ordering) co-locate in one class. Fixing any of the 7 split-pane bugs requires changing one file.
- **Leverage**: 6+ callers (autosave, close, save-now, file-switch, conflict-handling, pane-persistence) consume a single interface instead of duplicating the flush-before-action pattern.
- **Testability**: The class can be instantiated and tested without Preact. Mock `saveDocument` and `readDocument` enable full behavioral testing. The hook adapter has minimal surface — just subscribe → getSnapshot → render.
- **Interface reduction**: 13 `useState` pairs become 8 methods + 1 snapshot type.

**Negative**:
- Additional allocation: each mutation creates a new snapshot object. Mitigated by the fact that re-render frequency is bounded by user typing (not animations or streams).
- Migration risk: callers that currently access raw `useState` setters directly need porting one at a time (see implementation plan).

## References

- Implementation plan: `docs/plan/pane-workspace-implementation-plan.md` (descartado)
- Related deepening candidates (archived): `docs/architecture/deepening-opportunities.md`
- 7 lessons-learned entries about split-pane bugs in `docs/lessons-learned/`