# Architecture docs

Canonical technical guides — the single source of truth for each subsystem's design, data model, and behavior rules.

## Index

### Overview

| File | Purpose |
|------|---------|
| `overview.md` | Cross-cutting architecture summary, system layers, key invariants, data flow |

### Existing

| File | Subsystem | Notes |
|------|-----------|-------|
| `ai-import-export-architecture.md` | Clipboard pipeline, format grammar, import preview/execute, export multi-file | |
| `book-export-architecture.md` | Export pipeline: formats, renderers, directive mapping, image handling | |
| `document-contents-architecture.md` | Contents heading navigation: parser contract, ordinal identity, reveal mechanics, narrow state subscription | Slice 1 implemented (2026-07-21) |
| `editor-serialization-debounce-architecture.md` | Debounced editor serialization, flush-before-save/switch, per-pane isolation | |
| `focus-mode-architecture.md` | Highlights API rendering, overlay fallback, scope dimming | |
| `image-handling-architecture.md` | Inline base64 image workflow: dual-representation strategy, image cache, load-edit-save lifecycle | |
| `ipc-architecture.md` | IPC channel taxonomy, extension workflow, envelope pattern, cache invalidation | |
| `keyboard-shortcuts-architecture.md` | Workspace and editor shortcut registration, form-field guards, find-bar scope vs Quill host | |
| `layout-ownership.md` | Project editor layout ownership map: sidebar width, focus overrides, split ratio, editor fill contract | |
| `map-document-architecture.md` | Map document renderer path: meta-only marker edits, pan/zoom view state, pane-targeted navigation | |
| `relationships-document-architecture.md` | Relationships chart renderer: graph nodes/edges, toolbar tools, add-character Auto tag, tag navigation | |
| `project-index-architecture.md` | `.trama.index.json` model, reconciliation, scanner coordination | |
| `project-history-git-architecture.md` | Local Git snapshot/history backend: repo discovery, scoped staging, revision listing, preview hydration, restore writes | |
| `rich-editor-hotspots.md` | Fast map of fragile editor seams: debounce, external sync, pane persistence, layout-vs-document state, focus scroll | Open this first when you need the shortest debug path rather than the full editor architecture |
| `rich-markdown-editor-core-architecture.md` | Quill integration, Delta vs text, bounds, effect deps, data attrs | |
| `sidebar-architecture.md` | Section model, path scoping, tree building, dialogs, drag-and-drop | |
| `sidebar-path-scoping-model.md` | Section-relative vs project-relative path conversion | |
| `spellcheck-architecture.md` | Electron session API, renderer state, Quill sync, optimistic toggle | |
| `split-pane-coordination.md` | Per-pane state model, pane-targeted actions, layout persistence | |
| `theme-architecture.md` | Theme preference resolution, root `data-theme` application, CSS token model | |
| `tree-building-and-implicit-folders.md` | Implicit folder derivation, path normalization, ordering rules | |
| `wiki-tag-links-architecture.md` | Tag index service, matching model, overlay rendering, IPC contract | |
| `window-close-architecture.md` | Window close flow: `close` handler, dirty-state IPC cache, `__tramaSaveAll` bridge, promise-chain cancel pattern | |
| `zulu-import-architecture.md` | ZuluPad file import pipeline: parser, encoding detection, tag generation, line ending normalization, IPC contract, UI flow | |

## Historical context

This index was last rebuilt on 2026-04-23. At that time, lessons-learned were clustered around split-pane state (8 lessons), rich-editor/Quill (6 lessons), and book-export (4 lessons). These concentrations drove the initial documentation effort and remain useful indicators of subsystem complexity.

`overview.md` was added 2026-04-19 to provide a cross-cutting summary for contributors who need to understand the system as a whole before diving into subsystem docs.

## Fast routing by task

