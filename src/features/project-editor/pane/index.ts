// PaneWorkspace is the ONLY way to read or mutate the estate of the panels.
// Do not use primaryPane/secondaryPane/setPrimaryPane/setSecondaryPane directly.
export { PaneWorkspace, type WorkspacePane, type PaneDocumentInfo, type ActivePaneDocumentInfo, type PaneBindings } from './pane-workspace'
export { usePaneWorkspace } from './use-pane-workspace'
export { WorkspaceLayoutPanel } from './workspace-editor-panels'
