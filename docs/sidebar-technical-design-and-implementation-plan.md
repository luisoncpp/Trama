# Sidebar Technical Design and Implementation Plan

Date: 2026-04-04
Status: Proposed
Inputs: REQUIREMENTS.md, DESIGN_SPEC.md, docs/phase-3-sidebar-requirements.md

## 1. Purpose

This document defines a production-grade technical design for Trama's left sidebar and an actionable implementation plan.

Target outcome:
- Replace the current flat file list with a two-level navigation system (global rail + hierarchical tree panel).
- Keep the file-first architecture intact.
- Preserve Phase 2 behavior (open, read, save, autosave, conflict safety) while introducing richer navigation and creation workflows.

## 2. Scope and Non-Goals

In scope:
- Global rail (workspace sections) with persistent active section.
- Tree panel with folder/file hierarchy, expand/collapse, selection, search/filter.
- Bottom quick actions: create article (markdown file), create category (folder).
- Sidebar UI state persistence.
- IPC extensions for create file/folder.
- Test coverage (unit, integration, IPC contract).

Out of scope in this implementation:
- Corkboard drag-and-drop ordering UX.
- Wiki backlinks panel and deep graph interactions.
- Rename/move/delete operations from sidebar (can be follow-up).

## 3. Current Baseline

Current implementation in renderer:
- `FileListPanel` renders a flat list of markdown paths.
- Project menu includes open folder and status.
- Selection opens one document in editor.

Current architecture constraints:
- Typed IPC contracts and Zod validation are already in place.
- Main process handles scanning, document I/O, index reconciliation, and watcher events.
- External change handling and conflict resolution are implemented and must not regress.

## 4. Architecture Overview

The sidebar will be built as two coordinated UI layers:

1. Global Rail (Level 1)
- A narrow vertical icon rail for top-level workspace areas.
- Initial sections:
  - Explorer Manuscript (book content: Act/Chapter/Scene)
  - Outline
  - Lore
  - Project Settings

Section-to-subfolder mapping rule (new):
- Each content section must scope its tree to a different project subfolder.
- Initial mapping for implementation:
  - `explorer` -> `book/`
  - `outline` -> `outline/`
  - `lore` -> `lore/`

2. Tree Panel (Level 2)
- A contextual panel bound to the Explorer section.
- Includes header, filter input, virtualized (or incrementally rendered) tree, and quick actions footer.

Data flow:
- Main process provides project snapshot and external events.
- Renderer builds a normalized tree model from project file paths.
- UI state (expanded nodes, active section, width, filter) is persisted locally.
- File creation actions call new IPC endpoints and refresh local tree state optimistically, then reconcile with authoritative data.

## 5. Data Models

## 5.1 Domain Tree Model (Renderer)

```ts
export type SidebarNodeType = 'folder' | 'file'

export interface SidebarTreeNode {
  id: string              // stable path-based id
  name: string            // display name
  path: string            // project-relative path
  type: SidebarNodeType
  depth: number
  parentId: string | null
  childIds: string[]      // ordered
  isMarkdown: boolean
}

export interface SidebarTreeState {
  nodesById: Record<string, SidebarTreeNode>
  rootIds: string[]
}
```

## 5.2 Sidebar UI State (Renderer)

```ts
export type SidebarSection = 'explorer' | 'outline' | 'lore' | 'settings'

export interface SidebarUiState {
  activeSection: SidebarSection
  isPanelCollapsed: boolean
  panelWidth: number
  expandedFolderPaths: string[]
  selectedPath: string | null
  filterQuery: string
  lastExplorerScrollTop: number
}
```

```ts
export interface SidebarSectionRoots {
  explorer: 'book/'
  outline: 'outline/'
  lore: 'lore/'
}
```

## 5.3 Persistence Keys (LocalStorage)