| Task | Open these files |
|------|-----------------|
| Add/change IPC channel | `src/shared/ipc.ts` → `electron/ipc.ts` → `electron/preload.cts` → `src/types/trama-api.d.ts` |
| Add/change IPC handler | `electron/ipc/handlers/` + `electron/ipc-handlers.ts` → `mds/ipc-architecture.md` |
| Change sidebar UX | `src/features/project-editor/components/sidebar/sidebar-types.ts` → target component in `sidebar/` |
| Refactor sidebar action propagation | `mds/plan/sidebar-editor-actions-context-plan.md` → `src/features/project-editor/project-editor-actions-context.tsx` → `src/features/project-editor/components/sidebar/sidebar-scope-path-breadcrumb.tsx` |
| Debug sidebar path scoping | `mds/architecture/sidebar-path-scoping-model.md` → `src/features/project-editor/components/sidebar/sidebar-path-scoping.ts` → `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx` → `src/features/project-editor/components/sidebar/sidebar-panel-logic.ts` |
| Change editor behavior | `src/features/project-editor/components/rich-markdown-editor*.ts*` + `mds/architecture/editor-serialization-debounce-architecture.md` + `mds/architecture/image-handling-architecture.md` |
| Debug workspace / editor keyboard shortcuts | `mds/architecture/keyboard-shortcuts-architecture.md` → `src/features/project-editor/use-project-editor-shortcuts-effect.ts` → `src/features/project-editor/pane/rich-markdown-editor/editor-session/editor-session-private/editor-session-find-hooks.ts` → `tests/workspace-keyboard-shortcuts.test.ts` |
| Implement/debug map documents | `mds/spec/map-document-markers-spec.md` → `mds/architecture/map-document-architecture.md` → `mds/plan/map-document-markers-implementation-plan.md` → `src/features/project-editor/pane/editor-panel.tsx` + `src/features/project-editor/pane/map-editor/` |
| Implement/debug document contents navigation (heading index) | `mds/spec/document-contents-navigation-spec.md` → `mds/architecture/document-contents-architecture.md` → `mds/plan/done/document-contents-navigation-implementation-plan.md` |
| Implement/debug relationships charts | `mds/architecture/relationships-document-architecture.md` → `src/features/project-editor/pane/relationships-editor/index.ts` (facade) → `tests/relationships-editor-helpers.test.ts` |
| Debug relationships chart auto tag / node navigation | `mds/architecture/relationships-document-architecture.md` (debug playbook) → `relationships-node-dialog.tsx` → `relationships-editor-helpers.ts` (`resolveAutoNodeTag`) → `mds/architecture/wiki-tag-links-architecture.md` → `mds/lessons-learned/relationships-auto-tag-uses-label-not-slug.md` |
| Change save button / save affordance | `mds/flows/save-document-flow.md` → `src/features/project-editor/pane/editor-panel.tsx` → `src/features/project-editor/pane/rich-markdown-editor/toolbar-private/rich-markdown-editor-toolbar-*.ts` |
| Debug revert/discard before debounce fires | `mds/flows/rich-editor-revert-changes-flow.md` → `mds/architecture/editor-serialization-debounce-architecture.md` → `src/features/project-editor/workspace-actions.ts` → `src/features/project-editor/pane/pane-workspace.ts` → `src/features/project-editor/pane/editor-panel.tsx` → `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-external-sync.ts` |
| Plan pane exit / pane persistence refactor | `mds/architecture/split-pane-coordination.md` → `mds/architecture/editor-serialization-debounce-architecture.md` → `mds/flows/rich-editor-revert-changes-flow.md` → `mds/plan/pane-exit-deepening-tech-design.md` → `mds/plan/pane-exit-deepening-implementation-plan.md` → `src/features/project-editor/pane/pane-workspace.ts` → `src/features/project-editor/workspace-actions.ts` |
| Debug editor debounce / flush-before-switch | `mds/architecture/editor-serialization-debounce-architecture.md` → `src/features/project-editor/components/rich-markdown-editor-core.ts` → `tests/project-editor-debounce-regression.test.ts` |
| Investigate `useProjectEditor()` reruns on typing | `mds/plan/done/use-project-editor-keystroke-churn-plan.md` → `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-serialization.ts` → `src/features/project-editor/pane/pane-workspace.ts` → `src/features/project-editor/use-project-editor.ts` |
| Plan rich editor cleanup/refactor | `mds/plan/done/rich-editor-refactor-plan.md` → `mds/architecture/rich-markdown-editor-core-architecture.md` → `mds/architecture/image-handling-architecture.md` → `mds/architecture/split-pane-coordination.md` |
| Plan rich editor session deepening | `mds/plan/done/rich-editor-session-deepening-plan.md` → `mds/architecture/rich-editor-hotspots.md` → `mds/architecture/editor-serialization-debounce-architecture.md` → `src/features/project-editor/pane/rich-markdown-editor/` |
| Follow editor typing behavior step-by-step | `mds/flows/rich-editor-typing-flow.md` → `src/features/project-editor/components/rich-markdown-editor-core.ts` → `src/features/project-editor/components/rich-markdown-editor-quill.ts` |
| Follow split-pane activation behavior step-by-step | `mds/flows/switch-pane-flow.md` → `src/features/project-editor/workspace-actions.ts` → `src/features/project-editor/project-editor-private/state.ts` |
| Change pane document history behavior | `mds/flows/pane-history-navigation-flow.md` → `src/features/project-editor/pane/pane-workspace.ts` → `src/features/project-editor/workspace-actions.ts` → `src/features/project-editor/use-project-editor.ts` |
| Change filesystem/repo layer | `electron/services/document-repository.ts` → `electron/ipc/handlers/project-handlers/document-handlers.ts` |
| Add a test | `tests/` + `mds/dev-workflow.md` (checklist) |
| Understand split pane coordination | `mds/architecture/split-pane-coordination.md` (canonical: per-pane state contracts, two-layer model, pane-targeted action rules) |
| Debug split-pane issues | `mds/architecture/split-pane-coordination.md` → `src/features/project-editor/pane/workspace-editor-panels.tsx` → `src/features/project-editor/workspace-actions.ts` → `tests/project-editor-conflict-flow.test.ts` |
| Debug layout/flex/grid ownership | `mds/architecture/layout-ownership.md` → `src/features/project-editor/layout/use-sidebar-layout.ts` → `src/features/project-editor/project-editor-view.tsx` → `src/styles/03-app-shell-layout.css` / `04-focus-mode-layout-overrides.css` / `07-editor-fill-contract.css` / `10-responsive.css` |
| Change theme behavior or colors | `mds/architecture/theme-architecture.md` → `src/theme/use-theme-preference.ts` → `src/styles/01-theme-tokens.css` → `src/features/project-editor/components/sidebar/sidebar-settings.tsx` → `tests/theme-preference.test.ts` |
| Change focus mode visuals | `src/features/project-editor/project-editor-view.tsx` (grid style) → `src/styles/04-focus-mode-layout-overrides.css` → `src/features/project-editor/workspace-actions.ts` (toggle logic) |
| Implement Wiki Tag Links (WS1) | `mds/spec/wiki-tag-links-spec.md` → `mds/architecture/wiki-tag-links-architecture.md` → `mds/plan/done/wiki-tag-links-implementation-plan.md` → `mds/plan/phase-4-detailed-plan.md` |
| Debug Wiki Tag Links (stale index, underline offsets, Ctrl/Cmd click) | `mds/architecture/wiki-tag-links-architecture.md` → `mds/plan/done/wiki-tag-links-system-guide.md` → `mds/lessons-learned/README.md` (tag/quill lessons) → `tests/tag-index-ipc-regression.test.ts` + `tests/rich-markdown-editor-tag-overlay.test.ts` |
| Debug image / broken-image round-trip | `mds/architecture/image-handling-architecture.md` → `src/features/project-editor/document-content/document-content-session.ts` → `electron/services/disk-content-adapter.ts` → `tests/document-content-session.test.ts` |
| Debug AI import/export | `mds/architecture/ai-import-export-architecture.md` → `src/shared/ai-import-parser.ts` → `electron/services/ai-import-service.ts` / `electron/services/ai-export-service.ts` → `electron/ipc/handlers/ai-handlers.ts` |
| Debug clipboard/paste | `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-commands.ts` → `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-layout-clipboard.ts` → `mds/lessons-learned/quill-clipboard-matchers-must-return-delta-parameter.md` → `tests/paste-markdown.test.ts` |
| Debug book export / PDF blank pages or layout | `mds/architecture/book-export-architecture.md` (Export PDF + playbook) → `mds/lessons-learned/book-export-pdf-print-surface.md` → `electron/services/book-export-pdf-renderer.ts` → `book-export-pdf-print.css` → `npm run test -- tests/book-export` |
| Implement Help menu / Getting Started window | `mds/adr/0005-help-window-bundled-html.md` → `mds/plan/help-menu-implementation-plan.md` → `mds/architecture/help-window-architecture.md` → `electron/main-process/help-window.ts` → `electron/main-process/application-menu.ts` → `help/en/` |
| Implement project history with Git | `mds/spec/project-history-git-spec.md` → `mds/architecture/project-history-git-architecture.md` → `mds/plan/project-history-git-implementation-plan.md` → `mds/adr/0001-restore-revision-images-for-fidelity.md` → `mds/lessons-learned/revision-preview-should-use-explicit-read-only-mode.md` |
| Implement folder rename (WS2 slice) | `mds/plan/done/folder-rename-implementation-plan.md` → `src/features/project-editor/components/sidebar/sidebar-tree.tsx` → `src/features/project-editor/components/sidebar/sidebar-panel-body.tsx` → `electron/services/document-repository.ts` |
| Implement folder drag-drop or corkboardOrder integration (WS2 slice) | `mds/plan/sidebar-drag-drop-reorder-folder-move-plan.md` |
| Change startup project-open behavior | `mds/flows/startup-project-open-flow.md` → `src/features/project-editor/use-project-editor.ts` → `src/features/project-editor/use-last-project-state.ts` → `electron/ipc/handlers/project-handlers/project-folder-dialog-handler.ts` |
| Understand feature status | `mds/live/current-status.md` → `mds/plan/phase-4-detailed-plan.md` |
| Understand project structure | `mds/live/file-map.md` |
| Debug a runtime issue | `mds/live/troubleshooting.md` → `mds/lessons-learned/README.md` |
