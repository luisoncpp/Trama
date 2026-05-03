import { useMemo } from 'preact/hooks'
import type { WorkspaceLayoutState, PaneDocumentState } from './project-editor-types'
import { PaneWorkspace } from './pane-workspace'

export function usePaneWorkspace(
  layoutState: WorkspaceLayoutState,
  primaryPane: PaneDocumentState,
  secondaryPane: PaneDocumentState,
): PaneWorkspace {
  return useMemo(
    () => new PaneWorkspace(layoutState, primaryPane, secondaryPane),
    [layoutState, primaryPane, secondaryPane],
  )
}