```ts
const STORAGE_KEYS = {
  sidebarUi: 'trama.sidebar.ui.v1',
  sidebarExpanded: 'trama.sidebar.expanded.v1',
  sidebarSection: 'trama.sidebar.section.v1',
}
```

Versioned keys allow safe migrations.

## 6. Component Design

## 6.1 Components

- `sidebar-rail.tsx`
  - Renders section icons and active state.
  - Emits section change events.

- `sidebar-tree-header.tsx`
  - Section title, optional sort/control trigger, collapse toggle.

- `sidebar-filter.tsx`
  - Search input with clear button.
  - Debounced updates.

- `sidebar-tree.tsx`
  - Renders hierarchical nodes.
  - Handles expand/collapse, selection, keyboard nav.

- `sidebar-footer-actions.tsx`
  - New Article / New Category actions.

- `sidebar/sidebar-panel.tsx` (transitional orchestrator)
  - Composes the new sidebar building blocks.

## 6.2 Keyboard Interaction Model

Explorer tree key bindings:
- `ArrowUp/ArrowDown`: move active row.
- `ArrowRight`: expand folder or move into first child.
- `ArrowLeft`: collapse folder or move to parent.
- `Enter`: open selected file.
- `Space`: toggle folder expanded state.
- `Ctrl+F` (or Cmd+F): focus filter input.
- `Escape`: clear filter when filter is focused.

## 7. Tree Construction and Filtering Algorithm

## 7.1 Build Tree from Paths

Input:
- `markdownFiles: string[]` from project snapshot.

Process:
1. Split each path by `/`.
2. Create folder nodes for each segment prefix.
3. Create file node for terminal segment.
4. Sort children: folders first, then files, each alphabetical.
5. Store parent-child links in normalized maps.

Complexity:
- Build: O(n * p), where n = files and p = average segment depth.
- Sort: O(k log k) per folder child list.

## 7.2 Filter Behavior

Rules:
- Match against file name and relative path (case-insensitive).
- Search scope is restricted to files inside the active section root.
- When filter is active:
  - Keep matching files.
  - Include ancestor folders of each match.
  - Auto-expand matching branches.
- When filter clears:
  - Restore previously expanded folder set.

## 8. IPC Contract Extensions

New channels (typed + validated with Zod):

- `trama:document:create`
  - Request: `{ path: string, initialContent?: string }`
  - Response: `{ path: string, createdAt: string }`

- `trama:folder:create`
  - Request: `{ path: string }`
  - Response: `{ path: string, createdAt: string }`

Validation constraints:
- Path must be project-relative and normalized.
- Reject traversal (`..`) and absolute paths.
- Reject invalid Windows names and reserved characters.
- Return envelope error on collisions and invalid input.

Main process touch points:
- `src/shared/ipc.ts`
- `src/types/trama-api.d.ts`
- `electron/preload.cts`
- `electron/ipc/handlers/project-handlers/*`
- `electron/services/document-repository.ts`

## 9. Error Handling and Edge Cases

- No project opened:
  - Sidebar shows empty state with CTA to open folder.

- Empty project (no markdown):
  - Show friendly empty state and allow create article/category.

- External unlink on selected file:
  - Clear selection if file no longer exists.
  - Keep sidebar state and show non-blocking status message.

- External add while filtered:
  - Recompute filtered tree; include new node if it matches query.

- Large tree performance:
  - Start with incremental rendering and memoized row model.
  - Add virtualization if frame drops are observed.

## 10. Security and Safety Constraints

- Preserve `nodeIntegration: false` and context isolation model.
- All create operations run in main process only.
- Renderer never writes files directly.
- All IPC payloads validated at runtime.
- Path sanitization mandatory before file/folder creation.

## 11. Implementation Plan (PR-by-PR)

## PR-1: Sidebar State Foundation

Status: Completed (2026-04-04)

Goals:
- Introduce Sidebar UI state model and persistence.
- Add global rail and static section switching.

