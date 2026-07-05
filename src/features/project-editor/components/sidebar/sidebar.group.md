---
id: sidebar
label: Sidebar UI
color: "#e11d48"
icon: sidebar
descriptionShort: Section trees, filters & file actions
---

Multi-section sidebar shell: explorer tree, path scoping, drag-drop reorder, settings, and context menus. Deep modules: `sidebar-panel/` (shell orchestrator), `sidebar-drop-logic/`, and `sidebar-explorer-body/`.

Sidebar project/workspace state is carried by `sidebar-state-context.tsx` (`useSidebarState`) and scoped per section by `use-scoped-sidebar-state.ts` (`useScopedSidebarState`) — leaf components read state from context instead of receiving it as threaded props. Actions are similarly carried by the editor-actions context (`use-scoped-sidebar-actions.ts`).
