/** @Architecture(descriptionShort="Public facade for the sidebar panel shell deep module") */
/**
 * Sidebar panel — deep module for the sidebar shell (rail + section body orchestration).
 *
 * Do not import from private/ directly. All consumers must import from this index.
 * Tests may white-box private/ for unit coverage (see relationships-editor precedent).
 */
export { SidebarPanel } from './private/sidebar-panel.tsx'
export { formatProjectRootBreadcrumbLabel } from './private/sidebar-panel-logic'