Changes:
- Add sidebar state types/actions in project editor state modules.
- Implement `sidebar-rail` and integrate into current panel shell.
- Keep `Explorer` content as the existing flat list temporarily (no tree replacement yet) to de-risk layout/state work.
- Add a clear adapter boundary (`ExplorerContent` slot/component) so PR-2 can swap implementation without touching rail logic.
- Persist active section, panel collapsed state, and width.

Tests:
- Unit tests for state transitions and persistence restore.

Exit criteria:
- Rail renders and section state survives restart.
- Existing flat-list behavior still works unchanged inside the Explorer section.

Delivered in implementation:
- Persistent sidebar UI state (`activeSection`, `panelCollapsed`, `panelWidth`) with localStorage versioned key.
- Global rail integrated into sidebar shell.
- Explorer-content adapter boundary kept, enabling non-breaking swap in PR-2.

Primary implementation files:
- `src/features/project-editor/use-sidebar-ui-state.ts`
- `src/features/project-editor/use-project-editor-state.ts`
- `src/features/project-editor/use-project-editor-sidebar-actions.ts`
- `src/features/project-editor/components/sidebar/sidebar-rail.tsx`
- `src/features/project-editor/components/sidebar/sidebar-panel.tsx`

Validation evidence:
- `npm run lint` passed.
- `npm run build` passed.
- `tests/use-project-editor.test.ts` updated and passing with sidebar persistence checks.

## PR-2: Hierarchical Tree Rendering

Status: Completed (2026-04-04)

Goals:
- Replace flat list with hierarchical tree view.
- Implement expand/collapse + selection behavior.

Changes:
- Replace only the Explorer content implementation (the rail/shell from PR-1 remains unchanged).
- Add tree builder utilities from `visibleFiles`.
- Implement `sidebar-tree` and node row components.
- Add active node styling and keyboard navigation basics.

Tests:
- Unit tests for tree building/sorting.
- Integration test: selecting node opens expected document.

Exit criteria:
- User navigates nested folders and opens files reliably.

Delivered in implementation:
- Explorer content replaced with a hierarchical tree implementation.
- Folder/file tree building and folder-first alphabetical ordering.
- Expand/collapse behavior and keyboard navigation basics.
- Visual polish iteration: readable UI typography for tree labels, chevron expanders, and folder/file icons.

Primary implementation files:
- `src/features/project-editor/components/sidebar/sidebar-tree-logic.ts`
- `src/features/project-editor/components/sidebar/sidebar-tree.tsx`
- `src/features/project-editor/components/sidebar/sidebar-tree-icons.tsx`
- `src/features/project-editor/components/sidebar/sidebar-explorer-content.tsx`
- `src/index.css`

Validation evidence:
- `npm run lint` passed.
- `npm run build` passed.
- `tests/sidebar-tree.test.ts` added and passing.

## PR-3: Filter/Search UX

Status: Completed (2026-04-04)

Goals:
- Implement debounced filter with branch auto-expansion.

Changes:
- Add `sidebar-filter` component.
- Implement filter query state + match/highlight logic.
- Restore previous expanded state after filter clear.

Tests:
- Unit tests for filter and expansion restore logic.
- Integration test for query -> result -> open flow.

Exit criteria:
- File discovery via partial query is reliable and fast.

Delivered in implementation:
- Added debounced `sidebar-filter` input component with clear action.
- Implemented filter logic with scoped matches (name/path), ancestor inclusion, and auto-expanded branches.
- Implemented expanded-state restoration when filter is cleared.
- Wired filter state per sidebar section (`explorer`, `outline`, `lore`) so each section keeps its own query.

Primary implementation files:
- `src/features/project-editor/components/sidebar/sidebar-filter.tsx`
- `src/features/project-editor/components/sidebar/sidebar-filter-logic.ts`
- `src/features/project-editor/components/sidebar/sidebar-tree.tsx`
- `src/features/project-editor/components/sidebar/use-sidebar-tree-expanded-folders.ts`
- `src/features/project-editor/components/sidebar/sidebar-tree-logic.ts`
- `src/features/project-editor/components/sidebar/sidebar-panel.tsx`
- `src/features/project-editor/components/sidebar/sidebar-explorer-content.tsx`
- `src/index.css`

