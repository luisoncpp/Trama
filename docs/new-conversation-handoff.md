# New Conversation Handoff

## Goal

Use this file to quickly bootstrap a fresh chat session and avoid rediscovering project context.

## 60-second summary

Trama is a file-first desktop writing tool. The codebase currently delivers a complete Phase 2 slice: open project folder, scan markdown files, edit/save documents with YAML frontmatter support, maintain index reconciliation, rich visual markdown editing, and handle external file conflicts with reload/keep/compare/save-as-copy actions.

Phase 3 (sidebar navigation) is in progress. PR-1 (sidebar state/persistence via `localStorage`) and PR-2 (hierarchical folder/file tree with expand/collapse, keyboard navigation, chevron icons, and folder/file SVG icons) are complete. Next: PR-3 filter/search, PR-4 create article/category via IPC, PR-5 hardening.

## Read first (in order)

1. `docs/current-status.md`
2. `docs/implementation-overview.md`
3. `docs/file-map.md`
4. `docs/ipc-architecture.md`
5. `docs/dev-workflow.md`
6. `docs/troubleshooting.md`
7. `docs/sidebar-technical-design-and-implementation-plan.md` ← Phase 3 ongoing work

## Where to make common changes

Renderer editor behavior:
- `src/features/project-editor/use-project-editor.ts`
- `src/features/project-editor/use-project-editor-autosave-effect.ts`
- `src/features/project-editor/use-project-editor-external-events-effect.ts`
- `src/features/project-editor/project-editor-view.tsx`

Sidebar UI (Phase 3):
- `src/features/project-editor/use-sidebar-ui-state.ts` — localStorage persistence
- `src/features/project-editor/use-project-editor-sidebar-actions.ts` — action composers
- `src/features/project-editor/components/sidebar-rail.tsx` — section icon rail
- `src/features/project-editor/components/sidebar-explorer-content.tsx` — Explorer section
- `src/features/project-editor/components/sidebar-tree.tsx` — hierarchical tree component
- `src/features/project-editor/components/sidebar-tree-logic.ts` — pure tree build/filter functions
- `src/features/project-editor/components/sidebar-tree-icons.tsx` — SVG chevron/node icons

IPC/backend behavior:
- `electron/ipc.ts`
- `electron/ipc/handlers/project-handlers/*`
- `electron/ipc-runtime.ts`
- `electron/services/*`

Shared contract:
- `src/shared/ipc.ts`
- `src/types/trama-api.d.ts`
- `electron/preload.cts`

## Known quirks

- **TS imports**: Always use explicit `.tsx` extension when importing Preact components, e.g. `import { Foo } from './foo.tsx'`. The language server does not resolve them without it. See `docs/lessons-learned/tsx-import-extension.md`.
- **ESLint limits**: `max-lines: 200` and `max-lines-per-function: 50` are enforced on all TS/TSX. Decompose components and hooks into named helpers proactively.
- **CSS edits**: Apply CSS changes in small, isolated hunks. The patch tool has historically injected rule blocks inside `:root {}` or `body {}`. Validate structure after each CSS edit. See `docs/lessons-learned/css-patch-corruption.md`.

## Quick sanity checks after any significant change

1. `npm run build`
2. `npm run lint`
3. `npm run test`
4. `npm run test:smoke`
5. `npm run dev`
6. In the app:
- confirm preload API status is available,
- open a folder,
- edit/save a markdown file,
- right-click a misspelled word and verify spellcheck suggestions,
- verify no regressions in conflict behavior.

## Current high-value next tasks

1. **PR-3** — Sidebar filter/search: debounced text input, auto-expand matched branches, restore expanded state on clear. Implement in `sidebar-tree-logic.ts` (pure) + `sidebar-filter.tsx` (UI). See `docs/sidebar-technical-design-and-implementation-plan.md`.
2. **PR-4** — Create article/category via IPC: new channels `trama:document:create` / `trama:folder:create`, Zod-validated, with optimistic UI update.
3. **PR-5** — Hardening: keyboard focus management (Ctrl+F → filter), empty/loading/error states, responsive sidebar collapse.
4. Continue expanding tests for watcher bursts and larger conflict scenarios.
