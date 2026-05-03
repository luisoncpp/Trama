import { useMemo } from 'preact/hooks'
import type { WorkspaceLayoutState, PaneDocumentState } from './project-editor-types'
import { PaneWorkspace } from './pane'

const stubSerializationRef = {
  flush: () => null,
  tagOverlayRecalcRef: { current: false },
  tagOverlayMatchesRef: { current: [] as Array<{ tag: string; start: number; end: number; filePath: string }> },
}

export function usePaneWorkspace(
  layoutState: WorkspaceLayoutState,
  primaryPane: PaneDocumentState,
  secondaryPane: PaneDocumentState,
): PaneWorkspace {
  return useMemo(
    () => new PaneWorkspace(
      layoutState,
      primaryPane,
      secondaryPane,
      { primary: { current: stubSerializationRef }, secondary: { current: stubSerializationRef } },
      () => Promise.resolve(),
    ),
    [layoutState, primaryPane, secondaryPane],
  )
}
