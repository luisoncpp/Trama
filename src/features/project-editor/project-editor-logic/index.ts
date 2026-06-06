/**
 * Project editor logic — deep module for workspace layout, pane projection, and conflict helpers.
 *
 * Do not import from private/ directly. All consumers must import from this index.
 * The private/ folder contains implementation helpers; the public interface lives here.
 */
export {
  WORKSPACE_LAYOUT_STORAGE_KEY,
  createDefaultWorkspaceLayoutState,
  normalizeWorkspaceLayoutState,
  restoreWorkspaceLayoutState,
  reconcileWorkspaceLayout,
} from './private/workspace-layout'
export {
  resolvePreferredFile,
  canSelectFile,
  deriveActivePaneDocument,
} from './private/active-pane'
export { buildConflictCopyPath } from './private/conflict-copy'
export { shouldRefreshTreeOnExternalEvent } from './private/external-events'