Validation evidence:
- `npm run lint` passed.
- `npm run build` passed.
- `tests/sidebar-tree.test.ts` updated and passing.
- `tests/sidebar-filter.test.ts` added and passing.
- `tests/sidebar-panels.test.ts` updated and passing.

## PR-4: Create Actions and IPC Extensions

Goals:
- Add New Article / New Category actions.
- Implement backend creation endpoints.

Changes:
- IPC contracts + preload API + handlers + repository methods.
- `sidebar-footer-actions` with creation dialogs or inline prompts.
- Optimistic UI update then reconcile with authoritative refresh.

Tests:
- IPC contract tests for valid/invalid payloads.
- Integration tests for create file/folder and selection behavior.

Exit criteria:
- New file/folder appears immediately and can be opened/edited.

## PR-5: Hardening, Accessibility, and Regression Safety

Goals:
- Final polish and non-regression guarantees.

Changes:
- Complete keyboard navigation map.
- Improve empty/loading/error states.
- Add responsive collapse behavior for narrow widths.

Tests:
- Integration test for watcher add/unlink sync with sidebar.
- Regression pass for Phase 2 conflict flows.

Exit criteria:
- Build/lint/tests/smoke pass and sidebar DoD is met.

## 12. Testing Strategy

Unit tests:
- Tree builder
- Node sorting
- Filter matching
- Expanded-state persistence/restore

Integration tests:
- Open from tree
- Create actions
- External watcher sync
- Keyboard navigation core interactions

IPC tests:
- Create document/folder schema validation
- Error envelopes for invalid names and collisions

Manual smoke checklist:
- Open project with nested folders
- Search and open by query
- Create article/category in selected folder
- Trigger external add/unlink and verify sidebar sync
- Verify autosave and conflict behavior unchanged

## 13. Definition of Done (Sidebar)

Sidebar is complete when:
- Global rail works with persistent active section.
- Explorer displays real hierarchical tree with expand/collapse/select.
- Search/filter is usable with meaningful empty states.
- New Article/New Category works through validated IPC.
- Sidebar UI state persists across app restarts.
- Phase 2 editor/conflict flows remain intact.
- Build, lint, test, and smoke checks pass.

## 14. Suggested File-Level Work Map

Renderer:
- `src/features/project-editor/components/sidebar/sidebar-panel.tsx`
- `src/features/project-editor/components/sidebar/sidebar-rail.tsx` (new)
- `src/features/project-editor/components/sidebar-tree-header.tsx` (new)
- `src/features/project-editor/components/sidebar-filter.tsx` (new)
- `src/features/project-editor/components/sidebar/sidebar-tree.tsx` (new)
- `src/features/project-editor/components/sidebar-footer-actions.tsx` (new)
- `src/features/project-editor/project-editor-types.ts`
- `src/features/project-editor/use-project-editor-state.ts`
- `src/features/project-editor/use-project-editor-ui-actions.ts`
- `src/features/project-editor/project-editor-view.tsx`

IPC/Main:
- `src/shared/ipc.ts`
- `src/types/trama-api.d.ts`
- `electron/preload.cts`
- `electron/ipc/handlers/project-handlers/document-handlers.ts`
- `electron/ipc/handlers/project-handlers/index.ts`
- `electron/services/document-repository.ts`

Tests:
- `tests/use-project-editor.test.ts`
- `tests/project-editor-logic.test.ts`
- `tests/project-editor-conflict-flow.test.ts`
- `tests/ipc-contract.test.ts`
- `tests/sidebar-tree.test.ts` (new)
- `tests/sidebar-filter.test.ts` (new)
