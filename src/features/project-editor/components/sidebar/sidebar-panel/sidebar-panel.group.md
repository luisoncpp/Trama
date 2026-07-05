---
id: sidebar-panel
label: Sidebar panel shell
color: "#e11d48"
icon: sidebar
descriptionShort: Rail + section body orchestrator
---

Deep module for the sidebar shell: section rail, filter state, settings/transfer panels, and explorer content wiring. Public facade is `index.ts` (`SidebarPanel` only). Implementation lives under `private/`.

Project/workspace **state** is not threaded through these components as props — leaves read it from the `SidebarStateProvider` context via `useSidebarState()` (raw) or `useScopedSidebarState()` (section-relative). `SidebarPanel` only receives `effectiveCollapsed`, dialog openers, theme, and spellcheck props.
