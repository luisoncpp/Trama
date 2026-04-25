# Architecture Docs

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
| `focus-mode-architecture.md` | Highlights API rendering, overlay fallback, scope dimming | |
| `ipc-architecture.md` | IPC channel taxonomy, extension workflow, envelope pattern, cache invalidation | |
| `project-index-architecture.md` | `.trama.index.json` model, reconciliation, scanner coordination | |
| `rich-markdown-editor-core-architecture.md` | Quill integration, Delta vs text, bounds, effect deps, data attrs | |
| `sidebar-architecture.md` | Section model, path scoping, tree building, dialogs, drag-and-drop | |
| `sidebar-path-scoping-model.md` | Section-relative vs project-relative path conversion | |
| `spellcheck-architecture.md` | Electron session API, renderer state, Quill sync, optimistic toggle | |
| `split-pane-coordination.md` | Per-pane state model, pane-targeted actions, layout persistence | |
| `tree-building-and-implicit-folders.md` | Implicit folder derivation, path normalization, ordering rules | |
| `wiki-tag-links-architecture.md` | Tag index service, matching model, overlay rendering, IPC contract | |
| `window-close-architecture.md` | Window close flow: `close` handler, dirty-state IPC cache, `__tramaSaveAll` bridge, promise-chain cancel pattern | |
| `zulu-import-architecture.md` | ZuluPad file import pipeline: parser, encoding detection, tag generation, line ending normalization, IPC contract, UI flow | |

## Historical context

This index was last rebuilt on 2026-04-23. At that time, lessons-learned were clustered around split-pane state (8 lessons), rich-editor/Quill (6 lessons), and book-export (4 lessons). These concentrations drove the initial documentation effort and remain useful indicators of subsystem complexity.

`overview.md` was added 2026-04-19 to provide a cross-cutting summary for contributors who need to understand the system as a whole before diving into subsystem docs.