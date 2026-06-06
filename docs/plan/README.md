# Plan Docs

Active implementation plans — work that is in progress or planned but not yet started.

## Index

| File | Scope |
|------|-------|
| `map-document-markers-implementation-plan.md` | Map document editor surface, marker management, and panel switch wiring |
| `tag-overlay-deepening-plan.md` | Tag overlay index types, state seam, hook interface, and helper tests |
| `pane-exit-deepening-tech-design.md` | Technical design for deepening the `Pane exit` seam in `PaneWorkspace` while preserving current behavior |
| `pane-exit-deepening-implementation-plan.md` | Implementation slices for the behavior-preserving `Pane exit` refactor |
| `phase-4-detailed-plan.md` | Phase 4 master plan: Wiki Tag Links, folder operations, templates, AI import/export |
| `implementation-overview.md` | Phase 3 closure summary |
| `ai-import-export-implementation-map.md` | AI import/export feature mapping |
| `drag-drop-file-reorder-plan.md` | Drag-and-drop file reorder Slice 1 and Slice 2 |
| `sidebar-drag-drop-reorder-folder-move-plan.md` | Item A: integrate corkboardOrder into sidebar tree; Item B: folder drag-and-drop move/reparent |
| `incremental-project-update-plan.md` | Avoid full project rescans on file/folder create, delete, rename, move |
| `book-export-implementation-plan.md` | Book export Phase C multi-format backend |
| `done/book-export-pdf-print-segments-implementation-plan.md` | PDF export: HTML segments + Electron printToPDF + linear merge (ADR 0004) — complete |
| `project-history-git-implementation-plan.md` | Local Git-backed snapshots, document revisions, preview rail, and restore implementation |
| `help-menu-implementation-plan.md` | Help menu, bundled-HTML Help window, Getting Started auto-open, and advanced help pages (ADR 0005) |
| `rich-editor-refactor-plan.md` | Low-risk refactor plan for Quill lifecycle, canonical value sync, and split-pane persistence wiring |
<!-- use-project-editor-keystroke-churn-plan.md moved to done/ -->

## When to add a doc here

- When implementation of a feature starts
- When tracking execution slices and status for an active workstream

## Rules

- When a plan is finished, move it to `docs/plan/done/` and update all doc references.
- Plans may reference but should not restate content from `docs/architecture/` or `docs/spec/`.
- Status lines must be accurate — update when a workstream completes.
- "Current high-value next tasks" belong in `docs/live/current-status.md`, not in plans.
- After moving a completed plan to `docs/plan/done/`, update this index.
